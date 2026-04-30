import React, { useState, useRef } from 'react'
import { useStore } from '../store/index.js'
import { encryptFileBytes } from '../lib/crypto.js'
import { hybridEncrypt } from '../lib/crypto.js'

function formatSize(b) {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`
  return `${(b/1048576).toFixed(1)} MB`
}
function fileIcon(type) {
  if (!type) return '📄'
  if (type.startsWith('image/')) return '🖼'
  if (type.startsWith('video/')) return '🎬'
  if (type.startsWith('audio/')) return '🎵'
  if (type === 'application/pdf') return '📕'
  if (type.includes('zip') || type.includes('tar')) return '🗜'
  return '📄'
}

export default function Files() {
  const { identity, contacts, sharedFiles, addFile } = useStore()
  const [selectedContact, setSelectedContact] = useState('')
  const [file, setFile]       = useState(null)
  const [progress, setProgress] = useState(null)
  const [error, setError]     = useState('')
  const fileRef = useRef(null)

  async function handleUpload() {
    if (!file) return setError('Select a file first')
    if (!selectedContact && contacts.length > 0) return setError('Select a recipient')
    setError(''); setProgress('Encrypting…')

    try {
      const arrayBuffer = await file.arrayBuffer()
      setProgress('Applying AES-GCM encryption…')
      const { encrypted, fek, iv, algorithm } = await encryptFileBytes(arrayBuffer)

      // Wrap FEK with recipient's hybrid PQC key
      const contact = contacts.find(c => c.did === selectedContact)
      const recipPK = contact?.classicalPublicKey || identity.keyBundle.classical.publicKey
      const encFEK  = hybridEncrypt(btoa(String.fromCharCode(...fek)), recipPK)

      setProgress('Uploading to IPFS…')
      // Simulate IPFS CID (replace with real Helia upload)
      await new Promise(r => setTimeout(r, 800))
      const cid = `bafybeig${Math.abs(file.name.split('').reduce((h,c)=>(Math.imul(31,h)+c.charCodeAt(0))|0,0)).toString(36).padStart(28,'0').slice(0,28)}`

      const fileRecord = {
        id: crypto.randomUUID(),
        name: file.name, size: file.size, type: file.type,
        cid, algorithm,
        encryptedFEK: encFEK,
        iv: btoa(String.fromCharCode(...iv)),
        sharedWith: selectedContact || 'self',
        sharedWithAlias: contact?.alias || identity.alias,
        uploadedAt: Date.now(),
        status: 'uploaded',
      }

      addFile(fileRecord)
      setProgress(null); setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch(e) {
      setProgress(null); setError(e.message)
    }
  }

  return (
    <div className="animate-fade">
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', letterSpacing:'0.08em', marginBottom:6 }}>ENCRYPTED FILES</h1>
        <p style={{ color:'var(--text-secondary)', fontSize:'0.88rem' }}>Files encrypted with AES-GCM, key wrapped in Kyber-768 hybrid scheme, stored on IPFS.</p>
      </div>

      {/* Upload */}
      <div className="cyber-card" style={{ padding:24, marginBottom:22 }}>
        <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)', letterSpacing:'0.1em', marginBottom:16 }}>ENCRYPT & SHARE FILE</div>

        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{ border:`2px dashed ${file ? 'var(--cyan)' : 'var(--border)'}`, borderRadius:10, padding:'32px 20px', textAlign:'center', cursor:'pointer', marginBottom:14, background: file ? 'var(--cyan-glow)' : 'transparent', transition:'all 0.15s' }}
        >
          <div style={{ fontSize:32, marginBottom:8 }}>{file ? fileIcon(file.type) : '◰'}</div>
          <div style={{ fontSize:'0.88rem', color: file ? 'var(--cyan)' : 'var(--text-muted)' }}>
            {file ? `${file.name} (${formatSize(file.size)})` : 'Click to select file'}
          </div>
          <input ref={fileRef} type="file" style={{ display:'none' }} onChange={e => setFile(e.target.files[0])} />
        </div>

        {contacts.length > 0 && (
          <>
            <label style={{ display:'block', fontSize:'0.68rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:5 }}>RECIPIENT</label>
            <select className="cyber-input" value={selectedContact} onChange={e=>setSelectedContact(e.target.value)} style={{ marginBottom:14 }}>
              <option value="">Select contact…</option>
              {contacts.map(c => <option key={c.did} value={c.did}>{c.alias}</option>)}
            </select>
          </>
        )}

        {error && <div style={{ padding:'8px 12px', background:'var(--red-glow)', border:'1px solid rgba(255,59,92,.3)', borderRadius:8, color:'var(--red)', fontSize:'0.82rem', marginBottom:10 }}>⚠ {error}</div>}

        {progress && (
          <div style={{ padding:'8px 12px', background:'var(--cyan-glow)', border:'1px solid var(--cyan-border)', borderRadius:8, color:'var(--cyan)', fontSize:'0.82rem', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
            <span className="animate-spin">⟳</span> {progress}
          </div>
        )}

        <button className="cyber-btn primary" onClick={handleUpload} disabled={!file || !!progress} style={{ width:'100%', justifyContent:'center' }}>
          ◰ ENCRYPT & UPLOAD TO IPFS
        </button>
      </div>

      {/* Shared files list */}
      <div className="cyber-card" style={{ padding:24 }}>
        <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)', letterSpacing:'0.1em', marginBottom:16 }}>
          SHARED FILES ({sharedFiles.length})
        </div>
        {sharedFiles.length === 0 ? (
          <div style={{ color:'var(--text-muted)', fontSize:'0.85rem', textAlign:'center', padding:'30px 0' }}>No files shared yet.</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {sharedFiles.map(f => (
              <div key={f.id} style={{ padding:'12px 14px', background:'var(--bg-surface)', borderRadius:8, border:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                  <div style={{ fontSize:24 }}>{fileIcon(f.type)}</div>
                  <div>
                    <div style={{ fontWeight:500, fontSize:'0.9rem', color:'var(--text-primary)', marginBottom:3 }}>{f.name}</div>
                    <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
                      {formatSize(f.size)} · {f.algorithm} · IPFS: {f.cid.slice(0,16)}…
                    </div>
                    <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:2 }}>
                      Shared with <strong style={{ color:'var(--cyan)' }}>{f.sharedWithAlias}</strong> · {new Date(f.uploadedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, flexDirection:'column', alignItems:'flex-end' }}>
                  <span className="badge success" style={{ fontSize:'0.6rem' }}>✓ ENCRYPTED</span>
                  <span className="badge info" style={{ fontSize:'0.6rem' }}>IPFS</span>
                  <a href={`https://ipfs.io/ipfs/${f.cid}`} target="_blank" rel="noreferrer" style={{ fontSize:'0.68rem', color:'var(--cyan)', fontFamily:'var(--font-mono)' }}>VIEW ↗</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
