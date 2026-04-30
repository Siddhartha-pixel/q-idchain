import React from 'react'
import { useStore } from '../store/index.js'
import { truncateKey } from '../lib/crypto.js'

export default function EncryptionInspector() {
  const { inspectedMsg, clearInspected } = useStore()

  if (!inspectedMsg) return null

  const m = inspectedMsg
  const enc = m.encrypted || m.encryptedPayload || {}

  const rows = [
    { label: 'Message ID',       value: m.id || '—' },
    { label: 'Algorithm',        value: enc.algorithm || m.algorithm || 'X25519-Kyber768-XSalsa20-Poly1305', highlight: 'cyan' },
    { label: 'Timestamp',        value: m.timestamp ? new Date(m.timestamp).toLocaleString() : '—' },
    { label: 'From DID',         value: m.from || '—', mono: true },
    { label: 'To DID',           value: m.to   || '—', mono: true },
    { label: 'Ciphertext',       value: enc.ciphertext  ? truncateKey(enc.ciphertext, 24)  : '—', mono: true },
    { label: 'Nonce',            value: enc.nonce       ? truncateKey(enc.nonce, 20)       : '—', mono: true },
    { label: 'Ephemeral PK',     value: enc.ephemeralPK ? truncateKey(enc.ephemeralPK, 20) : '—', mono: true },
    { label: 'Kyber Capsule',    value: enc.kyberCapsule? truncateKey(enc.kyberCapsule,20) : '—', mono: true, highlight:'purple' },
    { label: 'IPFS CID',         value: m.cid ? m.cid : '—', mono: true, highlight:'green' },
    { label: 'Key Version',      value: m.keyVersion ? `v${m.keyVersion}` : '—' },
    { label: 'Message Type',     value: m.messageType || m.type || 'text' },
    { label: 'Delivery',         value: m.delivered ? '✓ Delivered' : 'Pending', highlight: m.delivered ? 'green' : 'warning' },
    { label: 'Read',             value: m.read ? '✓ Read' : 'Unread', highlight: m.read ? 'green' : '' },
  ]

  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, bottom: 0,
      width: 340, background: 'var(--bg-deep)',
      borderLeft: '1px solid var(--cyan-border)',
      zIndex: 100, display: 'flex', flexDirection: 'column',
      boxShadow: '-4px 0 24px rgba(0,229,255,0.07)',
    }}>
      {/* Header */}
      <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(0,229,255,0.04)' }}>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.95rem', color:'var(--cyan)', letterSpacing:'0.1em' }}>
            🔒 ENCRYPTION DETAILS
          </div>
          <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginTop:2 }}>
            Message crypto inspection panel
          </div>
        </div>
        <button onClick={clearInspected} style={{ background:'transparent', border:'1px solid var(--border)', borderRadius:6, color:'var(--text-muted)', cursor:'pointer', padding:'5px 10px', fontSize:'0.8rem', transition:'all 0.14s' }}>
          ✕ CLOSE
        </button>
      </div>

      {/* Security badges */}
      <div style={{ padding:'10px 18px', borderBottom:'1px solid var(--border)', display:'flex', gap:6, flexWrap:'wrap' }}>
        <span className="badge info">X25519</span>
        <span className="badge purple">KYBER-768</span>
        <span className="badge success">XSALSA20</span>
        <span className="badge success">POLY1305 MAC</span>
      </div>

      {/* Rows */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 18px' }}>
        {rows.map(r => (
          <div key={r.label} style={{ marginBottom:12 }}>
            <div style={{ fontSize:'0.62rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)', letterSpacing:'0.09em', marginBottom:3 }}>
              {r.label}
            </div>
            <div style={{
              fontSize: r.mono ? '0.72rem' : '0.82rem',
              fontFamily: r.mono ? 'var(--font-mono)' : 'var(--font-body)',
              color: r.highlight === 'cyan'   ? 'var(--cyan)'
                   : r.highlight === 'purple' ? 'var(--purple)'
                   : r.highlight === 'green'  ? 'var(--green)'
                   : r.highlight === 'warning'? 'var(--amber)'
                   : 'var(--text-secondary)',
              wordBreak: 'break-all', lineHeight: 1.5,
              padding: '5px 8px', background:'var(--bg-surface)',
              borderRadius: 6, border:'1px solid var(--border)',
            }}>
              {r.value}
            </div>
          </div>
        ))}

        {/* Raw payload */}
        <div style={{ marginTop:16 }}>
          <div style={{ fontSize:'0.62rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)', letterSpacing:'0.09em', marginBottom:6 }}>
            RAW ENCRYPTED PAYLOAD (JSON)
          </div>
          <pre style={{
            fontSize:'0.65rem', fontFamily:'var(--font-mono)', color:'var(--text-secondary)',
            background:'var(--bg-void)', border:'1px solid var(--border)',
            borderRadius:6, padding:10, overflowX:'auto', whiteSpace:'pre-wrap', wordBreak:'break-all',
            lineHeight:1.6, maxHeight:200, overflowY:'auto',
          }}>
            {JSON.stringify({ id: m.id, from: m.from, to: m.to, ...enc, cid: m.cid, timestamp: m.timestamp }, null, 2)}
          </pre>
        </div>

        {/* Info box */}
        <div style={{ marginTop:14, padding:'10px 12px', background:'rgba(0,229,255,0.05)', border:'1px solid var(--cyan-border)', borderRadius:8, fontSize:'0.75rem', color:'var(--text-secondary)', lineHeight:1.6 }}>
          <strong style={{ color:'var(--cyan)' }}>How this message was secured:</strong>
          <br />1. Ephemeral X25519 DH → shared secret<br />
          2. Kyber-768 KEM → post-quantum key<br />
          3. XSalsa20-Poly1305 → authenticated encryption<br />
          4. Ed25519 → sender signature<br />
          5. Encrypted blob stored on IPFS
        </div>
      </div>
    </div>
  )
}
