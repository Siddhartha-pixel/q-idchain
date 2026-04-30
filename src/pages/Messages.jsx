import React, { useState, useRef, useEffect } from 'react'
import { useStore } from '../store/index.js'
import { hybridEncrypt, hybridDecrypt, truncateKey } from '../lib/crypto.js'
import { truncateDID } from '../lib/identity.js'
import {
  sendEncryptedMessage, sendTypingStart, sendTypingStop,
  getSocket, lookupPeerKey, fetchHistory, getOnlineUsers, sendReadReceipt
} from '../lib/socket.js'
import EncryptionInspector from '../components/EncryptionInspector.jsx'

export default function Messages() {
  const { identity, contacts, conversations, addDirectMsg, addContact, markConvoRead, setInspected, inspectedMsg } = useStore()
  const [selected, setSelected]   = useState(null)
  const [input, setInput]         = useState('')
  const [sending, setSending]     = useState(false)
  const [typing, setTyping]       = useState({})
  const [onlineMap, setOnlineMap] = useState({})
  const [showAdd, setShowAdd]     = useState(false)
  const [addDID, setAddDID]       = useState('')
  const [addAlias, setAddAlias]   = useState('')
  const [adding, setAdding]       = useState(false)
  const [addError, setAddError]   = useState('')
  const bottomRef  = useRef(null)
  const typingTimer = useRef(null)

  const msgs = selected ? (conversations[selected.did] || []) : []

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [msgs.length])

  // Socket listeners
  useEffect(() => {
    const sock = getSocket(); if (!sock) return

    sock.on('message:receive', async (payload) => {
      try {
        const plain = hybridDecrypt(
          { ciphertext: payload.encrypted, nonce: payload.nonce, ephemeralPK: payload.ephemeralPK, kyberCapsule: payload.kyberCapsule },
          identity.keyBundle.classical.secretKey
        )
        addDirectMsg(payload.from, {
          id: payload.id, from: payload.from, to: payload.to,
          plaintext: plain,
          encrypted: { ciphertext: payload.encrypted, nonce: payload.nonce, ephemeralPK: payload.ephemeralPK, kyberCapsule: payload.kyberCapsule, algorithm: 'X25519-Kyber768-XSalsa20-Poly1305', timestamp: payload.timestamp },
          cid: payload.cid, timestamp: payload.timestamp, read: false,
          messageType: payload.messageType || 'text',
        })
      } catch(e) { console.error('Decrypt failed:', e.message) }
    })

    sock.on('typing:start', ({ from }) => setTyping(t => ({ ...t, [from]: true })))
    sock.on('typing:stop',  ({ from }) => setTyping(t => ({ ...t, [from]: false })))

    // Refresh online users
    const poll = setInterval(() => {
      getOnlineUsers().then(users => {
        const map = {}; users.forEach(u => { map[u.did] = true }); setOnlineMap(map)
      }).catch(() => {})
    }, 5000)
    getOnlineUsers().then(users => { const map = {}; users.forEach(u => { map[u.did] = true }); setOnlineMap(map) }).catch(() => {})

    return () => { sock.off('message:receive'); sock.off('typing:start'); sock.off('typing:stop'); clearInterval(poll) }
  }, [identity?.did])

  // Load history when switching contacts
  useEffect(() => {
    if (!selected) return
    fetchHistory(selected.did).then(history => {
      history.forEach(payload => {
        const existing = (useStore.getState().conversations[selected.did] || []).find(m => m.id === payload.id)
        if (existing) return
        try {
          const plain = hybridDecrypt(
            { ciphertext: payload.encrypted, nonce: payload.nonce, ephemeralPK: payload.ephemeralPK },
            identity.keyBundle.classical.secretKey
          )
          addDirectMsg(payload.from, { ...payload, plaintext: plain, read: payload.from === identity.did })
        } catch {}
      })
    }).catch(() => {})
    markConvoRead(selected.did)
  }, [selected?.did])

  async function addContactByDID() {
    setAddError(''); setAdding(true)
    try {
      const info = await lookupPeerKey(addDID.trim())
      addContact({ did: addDID.trim(), alias: addAlias.trim() || info.alias, classicalPublicKey: info.publicKey, kyberPublicKey: info.kyberPublicKey })
      setAddDID(''); setAddAlias(''); setShowAdd(false)
    } catch(e) { setAddError(e.message || 'User not found or offline') }
    finally { setAdding(false) }
  }

  async function sendMsg() {
    if (!input.trim() || !selected) return
    setSending(true)
    try {
      const recipientPK = selected.classicalPublicKey || identity.keyBundle.classical.publicKey
      const enc = hybridEncrypt(input.trim(), recipientPK, selected.kyberPublicKey)
      const id  = crypto.randomUUID()
      const ts  = Date.now()

      const serverPayload = {
        id, from: identity.did, to: selected.did,
        encrypted: enc.ciphertext, nonce: enc.nonce,
        ephemeralPK: enc.ephemeralPK, kyberCapsule: enc.kyberCapsule,
        timestamp: ts, messageType: 'text',
      }
      sendEncryptedMessage(serverPayload)

      addDirectMsg(selected.did, {
        id, from: identity.did, to: selected.did,
        plaintext: input.trim(),
        encrypted: { ...enc, algorithm: 'X25519-Kyber768-XSalsa20-Poly1305', timestamp: ts },
        timestamp: ts, read: true, delivered: true, messageType: 'text',
      })
      setInput('')
      sendTypingStop(selected.did, identity.did)
    } catch(e) { console.error(e) }
    setSending(false)
  }

  function handleTyping(v) {
    setInput(v)
    if (!selected) return
    sendTypingStart(selected.did, identity.did)
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => sendTypingStop(selected.did, identity.did), 1800)
  }

  function fmt(ts) { return new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) }

  const rightPanelWidth = inspectedMsg ? 340 : 0

  return (
    <div style={{ height:'calc(100vh - 100px)', display:'flex', gap:0, border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', position:'relative' }}>
      {/* Contacts list */}
      <div style={{ width:240, borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', background:'var(--bg-deep)', flexShrink:0 }}>
        <div style={{ padding:'12px 14px 10px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', color:'var(--text-muted)', letterSpacing:'0.1em' }}>CONTACTS</span>
            <button onClick={() => setShowAdd(v=>!v)} style={{ background:'var(--cyan-glow)', border:'1px solid var(--cyan-border)', borderRadius:6, color:'var(--cyan)', cursor:'pointer', padding:'3px 9px', fontSize:'0.72rem', fontFamily:'var(--font-mono)' }}>+ ADD</button>
          </div>
          {showAdd && (
            <div>
              <input className="cyber-input" placeholder="Their DID (did:key:z...)" value={addDID} onChange={e=>setAddDID(e.target.value)} style={{ marginBottom:5, fontSize:'0.72rem', fontFamily:'var(--font-mono)' }} />
              <input className="cyber-input" placeholder="Alias (optional)" value={addAlias} onChange={e=>setAddAlias(e.target.value)} style={{ marginBottom:5, fontSize:'0.82rem' }} />
              {addError && <div style={{ fontSize:'0.72rem', color:'var(--red)', marginBottom:5 }}>⚠ {addError}</div>}
              <button className="cyber-btn primary" style={{ width:'100%', justifyContent:'center', padding:'7px', fontSize:'0.75rem' }} onClick={addContactByDID} disabled={adding}>
                {adding ? <span className="animate-spin">⟳</span> : 'ADD CONTACT'}
              </button>
              <p style={{ fontSize:'0.65rem', color:'var(--text-muted)', marginTop:5, lineHeight:1.4 }}>Contact must be online for key exchange. Share your DID from Identity page.</p>
            </div>
          )}
        </div>

        <div style={{ flex:1, overflowY:'auto' }}>
          {contacts.length === 0 ? (
            <div style={{ padding:18, textAlign:'center', color:'var(--text-muted)', fontSize:'0.8rem' }}>No contacts yet.<br/>Add a contact to start chatting.</div>
          ) : contacts.map(c => {
            const cMsgs  = conversations[c.did] || []
            const last   = cMsgs[cMsgs.length-1]
            const unread = cMsgs.filter(m => !m.read && m.from !== identity?.did).length
            return (
              <div key={c.did} onClick={() => setSelected(c)} style={{ padding:'11px 14px', borderBottom:'1px solid rgba(0,229,255,.05)', cursor:'pointer', background: selected?.did===c.did ? 'var(--cyan-glow)' : 'transparent', transition:'background 0.13s' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background: onlineMap[c.did] ? 'var(--green)' : 'var(--text-muted)', display:'inline-block', flexShrink:0 }} />
                    <span style={{ fontWeight:500, fontSize:'0.88rem', color:'var(--text-primary)' }}>{c.alias}</span>
                  </div>
                  {unread > 0 && <span style={{ background:'var(--cyan)', color:'#000', borderRadius:'50%', width:17, height:17, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.6rem', fontWeight:700 }}>{unread}</span>}
                </div>
                {last && <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{last.from===identity?.did?'You: ':''}{last.plaintext}</div>}
                {typing[c.did] && <div style={{ fontSize:'0.68rem', color:'var(--cyan)', fontStyle:'italic' }}>typing…</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Chat area */}
      {selected ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', background:'var(--bg-surface)', minWidth:0 }}>
          {/* Chat header */}
          <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--bg-deep)', flexShrink:0 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background: onlineMap[selected.did] ? 'var(--green)' : 'var(--text-muted)', display:'inline-block' }} />
                <span style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.95rem', letterSpacing:'0.05em' }}>{selected.alias}</span>
              </div>
              <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginTop:2 }}>{truncateDID(selected.did, 18)}</div>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span className="badge purple">KYBER-768</span>
              <span className="badge success">E2E ENCRYPTED</span>
              <button onClick={() => setInspected(msgs[msgs.length-1])} style={{ background:'var(--cyan-glow)', border:'1px solid var(--cyan-border)', borderRadius:6, color:'var(--cyan)', cursor:'pointer', padding:'4px 10px', fontSize:'0.7rem', fontFamily:'var(--font-mono)' }}>
                🔒 INSPECT
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'18px', display:'flex', flexDirection:'column', gap:10 }}>
            {msgs.length === 0 ? (
              <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'0.85rem', marginTop:60 }}>
                <div style={{ fontSize:32, marginBottom:10, opacity:.4 }}>◈</div>
                No messages yet. All messages are encrypted with X25519 + Kyber-768.
              </div>
            ) : msgs.map(m => {
              const isOwn = m.from === identity?.did
              return (
                <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                  <div
                    onClick={() => setInspected(m)}
                    style={{ maxWidth:'70%', padding:'9px 13px', borderRadius: isOwn ? '12px 12px 3px 12px' : '12px 12px 12px 3px', background: isOwn ? 'rgba(0,229,255,.1)' : 'var(--bg-card)', border:`1px solid ${isOwn?'var(--cyan-border)':'var(--border)'}`, color:'var(--text-primary)', fontSize:'0.88rem', lineHeight:1.55, cursor:'pointer', transition:'border-color 0.13s' }}
                    title="Click to inspect encryption"
                  >
                    {m.plaintext}
                    {m.messageType === 'file' && <div style={{ fontSize:'0.72rem', color:'var(--cyan)', marginTop:4 }}>📎 {m.fileName}</div>}
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:3, flexDirection: isOwn ? 'row-reverse' : 'row' }}>
                    <span style={{ fontSize:'0.63rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{fmt(m.timestamp)}</span>
                    <span style={{ fontSize:'0.6rem', color:'var(--green)', fontFamily:'var(--font-mono)' }}>🔒 PQC</span>
                    {m.cid && <span style={{ fontSize:'0.6rem', color:'var(--purple)', fontFamily:'var(--font-mono)' }}>IPFS</span>}
                    {isOwn && m.delivered && <span style={{ fontSize:'0.6rem', color:'var(--cyan)' }}>✓✓</span>}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', gap:9, background:'var(--bg-deep)', flexShrink:0 }}>
            <input className="cyber-input" placeholder={`Message ${selected.alias} (Kyber-768 encrypted)`} value={input} onChange={e=>handleTyping(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendMsg()} style={{ flex:1 }} />
            <button className="cyber-btn primary" onClick={sendMsg} disabled={sending||!input.trim()} style={{ flexShrink:0 }}>
              {sending ? <span className="animate-spin">⟳</span> : '◈ SEND'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:10, color:'var(--text-muted)', background:'var(--bg-surface)' }}>
          <div style={{ fontSize:44, opacity:.3 }}>◈</div>
          <div style={{ fontSize:'0.88rem' }}>Select a contact to start quantum-encrypted chat</div>
          <span className="badge info">Hybrid X25519 + Kyber-768 per message</span>
        </div>
      )}

      {/* Encryption Inspector Side Panel */}
      <EncryptionInspector />
    </div>
  )
}
