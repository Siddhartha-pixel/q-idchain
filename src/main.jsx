import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store/index.js'
import Landing    from './pages/Landing.jsx'
import Auth       from './pages/Auth.jsx'
import Layout     from './components/Layout.jsx'
import Dashboard  from './pages/Dashboard.jsx'
import Messages   from './pages/Messages.jsx'
// removed import Groups
import Files      from './pages/Files.jsx'
import Wallet     from './pages/Wallet.jsx'
import Security   from './pages/Security.jsx'
import Analytics  from './pages/Analytics.jsx'
import Settings   from './pages/Settings.jsx'
import './styles/global.css'

function Guard({ children }) {
  const isAuthed = useStore(s => s.isAuthed)
  return isAuthed ? children : <Navigate to="/auth" replace />
}


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"    element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/app" element={<Guard><Layout /></Guard>}>
          <Route index           element={<Dashboard />} />
          <Route path="messages" element={<Messages />} />
          <Route path="files"    element={<Files />} />
          <Route path="wallet"   element={<Wallet />} />
          <Route path="security" element={<Security />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)
