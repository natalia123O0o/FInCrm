import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export default function VerifyMyEmailPage() {
  const { token, user } = useAuth();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function request(path, payload={}) {
    setBusy(true);setMessage('');
    try {
      const res = await fetch(`${API}${path}`, { method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify(payload), });
      const data = await res.json().catch(()=>({}));
      setMessage(data.message || 'No se pudo realizar la operación');
    } catch { setMessage('No se pudo conectar al servidor.'); }
    finally { setBusy(false); }
  }
  return <main style={{padding:28,maxWidth:480,margin:'auto'}}>
    <h1>Verificar mi correo</h1><p>Cuenta: {user?.email}</p>
    <button disabled={busy} onClick={()=>request('/api/auth/email/send-code')}>Enviar código</button>
    <div style={{display:'grid',gap:12,marginTop:16}}>
      <label>Código recibido</label>
      <input inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={code}
        onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} />
      <button disabled={busy||code.length!==6} onClick={()=>request('/api/auth/email/verify',{code})}>Verificar</button>
    </div><p role="status">{message}</p>
  </main>;
}
