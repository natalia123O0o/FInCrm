import { useState } from 'react';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function post(path, body) {
  const response = await fetch(`${API}${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'No se pudo completar la operación');
  return data;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setError(''); setMessage(''); setLoading(true);
    try {
      if (step === 1) {
        const data = await post('/api/auth/forgot-password', { email });
        setMessage(data.message); setStep(2);
      } else {
        const data = await post('/api/auth/reset-password', { email, code, newPassword });
        setMessage(data.message); setStep(3);
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#f8fafc',padding:24}}>
    <section style={{width:'100%',maxWidth:430,background:'#fff',padding:28,borderRadius:16,border:'1px solid #e2e8f0'}}>
      <h1>Recuperar contraseña</h1>
      {step < 3 && <form onSubmit={submit} style={{display:'grid',gap:14}}>
        <label>Correo de tu cuenta</label>
        <input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}
          readOnly={step===2} style={{padding:12}} />
        {step===2 && <>
          <label>Código de 6 dígitos recibido por correo</label>
          <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required value={code}
            onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} style={{padding:12}} />
          <label>Nueva contraseña (mínimo 10 caracteres)</label>
          <input type="password" autoComplete="new-password" minLength={10} required value={newPassword}
            onChange={e=>setNewPassword(e.target.value)} style={{padding:12}} />
        </>}
        <button type="submit" disabled={loading} style={{padding:13,background:'#f97316',border:0,borderRadius:8,fontWeight:700}}>
          {loading?'Procesando...':step===1?'Enviar código':'Restablecer contraseña'}
        </button>
      </form>}
      {message && <p role="status" style={{color:'#166534'}}>{message}</p>}
      {error && <p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
      <p><Link to="/login">Volver al inicio de sesión</Link></p>
    </section>
  </main>;
}
