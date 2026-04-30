import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/index.js'

const FEATURES = [
  { icon:'⬡', title:'Kyber-768 PQC',         desc:'Post-quantum key encapsulation — safe from quantum computers' },
  { icon:'◈', title:'X25519 Hybrid',          desc:'Classical ECDH combined with Kyber for maximum security' },
  { icon:'◉', title:'W3C Decentralized ID',   desc:'Self-sovereign identity — you own your DID, no central authority' },
  { icon:'◎', title:'Real-time Encrypted P2P', desc:'WebSocket relay — server sees only encrypted blobs, never plaintext' },
  { icon:'◰', title:'IPFS File Sharing',      desc:'Encrypted files stored on the decentralized web' },
  { icon:'⬔', title:'TOTP 2FA (Google Auth)', desc:'Google Authenticator — no SMS, no phone numbers required' },
]

export default function Landing() {
  const navigate = useNavigate()
  const isAuthed = useStore(s => s.isAuthed)
  const canvasRef = useRef(null)

  useEffect(() => { if (isAuthed) navigate('/app') }, [isAuthed])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf
    function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize(); window.addEventListener('resize', resize)
    const pts = Array.from({length:70}, () => ({ x:Math.random()*canvas.width, y:Math.random()*canvas.height, vx:(Math.random()-.5)*.35, vy:(Math.random()-.5)*.35, r:Math.random()*1.4+.3, a:Math.random()*.4+.1 }))
    function draw() {
      ctx.clearRect(0,0,canvas.width,canvas.height)
      pts.forEach(p => {
        p.x+=p.vx; p.y+=p.vy
        if(p.x<0)p.x=canvas.width; if(p.x>canvas.width)p.x=0
        if(p.y<0)p.y=canvas.height; if(p.y>canvas.height)p.y=0
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=`rgba(0,229,255,${p.a})`; ctx.fill()
      })
      pts.forEach((a,i)=>pts.slice(i+1).forEach(b=>{const d=Math.hypot(a.x-b.x,a.y-b.y);if(d<90){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=`rgba(0,229,255,${.05*(1-d/90)})`;ctx.lineWidth=.5;ctx.stroke()}}))
      raf=requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize',resize) }
  }, [])

  return (
    <div style={{ minHeight:'100vh', position:'relative', overflow:'hidden' }}>
      <canvas ref={canvasRef} style={{ position:'fixed', inset:0, width:'100%', height:'100%', opacity:.65 }} />
      <div className="hex-grid-bg" style={{ position:'fixed', inset:0, opacity:.25 }} />

      {/* Nav */}
      <nav style={{ position:'relative', zIndex:10, padding:'18px 36px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)', background:'rgba(2,4,8,.82)', backdropFilter:'blur(12px)' }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.2rem', letterSpacing:'0.1em' }}>
          <span style={{ color:'var(--cyan)' }}>Q-ID</span><span style={{ color:'var(--purple)' }}>Chain</span>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="cyber-btn" onClick={() => navigate('/auth')}>SIGN IN</button>
          <button className="cyber-btn primary" onClick={() => navigate('/auth?mode=register')}>CREATE IDENTITY</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position:'relative', zIndex:5, minHeight:'86vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'60px 24px' }}>
        <div style={{ position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)', width:500, height:500, borderRadius:'50%', background:'radial-gradient(ellipse,rgba(0,229,255,.05) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div className="badge info" style={{ marginBottom:22, fontSize:'0.68rem' }}>HYBRID PQC · X25519 + KYBER-768 · W3C DID · IPFS · GOOGLE AUTH 2FA</div>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(2.4rem,6vw,4.8rem)', fontWeight:700, letterSpacing:'0.04em', lineHeight:1.1, marginBottom:22, background:'linear-gradient(135deg,#e8f4f8 0%,#00e5ff 50%,#9d4edd 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          QUANTUM-SECURE<br />DECENTRALIZED MESSAGING
        </h1>
        <p style={{ maxWidth:540, color:'var(--text-secondary)', fontSize:'1rem', lineHeight:1.75, marginBottom:38 }}>
          Real-time encrypted chat between multiple devices and people. Hybrid X25519 + Kyber-768 encryption that no quantum computer can break. Own your identity.
        </p>
        <div style={{ display:'flex', gap:14, flexWrap:'wrap', justifyContent:'center' }}>
          <button className="cyber-btn primary" style={{ padding:'13px 30px', fontSize:'0.95rem' }} onClick={() => navigate('/auth?mode=register')}>⬡ CREATE YOUR IDENTITY</button>
          <button className="cyber-btn" style={{ padding:'13px 30px', fontSize:'0.95rem' }} onClick={() => navigate('/auth')}>◈ SIGN IN</button>
        </div>
        <div style={{ marginTop:56, display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:28, maxWidth:640, width:'100%' }}>
          {[['Kyber-768','ENCRYPTION'],['did:key','IDENTITY'],['IPFS','STORAGE'],['TOTP','2FA']].map(([v,l])=>(
            <div key={l} style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'1.05rem', color:'var(--cyan)' }}>{v}</div>
              <div style={{ fontSize:'0.62rem', color:'var(--text-muted)', letterSpacing:'0.1em', marginTop:3 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ position:'relative', zIndex:5, padding:'50px 36px', maxWidth:1080, margin:'0 auto' }}>
        <h2 style={{ textAlign:'center', fontFamily:'var(--font-display)', fontSize:'1.45rem', letterSpacing:'0.1em', marginBottom:34 }}>SECURITY ARCHITECTURE</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))', gap:18 }}>
          {FEATURES.map(f=>(
            <div key={f.title} className="cyber-card" style={{ padding:22 }}>
              <div style={{ fontSize:26, marginBottom:10, color:'var(--cyan)' }}>{f.icon}</div>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:'0.95rem', letterSpacing:'0.07em', marginBottom:7 }}>{f.title}</h3>
              <p style={{ fontSize:'0.835rem', color:'var(--text-secondary)', lineHeight:1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ position:'relative', zIndex:5, borderTop:'1px solid var(--border)', padding:'18px 36px', display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(2,4,8,.82)' }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.68rem', color:'var(--text-muted)' }}>Q-IDChain v1.0 · Quantum-Resistant · Open Standards</div>
        <div style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>X25519 + Kyber-768 · Ed25519 · XSalsa20-Poly1305 · W3C DID · IPFS</div>
      </footer>
    </div>
  )
}
