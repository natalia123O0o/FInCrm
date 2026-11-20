const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
async function request(token,path,{method='GET',body}={}) {
  let response;
  try {
    response=await fetch(`${BASE}/api/quotes${path}`,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  } catch {throw new Error('No se puede conectar con el backend de FinCRM.');}
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.message || `Error HTTP ${response.status}`);
  return data;
}
export const quotesApi={
  list:t=>request(t,'/').then(d=>d.quotes||[]),
  detail:(t,id)=>request(t,`/${id}`).then(d=>d.quote),
  options:t=>request(t,'/options'),
  create:(t,b)=>request(t,'/',{method:'POST',body:b}),
  update:(t,id,b)=>request(t,`/${id}`,{method:'PUT',body:b}),
  transition:(t,id,action,note='')=>request(t,`/${id}/transition`,{method:'POST',body:{action,note}}),
  recommend:(t,id)=>request(t,`/${id}/recommend`,{method:'POST'}),
  policy:(t,b)=>request(t,'/policy',{method:'PUT',body:b})
};
export async function listResource(token,url,key){
  let response;
  try{response=await fetch(`${BASE}${url}`,{headers:{Authorization:`Bearer ${token}`}});}
  catch{throw new Error(`No se pudo consultar ${url}.`);}
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!Array.isArray(data[key]))throw new Error(data.message||`Respuesta inválida de ${url}.`);
  return data[key];
}
