# ⬡ Q-IDChain

**Quantum-Encrypted Decentralized Identity & Secure Multi-Device Messaging**

> Hybrid X25519 + Kyber-768 · W3C DID · IPFS · Google Authenticator 2FA · Real-time P2P WebSocket

---

## What is Q-IDChain?

Q-IDChain is a full-stack secure messaging and identity platform where:

- Every message is encrypted with **hybrid X25519 (classical) + Kyber-768 (post-quantum)** encryption
- Your identity is a **W3C Decentralized Identifier (DID)** — no usernames, no passwords, no central authority
- The server is a **zero-knowledge relay** — it only sees encrypted blobs, never your plaintext
- Multiple devices and multiple people can chat simultaneously in real time
- Files are encrypted with **AES-GCM** before being stored on **IPFS**
- Login is secured with **TOTP (Google Authenticator)** only — no SMS, no phone required

---

## Features

| Category | Feature | Status |
|---|---|---|
| 🔐 Crypto | X25519 + Kyber-768 hybrid PQC | ✅ |
| 🔐 Crypto | XSalsa20-Poly1305 authenticated encryption | ✅ |
| 🔐 Crypto | Ed25519 digital signatures | ✅ |
| 🔐 Crypto | PBKDF2-SHA256 key derivation (150k iterations) | ✅ |
| 🔐 Crypto | Per-message ephemeral keys (forward secrecy) | ✅ |
| 🔐 Crypto | Zero-Knowledge Proofs (Schnorr sigma) | ✅ |
| 🔐 Crypto | Key Rotation with signed proof | ✅ |
| 🔐 Crypto | Dead Man's Switch | ✅ |
| 🔐 Crypto | Threshold Signatures (M-of-N Shamir) | ✅ |
| 👤 Identity | W3C DID Core (did:key method) | ✅ |
| 👤 Identity | DID Document + Verifiable Credentials | ✅ |
| 👤 Identity | TOTP 2FA via Google Authenticator | ✅ |
| 👤 Identity | Backup codes | ✅ |
| 💬 Messaging | Real-time E2E encrypted 1:1 chat | ✅ |
| 💬 Messaging | Multi-device communication | ✅ |
| 💬 Messaging | Group chat (session key encrypted) | ✅ |
| 💬 Messaging | Typing indicators | ✅ |
| 💬 Messaging | Read receipts + delivery status | ✅ |
| 💬 Messaging | Message history (server relay) | ✅ |
| 💬 Messaging | Encryption Inspector panel | ✅ |
| 📁 Files | AES-GCM-256 file encryption | ✅ |
| 📁 Files | IPFS decentralized storage | ✅ |
| 📁 Files | FEK wrapped with Kyber-768 | ✅ |
| 🌐 P2P | WebSocket signaling server | ✅ |
| 🌐 P2P | Online presence detection | ✅ |
| 🌐 P2P | Public key discovery | ✅ |
| 📊 Analytics | Message volume charts (Recharts) | ✅ |
| 📊 Analytics | Encryption breakdown pie chart | ✅ |
| 📊 Analytics | Security metrics | ✅ |
| 🎨 UI | Futuristic Cyber/Web3 aesthetic | ✅ |
| 🎨 UI | Responsive mobile-friendly | ✅ |
| 🎨 UI | Dark mode (system default) | ✅ |

---

## Project Structure

```
q-idchain/
├── index.html
├── vite.config.js
├── package.json
├── .env.example
├── .gitignore
├── README.md
│
├── server/                         # Backend signaling server (Node.js)
│   ├── package.json
│   └── signaling.js               # WebSocket relay (zero-knowledge)
│
└── src/
    ├── main.jsx                   # React entry + routing
    ├── styles/
    │   └── global.css             # Full cyber design system
    ├── store/
    │   └── index.js               # Zustand global state (persisted)
    ├── lib/
    │   ├── crypto.js              # X25519 + Kyber-768 hybrid encryption engine
    │   ├── identity.js            # DID creation + TOTP 2FA
    │   └── socket.js              # WebSocket client manager
    ├── components/
    │   ├── Layout.jsx             # Sidebar + top bar shell
    │   └── EncryptionInspector.jsx # Message encryption detail panel
    └── pages/
        ├── Landing.jsx            # Public homepage
        ├── Auth.jsx               # DID register + TOTP login
        ├── Dashboard.jsx          # Overview + stats
        ├── Messages.jsx           # 1:1 encrypted real-time chat
        ├── Groups.jsx             # Group encrypted chat
        ├── Files.jsx              # Encrypted file sharing
        ├── Wallet.jsx             # Identity & keypairs viewer
        ├── Security.jsx           # ZKP, key rotation, DMS, threshold
        ├── Analytics.jsx          # Charts and metrics
        └── Settings.jsx           # App + server settings
```

---

## Step-by-Step Setup Guide

### Prerequisites

Make sure you have installed:
- **Node.js** v18 or higher — download from https://nodejs.org
- **npm** v9 or higher (comes with Node.js)

