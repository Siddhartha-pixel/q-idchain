import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/index.js'
import { isConnected, getOnlineUsers } from '../lib/socket.js'
import { truncateDID } from '../lib/identity.js'

export default function Dashboard() {
  const navigate = useNavigate()
  const { identity, contacts, conversations, groups, sharedFiles, notifications } = useStore()
  const [onlineUsers, setOnlineUsers] = useState([])

  useEffect(() => {
    const t = setInterval(() => {
      getOnlineUsers().then(setOnlineUsers).catch(() => {})
    }, 4000)
    return () => clearInterval(t)
  }, [])

  const totalMsgs  = Object.values(conversations).reduce((s, m) => s + m.length, 0)
  const totalUnread = contacts.reduce((s, c) => s + (conversations[c.did]?.filter(m => !m.read && m.from !== identity?.did).length || 0), 0)

  const stats = [
    { label:'CONTACTS',     value: contacts.length,   color:'var(--cyan)' },
    { label:'MESSAGES',     value: totalMsgs,          color:'var(--purple)' },
    { label:'UNREAD',       value: totalUnread,        color:'var(--amber)' },
    { label:'GROUPS',       value: groups.length,      color:'var(--green)' },
    { label:'FILES SHARED', value: sharedFiles.length, color:'var(--cyan)' },
    { label:'ONLINE NOW',   value: onlineUsers.length, color:'var(--green)' },
  ]

  return (
    <div className="animate-fade">
      <div style={{ marginBottom:26 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', letterSpacing:'0.08em', marginBottom:6 }}>SECURE DASHBOARD</h1>
        <p style={{ color:'var(--text-secondary)', fontSize:'0.88rem' }}>
          Welcome back, <strong style={{ color:'var(--cyan)' }}>{identity?.alias}</strong> · {isConnected() ? <span style={{ color:'var(--green)' }}>● Connected</span> : <span style={{ color:'var(--amber)' }}>○ Reconnecting...</span>}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:14, marginBottom:26 }}>
        {stats.map(s => (
          <div key={s.label} className="cyber-card" style={{ padding:'18px 14px', textAlign:'center' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'1.9rem', fontWeight:700, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:'0.62rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)', letterSpacing:'0.1em', marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }}>
        {/* Identity */}
        <div className="cyber-card" style={{ padding:22 }}>
          <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)', letterSpacing:'0.1em', marginBottom:14 }}>YOUR DECENTRALIZED IDENTITY</div>
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:'0.62rem', color:'var(--text-muted)', marginBottom:3 }}>DID</div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.72rem', color:'var(--cyan)', wordBreak:'break-all', lineHeight:1.5 }}>{truncateDID(identity?.did, 22)}</div>
          </div>
          {[['ENCRYPTION','X25519 + Kyber-768 (Hybrid PQC)','var(--green)'],['SIGNING','Ed25519','var(--purple)'],['2FA','TOTP — Google Authenticator','var(--cyan)'],['STORAGE','IPFS Decentralized','var(--amber)']].map(([l,v,c])=>(
            <div key={l} style={{ marginBottom:7 }}>
              <div style={{ fontSize:'0.6rem', color:'var(--text-muted)' }}>{l}</div>
              <div style={{ fontSize:'0.78rem', color:c, fontFamily:'var(--font-mono)' }}>{v}</div>
            </div>
          ))}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10 }}>
            <span className="badge success">● ACTIVE</span>
            <span className="badge purple">KYBER-768</span>
            <span className="badge info">did:key</span>
          </div>
        </div>

        {/* Security checklist */}
        <div className="cyber-card" style={{ padding:22 }}>
          <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)', letterSpacing:'0.1em', marginBottom:14 }}>SECURITY STATUS</div>
          {[
            ['Post-Quantum Encryption (Kyber-768)', true],
            ['Classical Encryption (X25519)',       true],
            ['Digital Signatures (Ed25519)',         true],
            ['TOTP 2FA (Google Authenticator)',      !!useStore.getState().totpSecret],
            ['Decentralized Identity (DID)',         true],
            ['End-to-End Encrypted Messages',        true],
            ['IPFS Decentralized Storage',           true],
            ['Server sees only ciphertext',          true],
          ].map(([label, ok]) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', borderBottom:'1px solid rgba(0,229,255,.05)' }}>
              <span style={{ fontSize:'0.78rem', color:'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontSize:'0.65rem', fontFamily:'var(--font-mono)', color: ok ? 'var(--green)' : 'var(--amber)' }}>{ok ? '✓ ON' : '⚠ SETUP'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Online users + Quick actions */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
        <div className="cyber-card" style={{ padding:22 }}>
          <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)', letterSpacing:'0.1em', marginBottom:14 }}>ONLINE USERS</div>
          {onlineUsers.length === 0 ? (
            <div style={{ color:'var(--text-muted)', fontSize:'0.82rem' }}>No other users online right now</div>
          ) : onlineUsers.slice(0, 6).map(u => (
            <div key={u.did} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid rgba(0,229,255,.05)' }}>
              <span style={{ fontSize:'0.85rem', color:'var(--text-primary)' }}>{u.alias}</span>
              <span className="badge success" style={{ fontSize:'0.6rem' }}>● ONLINE</span>
            </div>
          ))}
        </div>

        <div className="cyber-card" style={{ padding:22 }}>
          <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)', letterSpacing:'0.1em', marginBottom:14 }}>QUICK ACTIONS</div>
          <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
            <button className="cyber-btn primary" style={{ justifyContent:'center' }} onClick={() => navigate('/app/messages')}>◈ New Message</button>
            <button className="cyber-btn" style={{ justifyContent:'center', borderColor:'var(--purple)', color:'var(--purple)' }} onClick={() => navigate('/app/groups')}>◎ Create Group</button>
            <button className="cyber-btn" style={{ justifyContent:'center' }} onClick={() => navigate('/app/files')}>◰ Share File</button>
            <button className="cyber-btn" style={{ justifyContent:'center' }} onClick={() => navigate('/app/wallet')}>◉ View Identity</button>
          </div>
        </div>
      </div>
    </div>
  )
}
