import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext.jsx';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export default function AdminClientVerificationPage() {
  const { token } = useAuth();
  const [clients,setClients] = useState([]);
  const [id,setId] = useState('');
  const [status,setStatus] = useState('');
  const [loading,setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(`${API}/api/clients`, { headers:{Authorization:`Bearer ${token}`} })
      .then(async r => { const d=await r.json(); if (!r.ok) throw new Error(d.message); return d; })
      .then(d=>{ if(active) setClients(d.clients||[]); })
      .catch(e=>{if(active) setStatus(e.message||'No se pudieron cargar clientes');});
    return ()=>{active=false;};
  }, [token]);
  async function send() {
    setLoading(true);setStatus('');
    try {
      const r=await fetch(`${API}/api/verification/clients/${id}/send`, {method:'POST',headers:{Authorization:`Bearer ${token}`}});
      const d=await r.json();
      setStatus(d.message||'Respuesta no disponible');
    } catch {setStatus('Error de conexión');}
    finally {setLoading(false);}
  }
  const client = clients.find(c=>c._id===id);
  return <main style={{maxWidth:620,padding:24,margin:'0 auto'}}>
    <h1>Verificar correo de cliente</h1>
    <p>Selecciona un cliente y envíale un código para confirmar que controla su correo.</p>
    <label htmlFor="client-verify">Cliente</label>
    <select id="client-verify" value={id} onChange={e=>{setId(e.target.value);setStatus('');}}
      style={{display:'block',width:'100%',padding:12,margin:'12px 0'}}>
      <option value="">Selecciona un cliente</option>
      {clients.map(c=><option value={c._id} key={c._id}>{c.name} — {c.email||'Sin correo'}</option>)}
    </select>
    {client && <p>Estado: {client.emailVerifiedAt?'Verificado':'Sin verificar'}</p>}
    <button type="button" disabled={!id||loading||!client?.email||Boolean(client?.emailVerifiedAt)}
      onClick={send} style={{background:'#f97316',border:0,borderRadius:8,padding:12,fontWeight:700}}>
      {loading?'Enviando...':'Enviar código al cliente'}
    </button>
    <p role="status">{status}</p>
    {client && <p>El cliente necesita el identificador <code>{client._id}</code> para confirmar el código.</p>}
    <p><Link to="/verificar-cliente">Abrir página pública de confirmación</Link></p>
  </main>;
}
