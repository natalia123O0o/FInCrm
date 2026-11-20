export const STATUSES={DRAFT:'Borrador',PENDING_APPROVAL:'Pendiente de aprobación',APPROVED:'Aprobada',SENT:'Enviada',ACCEPTED:'Aceptada',REJECTED:'Rechazada'};
export const COLORS={DRAFT:'neutral',PENDING_APPROVAL:'warning',APPROVED:'info',SENT:'info',ACCEPTED:'success',REJECTED:'danger'};
export const ACTIONS={submit:'Solicitar aprobación',approve:'Aprobar',send:'Marcar como enviada',accept:'Registrar aceptación',reject:'Registrar rechazo',revise:'Crear revisión'};
export const fmtCOP=n=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:2}).format(Number(n)||0);
export const fmtDate=s=>s?new Date(s).toLocaleDateString('es-CO',{year:'numeric',month:'short',day:'numeric'}):'—';
export function localDatePlus(days=7){const d=new Date();d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export const emptyLine=()=>({kind:'SERVICE',productId:'',description:'',quantity:1,unitPrice:'',unitCost:'',discountPct:0,taxRate:0});
export const emptyQuote=()=>({title:'',notes:'',clientId:'',opportunityId:'',assignedTo:'',validUntil:localDatePlus(7),lines:[emptyLine()]});
export function previewTotals(lines){
 let net=0,tax=0,cost=0;
 for(const x of lines){const n=(Number(x.quantity)||0)*(Number(x.unitPrice)||0)*(1-(Number(x.discountPct)||0)/100);net+=n;tax+=n*(Number(x.taxRate)||0)/100;cost+=(Number(x.quantity)||0)*(Number(x.unitCost)||0);}
 return{net,tax,cost,total:net+tax,marginPct:net>0?(net-cost)/net*100:0};
}