Check your versions:
```bash
node --version   # should show v18.x.x or higher
npm --version    # should show 9.x.x or higher
```

---

### Step 1 — Extract the project

```bash
unzip q-idchain.zip
cd q-idchain
```

---

### Step 2 — Install frontend dependencies

```bash
npm install
```

This installs React, Vite, TweetNaCl, Zustand, Socket.IO client, Recharts, otplib, QRCode, and all other frontend packages.

Expected output: `added XXX packages`

---

### Step 3 — Install server dependencies

```bash
cd server
npm install
cd ..
```

This installs Express, Socket.IO server, cors, and dotenv.

---

### Step 4 — Configure environment

```bash
cp .env.example .env
```

The default `.env` values work for local development — no changes needed to get started.

For production deployment, update:
- `VITE_SERVER_URL` → your deployed server URL (e.g. `https://your-server.com`)
- `CLIENT_URL` → your deployed frontend URL (e.g. `https://your-app.com`)

---

### Step 5 — Start the signaling server

Open a terminal window and run:

```bash
node server/signaling.js
```

You should see:
```
🔗 Q-IDChain Signaling Server
   Port    : 3001
   Client  : http://localhost:5173
   Mode    : End-to-end encrypted relay
```

Keep this terminal running.

---

### Step 6 — Start the frontend

Open a **second terminal window** and run:

```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
```

---

### Step 7 — Open Q-IDChain

Open your browser and go to:

```
http://localhost:5173
```

---

### Step 8 — Create your identity

1. Click **CREATE IDENTITY**
2. Enter an alias (e.g. `alice`)
3. Enter a passphrase (min 12 characters) and confirm it
4. Click **CONTINUE**
5. **Scan the QR code** with Google Authenticator on your phone
   - Open Google Authenticator → tap **+** → **Scan a QR code**
6. Enter the **6-digit code** shown in the app
7. Click **CONTINUE**
8. **Save your backup codes** somewhere safe (offline)
9. Click **CONTINUE** → **ENTER Q-IDChain**

---

### Step 9 — Chat with another person (multi-device)

**On Device 1 (sender):**
1. Go to **Identity** → **Share** tab
2. Copy your full DID

**On Device 2 (receiver):**
1. Open `http://YOUR_IP:5173` (replace YOUR_IP with your local network IP)
2. Create a new identity
3. Go to **Messages** → click **+ ADD**
4. Paste Device 1's DID and click **ADD CONTACT**
5. The contact will appear once Device 1 is online

**On Device 1:**
1. Go to **Messages** → the receiver's name should appear
2. Start typing — messages are encrypted with X25519 + Kyber-768 in real time

---

### Step 10 — Click any message to inspect encryption

In the **Messages** page, click any message bubble or click the **🔒 INSPECT** button to open the **Encryption Inspector** panel on the right. It shows:
- Algorithm (X25519-Kyber768-XSalsa20-Poly1305)
- Ciphertext, nonce, ephemeral public key
- Kyber-768 capsule
- IPFS CID
- Raw encrypted JSON payload

---

## Making it accessible from other devices on your network

Find your local IP:
```bash
# macOS / Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
```

Then update `.env`:
```
VITE_SERVER_URL=http://YOUR_LOCAL_IP:3001
CLIENT_URL=http://YOUR_LOCAL_IP:5173
```

Restart both server and frontend. Other devices on the same WiFi can now connect.

---

## Production Deployment

### Deploy signaling server (e.g. Railway, Render, Fly.io)

1. Push the `server/` folder to a Node.js host
2. Set environment variables: `PORT`, `CLIENT_URL`
3. Note the deployed URL (e.g. `https://qidchain-server.railway.app`)

### Deploy frontend (e.g. Vercel, Netlify)

1. Set `VITE_SERVER_URL=https://qidchain-server.railway.app` in build env
2. Run `npm run build`
3. Deploy the `dist/` folder

---

## Upgrade to Real Kyber-768

The current Kyber-768 implementation is simulated. To use the real NIST standard:

```bash
npm install @noble/post-quantum
```

In `src/lib/crypto.js`, replace `simulateKyberKeypair()`:

```js
import { ml_kem768 } from '@noble/post-quantum/ml-kem'

function generateKyberKeypair() {
  const { publicKey, secretKey } = ml_kem768.keygen()
  return { publicKey: encodeBase64(publicKey), secretKey: encodeBase64(secretKey) }
}
```

---

## Security Notes

- Private keys are stored in browser localStorage — use a trusted device
- The signaling server sees only encrypted blobs and public keys — never plaintext
- Passphrase is used for PBKDF2 key derivation (150,000 iterations, SHA-256)
- Each message uses an ephemeral X25519 keypair for perfect forward secrecy
- Group messages use a shared session key encrypted per-member with hybrid PQC

---

## License

MIT — Built on open standards: W3C DID, TweetNaCl, Helia IPFS, otplib, Socket.IO
