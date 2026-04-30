import { io } from 'socket.io-client'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

let socket = null
const joinedGroups = new Set()

export function getSocket() {
  return socket
}

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

    if (identity?.did) {
      socket.emit('register', {
        did: identity.did,
        alias: identity.alias,
        publicKey: identity?.keyBundle?.classical?.publicKey,
        kyberPublicKey: identity?.keyBundle?.kyber?.publicKey,
      })
    }

    onConnect?.()
  })

  socket.on('disconnect', reason => {
    console.log('[Socket] Disconnected:', reason)
  })

  socket.on('connect_error', err => {
    console.warn('[Socket] Connection error:', err.message)
  })

  return socket
}

export function disconnect() {
  joinedGroups.clear()
  socket?.disconnect()
  socket = null
}

export function sendEncryptedMessage(encryptedPayload) {
  if (!socket?.connected) throw new Error('Not connected to server')
  socket.emit('message:send', encryptedPayload)
}

export function sendTypingStart(to, from) {
  socket?.emit('typing:start', { to, from })
}

export function sendTypingStop(to, from) {
  socket?.emit('typing:stop', { to, from })
}

export function lookupPeerKey(did) {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) return reject(new Error('Not connected'))
    socket.emit('key:lookup', { did }, res => {
      if (res?.found) resolve(res)
      else reject(new Error(`Peer ${did} not found or offline`))
    })
  })
}

export function fetchHistory(peerDID, groupId) {
  return new Promise(resolve => {
    if (!socket?.connected) return resolve([])
    socket.emit('history:fetch', { with: peerDID, groupId }, res => resolve(res?.messages || []))
  })
}

export function getOnlineUsers() {
  return new Promise(resolve => {
    if (!socket?.connected) return resolve([])
    socket.emit('users:online', users => resolve(users || []))
  })
}

export function sendReadReceipt(msgId, from, to) {
  socket?.emit('message:read', { msgId, from, to })
}

export function isConnected() {
  return socket?.connected ?? false
}

/* NEW: direct file share to one recipient only */
export function sendFileShare(payload) {
  if (!socket?.connected) throw new Error('Not connected to server')
  socket.emit('file:share', payload)
}

/* NEW: listen for incoming shared files */
export function onFileReceived(handler) {
  if (!socket) return () => {}
  socket.on('file:received', handler)
  return () => socket.off('file:received', handler)
}