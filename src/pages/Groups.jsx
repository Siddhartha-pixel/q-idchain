import React, { useState, useRef, useEffect } from 'react'
import { useStore } from '../store/index.js'
import { symmetricEncrypt, symmetricDecrypt, generateSessionKey } from '../lib/crypto.js'
import { sendGroupMessage, getSocket, joinGroupRoom } from '../lib/socket.js'

export default function Groups() {
  const { identity, contacts, groups, groupMessages, addGroup, addGroupMsg, updateGroup } = useStore()
  const [selected, setSelected]   = useState(null)
  const [input, setInput]         = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [gName, setGName]         = useState('')
  const [gMembers, setGMembers]   = useState([])
  const bottomRef = useRef(null)

  const msgs = selected ? (groupMessages[selected.id] || []) : []

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [msgs.length])

  // Join all group rooms on mount
  useEffect(() => {
    groups.forEach(g => joinGroupRoom(g.id, identity?.did))
  }, [groups.length])

  // Listen for group messages
  useEffect(() => {
    const sock = getSocket(); if (!sock) return
    sock.on('group:message', payload => {
      try {
        const group = useStore.getState().groups.find(g => g.id === payload.groupId)
        if (!group) return
        const plain = symmetricDecrypt({ ciphertext: payload.encrypted, nonce: payload.nonce }, group.sessionKey)
        addGroupMsg(payload.groupId, { ...payload, plaintext: plain, read: false })
      } catch(e) { console.error('Group decrypt failed:', e.message) }
    })
    return () => { sock.off('group:message') }
  }, [groups])

  function createGroup() {
    if (!gName.trim()) return
    const sessionKey = generateSessionKey()
    const group = {
      id: crypto.randomUUID(), name: gName.trim(), sessionKey,
      adminDID: identity.did, keyVersion: 1,
      members: [
        { did: identity.did, alias: identity.alias, role: 'admin' },
        ...gMembers.map(did => ({ did, alias: contacts.find(c=>c.did===did)?.alias||did.slice(0,12), role:'member' })),
      ],
      createdAt: Date.now(),
    }
    addGroup(group)
    joinGroupRoom(group.id, identity.did)
    setGName(''); setGMembers([]); setShowCreate(false); setSelected(group)
  }

  function sendGroupMsg() {
    if (!input.trim() || !selected) return
    const enc = symmetricEncrypt(input.trim(), selected.sessionKey)
    const id  = crypto.randomUUID(); const ts = Date.now()

    sendGroupMessage({ id, groupId: selected.id, from: identity.did, encrypted: enc.ciphertext, nonce: enc.nonce, timestamp: ts, type:'text' })
    addGroupMsg(selected.id, { id, groupId: selected.id, from: identity.did, plaintext: input.trim(), encrypted: enc, timestamp: ts, read: true })
    setInput('')
  }

  function fmt(ts) { return new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) }
  function memberAlias(did) { return did===identity.did ? 'You' : (selected?.members.find(m=>m.did===did)?.alias || did.slice(0,10)) }

  return (
    <div style={{ height:'calc(100vh - 100px)', display:'flex', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
      {/* Group list */}
      <div style={{ width:240, borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', background:'var(--bg-deep)', flexShrink:0 }}>
        <div style={{ padding:'12px 14px 10px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', color:'var(--text-muted)', letterSpacing:'0.1em' }}>GROUPS</span>
            <button onClick={() => setShowCreate(v=>!v)} style={{ background:'var(--purple-glow)', border:'1px solid rgba(157,78,221,.35)', borderRadius:6, color:'var(--purple)', cursor:'pointer', padding:'3px 9px', fontSize:'0.72rem', fontFamily:'var(--font-mono)' }}>+ NEW</button>
          </div>
          {showCreate && (
            <div>
              <input className="cyber-input" placeholder="Group name" value={gName} onChange={e=>setGName(e.target.value)} style={{ marginBottom:5 }} />
              <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginBottom:5, fontFamily:'var(--font-mono)' }}>ADD MEMBERS:</div>
              {contacts.map(c => (
                <label key={c.did} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, cursor:'pointer', fontSize:'0.8rem', color:'var(--text-secondary)' }}>
                  <input type="checkbox" checked={gMembers.includes(c.did)} onChange={e => setGMembers(prev => e.target.checked ? [...prev,c.did] : prev.filter(d=>d!==c.did))} />
                  {c.alias}
                </label>
              ))}
              <button className="cyber-btn primary" style={{ width:'100%', justifyContent:'center', padding:'7px', fontSize:'0.75rem', marginTop:6 }} onClick={createGroup}>CREATE GROUP</button>
            </div>
          )}
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          {groups.length === 0 ? (
            <div style={{ padding:18, textAlign:'center', color:'var(--text-muted)', fontSize:'0.8rem' }}>No groups yet.</div>
          ) : groups.map(g => (
            <div key={g.id} onClick={() => setSelected(g)} style={{ padding:'11px 14px', borderBottom:'1px solid rgba(0,229,255,.05)', cursor:'pointer', background: selected?.id===g.id ? 'var(--purple-glow)' : 'transparent', transition:'background 0.13s' }}>
              <div style={{ fontWeight:500, fontSize:'0.88rem', color:'var(--text-primary)', marginBottom:2 }}>{g.name}</div>
              <div style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>{g.members.length} members · v{g.keyVersion}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Group chat */}
      {selected ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', background:'var(--bg-surface)' }}>
          <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--bg-deep)', flexShrink:0 }}>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.95rem', letterSpacing:'0.05em' }}>{selected.name}</div>
              <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginTop:2 }}>
                {selected.members.map(m=>m.alias).join(', ')} · Key v{selected.keyVersion}
              </div>
            </div>
            <div style={{ display:'flex', gap:7 }}>
              <span className="badge success">AES-GCM + SESSION KEY</span>
              <span className="badge purple">{selected.members.length} MEMBERS</span>
            </div>
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:'18px', display:'flex', flexDirection:'column', gap:10 }}>
            {msgs.length === 0 ? (
              <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'0.85rem', marginTop:60 }}>
                <div style={{ fontSize:32, marginBottom:10, opacity:.4 }}>◎</div>
                No messages yet. Group session key encrypted.
              </div>
            ) : msgs.map(m => {
              const isOwn = m.from === identity?.did
              return (
                <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                  {!isOwn && <div style={{ fontSize:'0.65rem', color:'var(--purple)', fontFamily:'var(--font-mono)', marginBottom:2 }}>{memberAlias(m.from)}</div>}
                  <div style={{ maxWidth:'70%', padding:'9px 13px', borderRadius: isOwn ? '12px 12px 3px 12px' : '12px 12px 12px 3px', background: isOwn ? 'rgba(157,78,221,.1)' : 'var(--bg-card)', border:`1px solid ${isOwn?'rgba(157,78,221,.3)':'var(--border)'}`, color:'var(--text-primary)', fontSize:'0.88rem', lineHeight:1.55 }}>
                    {m.plaintext}
                  </div>
                  <div style={{ fontSize:'0.6rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginTop:3 }}>
                    {fmt(m.timestamp)} · 🔒 AES-GCM
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', gap:9, background:'var(--bg-deep)', flexShrink:0 }}>
            <input className="cyber-input" placeholder={`Message ${selected.name} (group encrypted)`} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendGroupMsg()} style={{ flex:1 }} />
            <button className="cyber-btn" style={{ borderColor:'var(--purple)', color:'var(--purple)', flexShrink:0 }} onClick={sendGroupMsg} disabled={!input.trim()}>
              ◎ SEND
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:10, color:'var(--text-muted)', background:'var(--bg-surface)' }}>
          <div style={{ fontSize:44, opacity:.3 }}>◎</div>
          <div style={{ fontSize:'0.88rem' }}>Select or create a group</div>
          <span className="badge purple">Group session key · AES-GCM encrypted</span>
        </div>
      )}
    </div>
  )
}
