import React, { useState } from 'react'
import { useStore } from '../store/index.js'
import { setupTOTP, verifyTOTP } from '../lib/identity.js'

export default function Settings() {
  const { identity, settings, updateSettings, totpSecret, setIdentity, backupCodes } = useStore()
  const [tab, setTab]             = useState('general')
  const [totpSetup, setTotpSetup] = useState(null)
  const [totpToken, setTotpToken] = useState('')
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState('')
  const [error, setError]         = useState('')

  function ok(msg)  { setSuccess(msg); setTimeout(() => setSuccess(''), 2500) }
  function err(msg) { setError(msg);   setTimeout(() => setError(''), 3000) }

  async function regenerateTOTP() {
    setLoading(true)
    const t = await setupTOTP(identity.did, identity.alias)
    setTotpSetup(t); setLoading(false)
  }

  async function confirmTOTP() {
    if (!await verifyTOTP(totpToken, totpSetup.secret)) return err('Invalid code')
    setIdentity(identity, totpSetup.secret, backupCodes)
    setTotpSetup(null); setTotpToken(''); ok('TOTP 2FA updated successfully')
  }

  function toggle(key) {
    updateSettings({ [key]: !settings[key] })
    ok(`${key} ${!settings[key] ? 'enabled' : 'disabled'}`)
  }

  const tabs = ['general', 'totp-2fa', 'encryption', 'server']

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.08em', marginBottom: 6 }}>SETTINGS</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Configure your security, 2FA, and network preferences</p>
      </div>

      {success && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, background: 'var(--green-glow)', border: '1px solid rgba(0,255,136,.3)', color: 'var(--green)', fontSize: '0.85rem' }}>✓ {success}</div>}
      {error   && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, background: 'var(--red-glow)', border: '1px solid rgba(255,59,92,.3)', color: 'var(--red)', fontSize: '0.85rem' }}>⚠ {error}</div>}

      <div style={{ display: 'flex', gap: 4, marginBottom: 22, borderBottom: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: 'transparent', border: 'none', borderBottom: tab === t ? '2px solid var(--cyan)' : '2px solid transparent', color: tab === t ? 'var(--cyan)' : 'var(--text-muted)', padding: '8px 13px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.08em', cursor: 'pointer', marginBottom: '-1px' }}>
            {t.toUpperCase().replace('-', ' ')}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div style={{ display: 'grid', gap: 14 }}>
          {[
            { key: 'notifications',   label: 'Push Notifications',        desc: 'Notify on new messages and security events' },
            { key: 'showEncDetails',  label: 'Show Encryption Details',   desc: 'Show algorithm info and IPFS CID on messages' },
          ].map(s => (
            <div key={s.key} className="cyber-card" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.88rem', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.desc}</div>
              </div>
              <button onClick={() => toggle(s.key)} style={{ width: 44, height: 22, borderRadius: 11, background: settings[s.key] ? 'var(--cyan)' : 'var(--bg-surface)', border: `1px solid ${settings[s.key] ? 'var(--cyan)' : 'var(--border)'}`, cursor: 'pointer', position: 'relative', transition: 'all 0.18s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 3, left: settings[s.key] ? 22 : 3, width: 14, height: 14, borderRadius: '50%', background: settings[s.key] ? '#000' : 'var(--text-muted)', transition: 'left 0.18s' }} />
              </button>
            </div>
          ))}

          <div className="cyber-card" style={{ padding: '14px 20px' }}>
            <div style={{ fontWeight: 500, fontSize: '0.88rem', marginBottom: 3 }}>Auto-Delete Messages</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10 }}>Delete messages from local storage after duration</div>
            <select className="cyber-input" value={settings.disappearAfter || ''} onChange={e => updateSettings({ disappearAfter: e.target.value || null })}>
              <option value="">Never</option>
              <option value="3600000">1 Hour</option>
              <option value="86400000">24 Hours</option>
              <option value="604800000">7 Days</option>
            </select>
          </div>
        </div>
      )}

      {tab === 'totp-2fa' && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="cyber-card" style={{ padding: 24 }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 14 }}>GOOGLE AUTHENTICATOR (TOTP)</div>
            <div style={{ padding: '10px 14px', background: totpSecret ? 'var(--green-glow)' : 'var(--amber-glow)', border: `1px solid ${totpSecret ? 'rgba(0,255,136,.3)' : 'rgba(255,183,0,.3)'}`, borderRadius: 8, fontSize: '0.82rem', color: totpSecret ? 'var(--green)' : 'var(--amber)', marginBottom: 16 }}>
              {totpSecret ? '✓ TOTP 2FA is active — Google Authenticator configured' : '⚠ TOTP not configured — add it below'}
            </div>
            {!totpSetup ? (
              <button className="cyber-btn primary" onClick={regenerateTOTP} disabled={loading}>
                {loading ? <span className="animate-spin">⟳</span> : '⚙ SETUP / RECONFIGURE TOTP'}
              </button>
            ) : (
              <>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>Scan with Google Authenticator:</p>
                <div style={{ textAlign: 'center', marginBottom: 12, background: 'var(--bg-deep)', borderRadius: 8, padding: 14 }}>
                  <img src={totpSetup.qrDataUrl} alt="QR" style={{ width: 170, height: 170 }} />
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)', wordBreak: 'break-all', padding: '8px 10px', background: 'var(--bg-deep)', borderRadius: 6, marginBottom: 12 }}>
                  {totpSetup.secret}
                </div>
                <input className="cyber-input" placeholder="Enter 6-digit code" maxLength={6} value={totpToken} onChange={e => setTotpToken(e.target.value.replace(/\D/g,''))} style={{ marginBottom: 10, letterSpacing: '0.3em', textAlign: 'center' }} />
                <button className="cyber-btn primary" onClick={confirmTOTP}>VERIFY & SAVE</button>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'encryption' && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="cyber-card" style={{ padding: 24 }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 14 }}>POST-QUANTUM ALGORITHM</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {['Kyber-768', 'Kyber-512', 'Kyber-1024'].map(alg => (
                <button key={alg} onClick={() => { updateSettings({ quantumAlgorithm: alg }); ok(`Algorithm set to ${alg}`) }} className="cyber-btn" style={{ borderColor: settings.quantumAlgorithm === alg ? 'var(--cyan)' : 'var(--border)', background: settings.quantumAlgorithm === alg ? 'var(--cyan-glow)' : 'transparent', color: settings.quantumAlgorithm === alg ? 'var(--cyan)' : 'var(--text-muted)', fontSize: '0.8rem', padding: '7px 14px' }}>
                  {alg}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Kyber-768 → NIST security level 3 (AES-192 equivalent). Kyber-1024 → NIST level 5 (highest). All combined with X25519 for hybrid security — quantum-safe even if X25519 is broken.
            </p>
          </div>
        </div>
      )}

      {tab === 'server' && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="cyber-card" style={{ padding: 24 }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 14 }}>SIGNALING SERVER</div>
            <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 5 }}>SERVER URL</label>
            <input className="cyber-input" defaultValue={import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'} style={{ marginBottom: 10 }} />
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 14 }}>
              The signaling server relays <strong>encrypted blobs only</strong>. It never sees your plaintext messages, private keys, or passphrase. You can self-host it (see server/signaling.js).
            </p>
            <div style={{ padding: '10px 14px', background: 'var(--cyan-glow)', border: '1px solid var(--cyan-border)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--cyan)', lineHeight: 1.6 }}>
              ⬡ Server is a zero-knowledge relay — deploy your own instance for maximum privacy.
            </div>
          </div>

          <div className="cyber-card" style={{ padding: 24 }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 14 }}>IPFS GATEWAY</div>
            <input className="cyber-input" defaultValue="https://ipfs.io" style={{ marginBottom: 10 }} />
            <input className="cyber-input" type="password" placeholder="Pinata API Key (optional)" style={{ marginBottom: 8 }} />
            <input className="cyber-input" type="password" placeholder="Pinata Secret Key (optional)" style={{ marginBottom: 14 }} />
            <button className="cyber-btn primary" onClick={() => ok('IPFS config saved')}>SAVE CONFIG</button>
          </div>
        </div>
      )}
    </div>
  )
}
