/**
 * Q-IDChain — WebSocket Signaling & Relay Server
 */

require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 3001
const CLIENT = process.env.CLIENT_URL || 'http://localhost:5173'

const io = new Server(server, {
  cors: { origin: CLIENT, methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
})

app.use(cors({ origin: CLIENT }))
app.use(express.json())

const users = new Map()
const rooms = new Map()
const msgHistory = new Map()

function convoKey(did1, did2) {
  return [did1, did2].sort().join('::')
}

function storeMessage(key, msg) {
  if (!msgHistory.has(key)) msgHistory.set(key, [])
  const hist = msgHistory.get(key)
  hist.push(msg)
  if (hist.length > 200) hist.shift()
}

io.on('connection', socket => {
  let myDID = null

  socket.on('register', ({ did, alias, publicKey, kyberPublicKey }) => {
    if (!did) return

    myDID = did
    users.set(did, {
      socketId: socket.id,
      alias,
      publicKey,
      kyberPublicKey,
      online: true,
      lastSeen: Date.now(),
    })

    socket.join(did)
    io.emit('user:online', { did, alias, online: true })
    console.log(`[+] ${alias || did} (${did.slice(0, 20)}...) connected`)
  })

  socket.on('message:send', payload => {
    const { to, from, encrypted, nonce, ephemeralPK, kyberCapsule, cid, timestamp, id, messageType } = payload || {}
    if (!to || !from) return

    const msg = {
      id,
      to,
      from,
      encrypted,
      nonce,
      ephemeralPK,
      kyberCapsule,
      cid,
      timestamp,
      messageType: messageType || 'text',
    }

    storeMessage(convoKey(from, to), msg)
    io.to(to).emit('message:receive', msg)
    socket.emit('message:delivered', { id, to, timestamp: Date.now() })
  })

  // NEW: direct file share to one recipient
  socket.on('file:share', payload => {
    const {
      id,
      toDid,
      fromDid,
      fromAlias,
      name,
      size,
      type,
      cid,
      algorithm,
      encryptedFEK,
      iv,
      uploadedAt,
    } = payload || {}

    if (!toDid || !fromDid || !cid) {
      socket.emit('file:error', { message: 'Invalid file payload' })
      return
    }

    const fileMsg = {
      id,
      toDid,
      fromDid,
      fromAlias,
      name,
      size,
      type,
      cid,
      algorithm,
      encryptedFEK,
      iv,
      uploadedAt: uploadedAt || Date.now(),
      status: 'received',
    }

    storeMessage(convoKey(fromDid, toDid), {
      id,
      to: toDid,
      from: fromDid,
      cid,
      timestamp: uploadedAt || Date.now(),
      messageType: 'file',
      file: fileMsg,
    })

    io.to(toDid).emit('file:received', fileMsg)
    socket.emit('file:delivered', { id, toDid, timestamp: Date.now() })
  })

  socket.on('message:read', ({ msgId, from, to }) => {
    if (!from || !to) return
    io.to(from).emit('message:read_receipt', { msgId, by: to, at: Date.now() })
  })

  socket.on('typing:start', ({ to, from }) => {
    if (to && from) io.to(to).emit('typing:start', { from })
  })

  socket.on('typing:stop', ({ to, from }) => {
    if (to && from) io.to(to).emit('typing:stop', { from })
  })

  socket.on('group:join', ({ groupId, did }) => {
    if (!groupId || !did) return
    socket.join(`group:${groupId}`)
    if (!rooms.has(groupId)) rooms.set(groupId, new Set())
    rooms.get(groupId).add(did)
  })

  socket.on('group:message', payload => {
    const { groupId, id, from } = payload || {}
    if (!groupId || !from) return

    storeMessage(`group:${groupId}`, payload)
    socket.to(`group:${groupId}`).emit('group:message', payload)
    socket.emit('message:delivered', { id, groupId, timestamp: Date.now() })
  })

  socket.on('group:leave', ({ groupId, did }) => {
    if (!groupId || !did) return
    socket.leave(`group:${groupId}`)
    rooms.get(groupId)?.delete(did)
  })

  socket.on('key:lookup', ({ did }, cb) => {
    const user = users.get(did)
    if (user) cb?.({ found: true, publicKey: user.publicKey, kyberPublicKey: user.kyberPublicKey, alias: user.alias })
    else cb?.({ found: false })
  })

  socket.on('history:fetch', ({ with: peerDID, groupId }, cb) => {
    const key = groupId ? `group:${groupId}` : convoKey(myDID, peerDID)
    const msgs = msgHistory.get(key) || []
    cb?.({ messages: msgs.slice(-50) })
  })

  socket.on('users:online', cb => {
    const online = []
    users.forEach((u, did) => {
      if (u.online) online.push({ did, alias: u.alias, publicKey: u.publicKey })
    })
    cb?.(online)
  })

  socket.on('disconnect', () => {
    if (myDID) {
      const user = users.get(myDID)
      if (user) {
        user.online = false
        user.lastSeen = Date.now()
        users.set(myDID, user)
        io.emit('user:online', { did: myDID, online: false, lastSeen: user.lastSeen })
      }
      console.log(`[-] ${myDID.slice(0, 20)}... disconnected`)
    }
  })
})

app.get('/health', (_, res) => res.json({ ok: true, users: users.size, service: 'q-idchain-signaling' }))
app.get('/users', (_, res) => {
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