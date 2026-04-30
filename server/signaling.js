/**
 * Q-IDChain — WebSocket Signaling & Relay Server
 *
 * Responsibilities:
 *   1. WebSocket signaling for P2P key exchange
 *   2. Message relay (end-to-end encrypted — server NEVER sees plaintext)
 *   3. Presence / online status
 *   4. Group message fanout (encrypted payloads only)
 *
 * The server handles ONLY encrypted blobs. All encryption/decryption
 * happens on the client. The server cannot read any message content.
 *
 * Run: node server/signaling.js
 */

require('dotenv').config()
const express  = require('express')
const http     = require('http')
const { Server } = require('socket.io')
const cors     = require('cors')

const app    = express()
const server = http.createServer(app)
const PORT   = process.env.PORT || 3001
const CLIENT = process.env.CLIENT_URL || 'http://localhost:5173'

const io = new Server(server, {
  cors: { origin: CLIENT, methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
})

app.use(cors({ origin: CLIENT }))
app.use(express.json())

// ── In-memory state (use Redis in production) ─────────────────────────────────
const users      = new Map()  // did → { socketId, alias, publicKey, online, lastSeen }
const rooms      = new Map()  // groupId → Set<did>
const msgHistory = new Map()  // conversationKey → [encryptedMsg, ...] (last 200)

function convoKey(did1, did2) {
  return [did1, did2].sort().join('::')
}

function storeMessage(key, msg) {
  if (!msgHistory.has(key)) msgHistory.set(key, [])
  const hist = msgHistory.get(key)
  hist.push(msg)
  if (hist.length > 200) hist.shift() // keep last 200
}

// ── Socket.IO ─────────────────────────────────────────────────────────────────
io.on('connection', socket => {
  let myDID = null

  // ── Register identity ────────────────────────────────────────────────────────
  socket.on('register', ({ did, alias, publicKey, kyberPublicKey }) => {
    myDID = did
    users.set(did, { socketId: socket.id, alias, publicKey, kyberPublicKey, online: true, lastSeen: Date.now() })
    socket.join(did) // personal room
    io.emit('user:online', { did, alias, online: true })
    console.log(`[+] ${alias} (${did.slice(0, 20)}...) connected`)

    // Send pending offline messages
    // (in production: fetch from DB; here we rely on conversation history)
  })

  // ── Send direct message (encrypted blob) ─────────────────────────────────────
  socket.on('message:send', (payload) => {
    const { to, from, encrypted, nonce, ephemeralPK, kyberCapsule, cid, timestamp, id, messageType } = payload
    if (!to || !from) return

    const msg = { id, to, from, encrypted, nonce, ephemeralPK, kyberCapsule, cid, timestamp, messageType: messageType || 'text' }

    // Store encrypted message for offline delivery
    storeMessage(convoKey(from, to), msg)

    // Deliver to recipient (if online)
    io.to(to).emit('message:receive', msg)

    // Echo delivery receipt to sender
    socket.emit('message:delivered', { id, to, timestamp: Date.now() })
  })

  // ── Message read receipt ──────────────────────────────────────────────────────
  socket.on('message:read', ({ msgId, from, to }) => {
    io.to(from).emit('message:read_receipt', { msgId, by: to, at: Date.now() })
  })

  // ── Typing indicator ──────────────────────────────────────────────────────────
  socket.on('typing:start', ({ to, from }) => { io.to(to).emit('typing:start', { from }) })
  socket.on('typing:stop',  ({ to, from }) => { io.to(to).emit('typing:stop',  { from }) })

  // ── Group events ──────────────────────────────────────────────────────────────
  socket.on('group:join', ({ groupId, did }) => {
    socket.join(`group:${groupId}`)
    if (!rooms.has(groupId)) rooms.set(groupId, new Set())
    rooms.get(groupId).add(did)
  })

  socket.on('group:message', (payload) => {
    const { groupId } = payload
    storeMessage(`group:${groupId}`, payload)
    socket.to(`group:${groupId}`).emit('group:message', payload)
    socket.emit('message:delivered', { id: payload.id, groupId, timestamp: Date.now() })
  })

  socket.on('group:leave', ({ groupId, did }) => {
    socket.leave(`group:${groupId}`)
    rooms.get(groupId)?.delete(did)
  })

  // ── Key exchange (public key lookup) ──────────────────────────────────────────
  socket.on('key:lookup', ({ did }, cb) => {
    const user = users.get(did)
    if (user) cb({ found: true, publicKey: user.publicKey, kyberPublicKey: user.kyberPublicKey, alias: user.alias })
    else      cb({ found: false })
  })

  // ── Fetch message history ─────────────────────────────────────────────────────
  socket.on('history:fetch', ({ with: peerDID, groupId }, cb) => {
    const key  = groupId ? `group:${groupId}` : convoKey(myDID, peerDID)
    const msgs = msgHistory.get(key) || []
    cb({ messages: msgs.slice(-50) }) // last 50
  })

  // ── Online roster ─────────────────────────────────────────────────────────────
  socket.on('users:online', (cb) => {
    const online = []
    users.forEach((u, did) => { if (u.online) online.push({ did, alias: u.alias, publicKey: u.publicKey }) })
    cb(online)
  })

  // ── Disconnect ────────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    if (myDID) {
      const user = users.get(myDID)
      if (user) {
        user.online   = false
        user.lastSeen = Date.now()
        users.set(myDID, user)
        io.emit('user:online', { did: myDID, online: false, lastSeen: user.lastSeen })
      }
      console.log(`[-] ${myDID.slice(0, 20)}... disconnected`)
    }
  })
})

// ── REST endpoints ────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true, users: users.size, service: 'q-idchain-signaling' }))
app.get('/users',  (_, res) => {
  const list = []
  users.forEach((u, did) => list.push({ did, alias: u.alias, online: u.online, lastSeen: u.lastSeen }))
  res.json(list)
})

server.listen(PORT, () => {
  console.log(`\n🔗 Q-IDChain Signaling Server`)
  console.log(`   Port    : ${PORT}`)
  console.log(`   Client  : ${CLIENT}`)
  console.log(`   Mode    : End-to-end encrypted relay\n`)
})
