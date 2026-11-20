import { useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export default function ClientEmailVerificationPage() {
  const [clientId, setClientId] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault(); setLoading(true); setError(''); setMessage('');
    try {
      const response = await fetch(`${API}/api/verification/clients/confirm`, {
        method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({clientId,email,code}),
      });
      const data = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(data.message||'No se pudo verificar');
      setMessage(data.message);
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  }
  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#f8fafc',padding:24}}>
    <form onSubmit={submit} style={{display:'grid',gap:12,width:'100%',maxWidth:430,background:'white',padding:28,borderRadius:16}}>
      <h1>Confirmar correo</h1>
      <p>Solicita a la empresa el identificador de tu ficha y revisa el código recibido por correo.</p>
      <label>Identificador del cliente</label>
      <input value={clientId} required onChange={e=>setClientId(e.target.value.trim())} style={{padding:12}} />
      <label>Correo registrado</label>
      <input type="email" value={email} required onChange={e=>setEmail(e.target.value)} style={{padding:12}} />
      <label>Código de 6 dígitos</label>
      <input inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={code} required
        onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} style={{padding:12}} />
      <button type="submit" disabled={loading} style={{background:'#f97316',border:0,padding:13,borderRadius:8,fontWeight:700}}>
        {loading?'Verificando...':'Confirmar correo'}
      </button>
      {message && <p role="status" style={{color:'#166534'}}>{message}</p>}
      {error && <p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
      <small>Confirmar el correo no autoriza a recibir promociones.</small>
    </form>
  </main>;
}
