'use strict';
const MONEY_MAX = 1e12;
const isId = v => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);
const clean = v => typeof v === 'string' ? v.trim() : '';
const roundMoney = n => Math.round((n + Number.EPSILON) * 100) / 100;
function toNumber(value, name, min, max, integer = false) {
  if (value === '' || value === null || value === undefined || typeof value === 'boolean') throw new Error(`${name} es obligatorio.`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) throw new Error(`${name} debe ser un número válido entre ${min} y ${max}.`);
  return n;
}
function calculate(rawLines) {
  if (!Array.isArray(rawLines) || rawLines.length < 1 || rawLines.length > 40) throw new Error('Agrega entre 1 y 40 productos o servicios.');
  let sumNet=0, sumTax=0, sumCost=0, maxLineDiscount=0;
  const lines=rawLines.map((raw,i) => {
    if (!raw || typeof raw !== 'object') throw new Error(`Línea ${i+1} inválida.`);
    const kind = raw.kind;
    if (!['PRODUCT','SERVICE'].includes(kind)) throw new Error(`Selecciona el tipo de línea ${i+1}.`);
    const description = clean(raw.description);
    if (!description || description.length > 180) throw new Error(`Descripción inválida en línea ${i+1}.`);
    if (kind==='PRODUCT' && !isId(raw.productId)) throw new Error(`Selecciona un producto válido en línea ${i+1}.`);
    const quantity=toNumber(raw.quantity,'Cantidad',1,100000,true);
    const unitPrice=toNumber(raw.unitPrice,'Precio unitario',0,MONEY_MAX);
    const unitCost=toNumber(raw.unitCost,'Costo unitario',0,MONEY_MAX);
    const discountPct=toNumber(raw.discountPct,'Descuento',0,100);
    const taxRate=toNumber(raw.taxRate,'Impuesto',0,19);
    if (![0,5,19].includes(taxRate)) throw new Error('Las tasas permitidas en esta versión son 0, 5 o 19 %. Verifica qué tasa aplica.');
    const net=roundMoney(quantity * unitPrice * (1 - discountPct/100));
    const tax=roundMoney(net*taxRate/100);
    const cost=roundMoney(quantity*unitCost);
    const total=roundMoney(net+tax);
    if ([net,tax,cost,total].some(n => !Number.isFinite(n) || n>MONEY_MAX)) throw new Error('Importe de línea demasiado grande.');
    sumNet+=net;sumTax+=tax;sumCost+=cost;maxLineDiscount=Math.max(maxLineDiscount,discountPct);
    return {kind,productId:kind==='PRODUCT'?raw.productId:null,description,sku:clean(raw.sku).slice(0,50),quantity,unitPrice,unitCost,discountPct,taxRate,net,tax,total,cost};
  });
  const net=roundMoney(sumNet), tax=roundMoney(sumTax), cost=roundMoney(sumCost), total=roundMoney(net+tax);
  if (total <= 0 || total > MONEY_MAX || cost > MONEY_MAX) throw new Error('El total debe ser mayor que cero y dentro de los límites permitidos.');
  return {lines,net,tax,cost,total,marginPct:net>0?roundMoney((net-cost)/net*100):0,maxLineDiscount};
}
function businessToday() { return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
function parseDate(v) {
  if (typeof v!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error('La vigencia debe tener formato AAAA-MM-DD.');
  const d=new Date(`${v}T12:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0,10)!==v) throw new Error('Fecha de vigencia inválida.');
  if (v<businessToday()) throw new Error('La vigencia no puede ser anterior a hoy.');
  return v;
}
function assess(quote, policy, now=new Date()) {
  const flags=[];
  const day= new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const open=!['ACCEPTED','REJECTED'].includes(quote.status);
  const isExpired=open && quote.validUntil < day;
  if (isExpired) flags.push('La vigencia de la cotización terminó.');
  const sentAt=quote.sentAt?new Date(quote.sentAt):null;
  if (quote.status==='SENT' && sentAt && (now.getTime()-sentAt.getTime())/86400000 >= (policy.stalledDays ?? 5))
    flags.push(`Cotización enviada sin cierre durante ${policy.stalledDays} días o más. Registra un seguimiento.`);
  if (open && !isExpired && quote.validUntil <= new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now.getTime()+3*86400000))) flags.push('Cotización próxima a vencer.');
  if (quote.marginPct < policy.minimumMarginPct) flags.push(`Margen inferior al mínimo de ${policy.minimumMarginPct}%.`);
  if (quote.maxLineDiscount > policy.approvalDiscountPct) flags.push(`Descuento superior al umbral de ${policy.approvalDiscountPct}%.`);
  return { flags, expired: isExpired, level:flags.some(f=>f.includes('terminó') || f.includes('Margen inferior'))?'HIGH':flags.length?'MEDIUM':'LOW',
    indicator: quote.status==='ACCEPTED'?'Cerrada':quote.status==='REJECTED'?'Perdida':flags.length?'Requiere atención':'Seguimiento normal',
    disclaimer:'Indicador por reglas; no es una probabilidad estadística de cierre.' };
}
module.exports={isId,clean,calculate,parseDate,businessToday,assess};
