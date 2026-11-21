// No simular el envío: solo se confirma éxito si el backend lo confirma.
const BASE=(import.meta.env.VITE_API_URL||'').replace(/\/$/,'') || (import.meta.env.DEV?'http://localhost:4000':'');
export async function sendContact(data){
  let response;
  try{response=await fetch(`${BASE}/api/contact`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),
  });}catch{throw new Error('No fue posible conectar con FinCRM. Revisa tu conexión e inténtalo de nuevo.');}
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.ok)throw new Error(result.message||'No se pudo enviar tu solicitud en este momento.');
  return result;
}
