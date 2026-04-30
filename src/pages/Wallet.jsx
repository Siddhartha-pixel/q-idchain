import React, { useState } from 'react'
import { useStore } from '../store/index.js'
import { truncateDID } from '../lib/identity.js'
import { truncateKey } from '../lib/crypto.js'

export default function Wallet() {
  const { identity } = useStore()
  const [tab, setTab]     = useState('overview')
  const [copied, setCopied] = useState('')

  function copy(text, label) {
    navigator.clipboard.writeText(text).then(() => { setCopied(label); setTimeout(() => setCopied(''), 2000) })
  }

  const tabs = ['overview', 'keypairs', 'did-document', 'share']

  if (!identity) return null

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.08em', marginBottom: 6 }}>IDENTITY WALLET</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Your DID, Kyber-768 + X25519 keypairs, and verifiable credentials</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 22, borderBottom: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: 'transparent', border: 'none',
            borderBottom: tab === t ? '2px solid var(--cyan)' : '2px solid transparent',
            color: tab === t ? 'var(--cyan)' : 'var(--text-muted)',
            padding: '8px 14px', fontFamily: 'var(--font-display)', fontWeight: 600,
            fontSize: '0.8rem', letterSpacing: '0.08em', cursor: 'pointer', marginBottom: '-1px', transition: 'all 0.14s',
          }}>
            {t.toUpperCase().replace('-', ' ')}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="cyber-card" style={{ padding: 24 }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 14 }}>DECENTRALIZED IDENTIFIER (DID)</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--cyan)', wordBreak: 'break-all', lineHeight: 1.7, marginBottom: 12, padding: '10px 14px', background: 'var(--bg-deep)', borderRadius: 8 }}>
              {identity.did}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="cyber-btn" style={{ fontSize: '0.75rem', padding: '6px 12px' }} onClick={() => copy(identity.did, 'did')}>
                {copied === 'did' ? '✓ COPIED' : '⎘ COPY DID'}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
            {[
              { label: 'DID Method',     value: 'did:key',         color: 'var(--cyan)' },
              { label: 'Classical KEM',  value: 'X25519',          color: 'var(--green)' },
              { label: 'PQ KEM',         value: 'Kyber-768',       color: 'var(--purple)' },
              { label: 'Signature',      value: 'Ed25519',         color: 'var(--amber)' },
              { label: 'Symmetric',      value: 'XSalsa20',        color: 'var(--cyan)' },
              { label: 'MAC',            value: 'Poly1305',        color: 'var(--green)' },
            ].map(item => (
              <div key={item.label} className="cyber-card" style={{ padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: item.color, fontWeight: 600, letterSpacing: '0.04em' }}>{item.value}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>{item.label}</div>
              </div>
            ))}
          </div>

          <div className="cyber-card" style={{ padding: 22 }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 12 }}>STATUS</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge success">● ACTIVE</span>
              <span className="badge info">W3C DID CORE</span>
              <span className="badge purple">KYBER-768 PQC</span>
              <span className="badge success">TOTP 2FA</span>
              <span className="badge info">IPFS READY</span>
              <span className="badge purple">ED25519 SIGNING</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'keypairs' && (
        <div style={{ display: 'grid', gap: 16 }}>
          {[
            { label: 'X25519 Classical Key',     sub: 'ECDH key agreement — forward secrecy',              pub: identity.keyBundle?.classical?.publicKey, algo: 'X25519',    color: 'var(--cyan)' },
            { label: 'Kyber-768 Post-Quantum Key', sub: 'KEM — quantum-computer-resistant encapsulation',  pub: identity.keyBundle?.kyber?.publicKey,     algo: 'Kyber-768', color: 'var(--purple)' },
            { label: 'Ed25519 Signing Key',      sub: 'Digital signatures for messages and identity',      pub: identity.keyBundle?.signing?.publicKey,   algo: 'Ed25519',   color: 'var(--green)' },
          ].map(kp => (
            <div key={kp.label} className="cyber-card" style={{ padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.92rem', color: kp.color, letterSpacing: '0.06em', marginBottom: 3 }}>{kp.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{kp.sub}</div>
                </div>
                <span className="badge" style={{ background: 'transparent', color: kp.color, border: `1px solid ${kp.color}`, opacity: 0.85 }}>{kp.algo}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', wordBreak: 'break-all', lineHeight: 1.7, padding: '8px 12px', background: 'var(--bg-deep)', borderRadius: 6, marginBottom: 10 }}>
                PUBLIC: {kp.pub || '—'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 10 }}>
                Private key encrypted with your passphrase · never transmitted to any server
              </div>
              <button className="cyber-btn" style={{ fontSize: '0.72rem', padding: '5px 12px' }} onClick={() => copy(kp.pub, kp.algo)}>
                {copied === kp.algo ? '✓ COPIED' : '⎘ COPY PUBLIC KEY'}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'did-document' && (
        <div className="cyber-card" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 14 }}>W3C DID DOCUMENT (JSON-LD)</div>
          <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)', overflowX: 'auto', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 480, overflowY: 'auto' }}>
            {JSON.stringify(identity.didDocument, null, 2)}
          </pre>
          <button className="cyber-btn" style={{ marginTop: 14 }} onClick={() => copy(JSON.stringify(identity.didDocument, null, 2), 'doc')}>
            {copied === 'doc' ? '✓ COPIED' : '⎘ COPY DOCUMENT'}
          </button>
        </div>
      )}

      {tab === 'share' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="cyber-card" style={{ padding: 24 }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 14 }}>SHARE YOUR IDENTITY</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
              Share your DID with others so they can add you as a contact. They must paste your DID when adding a contact on their device.
            </p>
            <div style={{ padding: '14px', background: 'var(--bg-deep)', borderRadius: 8, border: '1px solid var(--cyan-border)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--cyan)', wordBreak: 'break-all', lineHeight: 1.7, marginBottom: 14 }}>
              {identity.did}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 6 }}>CLASSICAL PUBLIC KEY (X25519)</div>
              <div style={{ padding: '10px', background: 'var(--bg-deep)', borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', wordBreak: 'break-all', lineHeight: 1.6 }}>
                {identity.keyBundle?.classical?.publicKey}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 6 }}>KYBER-768 PUBLIC KEY</div>
              <div style={{ padding: '10px', background: 'var(--bg-deep)', borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', wordBreak: 'break-all', lineHeight: 1.6 }}>
                {identity.keyBundle?.kyber?.publicKey}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="cyber-btn primary" onClick={() => copy(identity.did, 'share-did')}>
                {copied === 'share-did' ? '✓ COPIED' : '⎘ COPY MY DID'}
              </button>
              <button className="cyber-btn" onClick={() => copy(JSON.stringify({ did: identity.did, alias: identity.alias, classicalPublicKey: identity.keyBundle?.classical?.publicKey, kyberPublicKey: identity.keyBundle?.kyber?.publicKey }), 'share-full')}>
                {copied === 'share-full' ? '✓ COPIED' : '⎘ COPY FULL CARD'}
              </button>
            </div>
          </div>
          <div style={{ padding: '12px 16px', background: 'var(--amber-glow)', border: '1px solid rgba(255,183,0,.3)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--amber)', lineHeight: 1.6 }}>
            ⚠ Only share your <strong>public keys</strong>. Your private keys are stored locally and never transmitted.
          </div>
        </div>
      )}
    </div>
  )
}
