import { jsPDF } from 'jspdf';
import { fmtCOP, STATUSES } from './quote.helpers.js';
export function downloadQuotePdf(quote) {
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const width=210;let y=20;
  const line=(t,fs=10,bold=false)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(fs);const rows=doc.splitTextToSize(String(t),175);for(const r of rows){if(y>272){doc.addPage();y=20;}doc.text(r,18,y);y+=fs*0.48;}y+=3;};
  doc.setFillColor(15,23,42);doc.rect(0,0,width,39,'F');doc.setTextColor(248,250,252);doc.setFont('helvetica','bold');doc.setFontSize(24);doc.text('FinCRM',18,23);doc.setFontSize(9);doc.setFont('helvetica','normal');doc.text('FinCotiza | Propuesta comercial',18,31);
  doc.setTextColor(15,23,42);y=53;
  line(quote.title,16,true);line(`Cotización ${quote.code} · Versión ${quote.revision} · ${STATUSES[quote.status]||quote.status}`,10);
  line(`Cliente: ${quote.clientId?.name||'—'}`);line(`Válida hasta: ${quote.validUntil}`);
  doc.setDrawColor(226,232,240);doc.line(18,y,192,y);y+=10;
  line('Detalle de productos y servicios',12,true);
  quote.lines.forEach((l,i)=>{
    line(`${i+1}. ${l.description} · ${l.quantity} x ${fmtCOP(l.unitPrice)} · descuento ${l.discountPct}% · impuesto ${l.taxRate}%`,9);
    line(`    Subtotal ${fmtCOP(l.net)}   Impuesto ${fmtCOP(l.tax)}   Total ${fmtCOP(l.total)}`,9);
  });
  doc.line(18,y,192,y);y+=9;
  line(`Subtotal (después de descuentos): ${fmtCOP(quote.net)}`,11,true);
  line(`Impuestos informativos: ${fmtCOP(quote.tax)}`,10);
  line(`TOTAL COTIZADO: ${fmtCOP(quote.total)}`,14,true);
  if(quote.notes){line('Condiciones y observaciones',11,true);line(quote.notes,9);}
  y+=5;line('Propuesta comercial: no es factura electrónica, recibo de pago ni comprobante tributario.',9);
  doc.save(`${quote.code}.pdf`);
}
