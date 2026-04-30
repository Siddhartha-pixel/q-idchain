/**
 * Q-IDChain — Real-time Socket Manager
 * Manages WebSocket connection to signaling server.
 * All messages sent are already encrypted by the crypto engine.
 */

import { io } from 'socket.io-client'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

let socket = null
const listeners = new Map()

export function getSocket() { return socket }

export function connect(identity, onConnect) {
  if (socket?.connected) return socket

  socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  })

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id)
    // Register identity with server (public keys only — never private keys)
    socket.emit('register', {
      did:            identity.did,
      alias:          identity.alias,
      publicKey:      identity.keyBundle.classical.publicKey,
      kyberPublicKey: identity.keyBundle.kyber.publicKey,
    })
    onConnect?.()
  })

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason)
  })

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message)
  })

  return socket
}

export function disconnect() {
  socket?.disconnect()
  socket = null
}

// ── Send encrypted message ────────────────────────────────────────────────────
export function sendEncryptedMessage(encryptedPayload) {
  if (!socket?.connected) throw new Error('Not connected to server')
  socket.emit('message:send', encryptedPayload)
}

// ── Send group message ────────────────────────────────────────────────────────
export function sendGroupMessage(payload) {
  if (!socket?.connected) throw new Error('Not connected to server')
  socket.emit('group:message', payload)
}

// ── Typing indicators ─────────────────────────────────────────────────────────
export function sendTypingStart(to, from) { socket?.emit('typing:start', { to, from }) }
export function sendTypingStop(to, from)  { socket?.emit('typing:stop',  { to, from }) }

// ── Lookup a peer's public key ────────────────────────────────────────────────
export function lookupPeerKey(did) {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) return reject(new Error('Not connected'))
    socket.emit('key:lookup', { did }, (res) => {
      if (res.found) resolve(res)
      else reject(new Error(`Peer ${did} not found or offline`))
    })
  })
}

// ── Fetch history ─────────────────────────────────────────────────────────────
export function fetchHistory(peerDID, groupId) {
  return new Promise((resolve) => {
    socket?.emit('history:fetch', { with: peerDID, groupId }, (res) => resolve(res.messages || []))
  })
}

// ── Get online users ──────────────────────────────────────────────────────────
export function getOnlineUsers() {
  return new Promise((resolve) => {
    socket?.emit('users:online', (users) => resolve(users))
  })
}

// ── Join group room ───────────────────────────────────────────────────────────
export function joinGroupRoom(groupId, did) {
  socket?.emit('group:join', { groupId, did })
}

// ── Read receipt ──────────────────────────────────────────────────────────────
export function sendReadReceipt(msgId, from, to) {
  socket?.emit('message:read', { msgId, from, to })
}

export function isConnected() { return socket?.connected ?? false }
