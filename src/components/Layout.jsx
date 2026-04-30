import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useStore } from '../store/index.js'
import { connect, disconnect, isConnected } from '../lib/socket.js'
import { truncateDID } from '../lib/identity.js'

const NAV = [
  { to: '/app',           label: 'Dashboard',  icon: '⬡', end: true },
  { to: '/app/messages',  label: 'Messages',   icon: '◈' },
  { to: '/app/files',     label: 'Files',      icon: '◰' },
  { to: '/app/wallet',    label: 'Identity',   icon: '◉' },
  { to: '/app/security',  label: 'Security',   icon: '⬔' },
  { to: '/app/analytics', label: 'Analytics',  icon: '◐' },
  { to: '/app/settings',  label: 'Settings',   icon: '⚙' },
]

export default function Layout() {
  const { identity, logout, notifications } = useStore()
  const navigate  = useNavigate()
  const [open, setOpen]     = useState(true)
  const [online, setOnline] = useState(false)

  useEffect(() => {
    if (!identity) return
    const sock = connect(identity, () => setOnline(true))
    sock.on('disconnect', () => setOnline(false))
    return () => { disconnect(); setOnline(false) }
  }, [identity?.did])

  const unread = notifications.filter(n => !n.read).length

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: open ? 224 : 58, transition: 'width 0.22s ease',
        background: 'var(--bg-deep)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding:'18px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10, minHeight:60 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,rgba(0,229,255,.25),rgba(157,78,221,.25))', border:'1px solid var(--cyan-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>⬡</div>
          {open && <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.95rem', letterSpacing:'0.1em', color:'var(--cyan)', lineHeight:1 }}>Q-ID<span style={{ color:'var(--purple)' }}>Chain</span></div>
            <div style={{ fontSize:'0.6rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)', letterSpacing:'0.08em' }}>PQC SECURE</div>
          </div>}
        </div>

        {/* Identity pill */}
        {open && identity && (
          <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', background:'rgba(0,229,255,.03)' }}>
            <div style={{ fontSize:'0.62rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:3 }}>MY DID</div>
            <div style={{ fontSize:'0.7rem', color:'var(--cyan)', fontFamily:'var(--font-mono)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{truncateDID(identity.did, 14)}</div>
            <div style={{ fontSize:'0.78rem', color:'var(--text-secondary)', marginTop:2 }}>{identity.alias}</div>
            <div style={{ display:'flex', gap:6, marginTop:5, flexWrap:'wrap' }}>
              <span className={`badge ${online ? 'success' : 'danger'}`} style={{ fontSize:'0.6rem' }}>{online ? '● ONLINE' : '○ OFFLINE'}</span>
              <span className="badge purple" style={{ fontSize:'0.6rem' }}>KYBER-768</span>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex:1, padding:'10px 7px', overflowY:'auto' }}>
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:10,
                padding:'9px 10px', borderRadius:8, marginBottom:3,
                color: isActive ? 'var(--cyan)' : 'var(--text-secondary)',
                background: isActive ? 'var(--cyan-glow)' : 'transparent',
                border: `1px solid ${isActive ? 'var(--cyan-border)' : 'transparent'}`,
                transition:'all 0.14s', textDecoration:'none',
                fontSize:'0.85rem', fontFamily:'var(--font-display)', fontWeight:500, letterSpacing:'0.06em',
                whiteSpace:'nowrap', overflow:'hidden',
              })}>
              <span style={{ fontSize:15, flexShrink:0 }}>{item.icon}</span>
              {open && item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding:'10px 7px', borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:6 }}>
          <button onClick={() => setOpen(v=>!v)} style={{ background:'transparent', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-muted)', cursor:'pointer', padding:'7px 10px', display:'flex', alignItems:'center', gap:8, fontSize:'0.78rem', transition:'all 0.14s' }}>
            <span>{open ? '◁' : '▷'}</span>{open && 'Collapse'}
          </button>
          <button onClick={() => { logout(); navigate('/') }} style={{ background:'transparent', border:'1px solid rgba(255,59,92,.22)', borderRadius:8, color:'var(--red)', cursor:'pointer', padding:'7px 10px', display:'flex', alignItems:'center', gap:8, fontSize:'0.78rem', fontFamily:'var(--font-display)', letterSpacing:'0.06em', transition:'all 0.14s' }}>
            <span>⏻</span>{open && 'DISCONNECT'}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex:1, overflow:'auto', background:'var(--bg-void)', display:'flex', flexDirection:'column' }}>
        {/* Top bar */}
        <div style={{ height:52, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 22px', background:'var(--bg-deep)', position:'sticky', top:0, zIndex:5, flexShrink:0 }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.68rem', color:'var(--text-muted)', letterSpacing:'0.08em' }}>
            Q-IDChain · X25519+Kyber-768+XSalsa20-Poly1305
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span className={`badge ${online ? 'success' : 'warning'}`}>{online ? '● SERVER CONNECTED' : '○ CONNECTING...'}</span>
            <span className="badge purple">KYBER-768 ON</span>
            {unread > 0 && <span className="badge warning">{unread} ALERTS</span>}
          </div>
        </div>

        <div style={{ flex:1, padding:22, overflowY:'auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
