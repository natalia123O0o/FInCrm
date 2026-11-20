import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/context/AuthContext.jsx';
import {
  Package, ShoppingCart, History, UploadCloud, Wallet,
  Plus, Save, Search, RefreshCw, AlertTriangle, Printer, X, Check,
} from 'lucide-react';
import './PosPage.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const money = value => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value || 0));
const fmtDate = value => value ? new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota', year: 'numeric', month: 'short', day: '2-digit',
  hour: '2-digit', minute: '2-digit',
}).format(new Date(value)) : '—';
const methods = { CASH: 'Efectivo', TRANSFER: 'Transferencia', CARD: 'Tarjeta', OTHER: 'Otro' };
const emptyForm = { name: '', sku: '', category: 'General', price: '', stock: '0', minStock: '3', isActive: true };
const dateInColombia = () => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota',
    year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const v = type => parts.find(x => x.type === type).value;
  return `${v('year')}-${v('month')}-${v('day')}`;
};
const escapeHtml = str => String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function downloadExample(kind) {
  const content = kind === 'products'
    ? 'sku,nombre,categoria,precio,existencias,minimo\nANI-001,Anillo plata,Joyeria,45000,5,2\nCAD-001,Cadena dorada,Joyeria,78000,3,1\n'
    : 'referenciaVenta,fechaVenta,sku,cantidad,precioUnitario,medioPago\nVENTA-2026-001,2026-11-17,ANI-001,2,45000,EFECTIVO\nVENTA-2026-002,2026-11-18,CAD-001,1,78000,TRANSFERENCIA\n';
  const blob = new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = kind === 'products' ? 'plantilla_productos_finpos.csv' : 'plantilla_ventas_historicas_finpos.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
function printReceipt(sale) {
  if (!sale) return;
  const popup = window.open('', '_blank', 'width=500,height=750');
  if (!popup) return;
  const content = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Comprobante FinPOS</title>
    <style>body{font-family:Arial,sans-serif;max-width:380px;margin:30px auto;color:#0f172a}h1{font-size:24px}small{color:#64748b}table{width:100%;border-collapse:collapse}td,th{padding:8px 4px;text-align:left;border-bottom:1px solid #ddd}h2{margin-top:18px}.total{text-align:right;font-size:22px;font-weight:bold}</style></head>
    <body><h1>Fin<span style="color:#f97316">POS</span></h1><small>Comprobante comercial. No es factura electrónica DIAN.</small>
    <p><strong>Referencia:</strong> ${escapeHtml(sale.externalRef || sale._id)}</p>
    <p><strong>Fecha de venta:</strong> ${escapeHtml(fmtDate(sale.soldAt || sale.createdAt))}</p>
    <p><strong>Pago:</strong> ${escapeHtml(methods[sale.paymentMethod] || sale.paymentMethod)}</p>
    <table><thead><tr><th>Producto</th><th>Cant.</th><th>Subtotal</th></tr></thead><tbody>
    ${sale.lines.map(l => `<tr><td>${escapeHtml(l.name)}</td><td>${Number(l.quantity)}</td><td>${escapeHtml(money(l.subtotal))}</td></tr>`).join('')}
    </tbody></table><p class="total">Total: ${escapeHtml(money(sale.total))}</p><p>Gracias por tu compra.</p></body></html>`;
  popup.document.write(content);
  popup.document.close();
  popup.focus();
  popup.print();
}

export default function PosPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [tab, setTab] = useState('products');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const refresh = () => setReload(v => v + 1);
  const [products, setProducts] = useState([]);
  const [productTotal, setProductTotal] = useState(0);
  const [productPage, setProductPage] = useState(1);
  const [productFilter, setProductFilter] = useState({ q: '', category: '', stockStatus: '' });
  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState('');
  const [adjust, setAdjust] = useState({ productId: '', delta: '', reason: '' });
  const [saleSearch, setSaleSearch] = useState('');
  const [choices, setChoices] = useState([]);
  const [chosen, setChosen] = useState('');
  const [qty, setQty] = useState('1');
  const [cart, setCart] = useState([]);
  const [method, setMethod] = useState('CASH');
  const [draft, setDraft] = useState(null);
  const [recentSale, setRecentSale] = useState(null);
  const [sales, setSales] = useState([]);
  const [salesTotal, setSalesTotal] = useState(0);
  const [salesPage, setSalesPage] = useState(1);
  const [salesFilter, setSalesFilter] = useState({ q: '', from: '', to: '', paymentMethod: '', source: '' });
  const [importKind, setImportKind] = useState('products');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importConfirmed, setImportConfirmed] = useState(false);
  const [declaredCash, setDeclaredCash] = useState('');
  const [closureNote, setClosureNote] = useState('');
  const [closures, setClosures] = useState([]);

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API}/api/pos${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`,
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.message || `HTTP ${response.status}`), { data });
    return data;
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const params = new URLSearchParams({ page: productPage, limit: 25, includeInactive: isAdmin && showInactive ? 'true' : 'false',
      ...Object.fromEntries(Object.entries(productFilter).filter(([,v]) => v !== '')) });
    request(`/products?${params}`).then(data => {
      if (active) { setProducts(data.products || []); setProductTotal(data.total || 0); }
    }).catch(err => active && setMessage(err.message));
    return () => { active = false; };
  }, [token, isAdmin, showInactive, productPage, productFilter, reload, request]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const params = new URLSearchParams({ limit: 100, page: 1 });
    if (saleSearch) params.set('q', saleSearch);
    request(`/products?${params}`).then(data => active && setChoices(data.products || []))
      .catch(err => active && setMessage(err.message));
    return () => { active = false; };
  }, [token, saleSearch, reload, request]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const params = new URLSearchParams({ page: salesPage, limit: 25,
      ...Object.fromEntries(Object.entries(salesFilter).filter(([,v]) => v !== '')) });
    request(`/sales?${params}`).then(data => {
      if (active) { setSales(data.sales || []); setSalesTotal(data.total || 0); }
    }).catch(err => active && setMessage(err.message));
    return () => { active = false; };
  }, [token, salesPage, salesFilter, reload, request]);

  useEffect(() => {
    if (!token || !isAdmin) return;
    request('/closures').then(data => setClosures(data.closures || []))
      .catch(err => setMessage(err.message));
  }, [token, isAdmin, reload, request]);

  const chosenProduct = choices.find(p => p._id === chosen);
  const cartTotal = useMemo(() => cart.reduce((acc, l) => acc + l.price * l.quantity, 0), [cart]);
  const latestClosure = closures.find(c => c.day === dateInColombia());

  async function saveProduct(e) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setMessage('');
    try {
      const payload = { name: form.name, category: form.category,
        price: Number(form.price), minStock: Number(form.minStock), isActive: form.isActive };
      if (!editing) { payload.sku = form.sku; payload.stock = Number(form.stock); }
      await request(editing ? `/products/${editing}` : '/products', {
        method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload),
      });
      setForm(emptyForm); setEditing(''); refresh();
      setMessage(editing ? 'Producto actualizado.' : 'Producto creado correctamente.');
    } catch (err) { setMessage(err.message); }
    finally { setBusy(false); }
  }
  function editProduct(p) {
    setEditing(p._id);
    setForm({ name: p.name, sku: p.sku, category: p.category,
      price: String(p.price), stock: String(p.stock), minStock: String(p.minStock ?? 3), isActive: p.isActive });
    setTab('products'); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function changeStock(e) {
    e.preventDefault(); if (busy) return;
    setBusy(true);
    try {
      await request(`/products/${adjust.productId}/stock`, { method: 'POST',
        body: JSON.stringify({ delta: Number(adjust.delta), reason: adjust.reason }) });
      setAdjust({ productId: '', delta: '', reason: '' });
      setMessage('Stock actualizado con registro de ajuste.'); refresh();
    } catch (err) { setMessage(err.message); }
    finally { setBusy(false); }
  }
  function addCart() {
    const amount = Number(qty);
    if (!chosenProduct || !Number.isSafeInteger(amount) || amount <= 0) {
      setMessage('Selecciona producto y cantidad válida.'); return;
    }
    const existing = cart.find(x => x.productId === chosenProduct._id)?.quantity || 0;
    if (existing + amount > chosenProduct.stock) {
      setMessage('No hay inventario suficiente.'); return;
    }
    setCart(prev => prev.some(x => x.productId === chosenProduct._id)
      ? prev.map(x => x.productId === chosenProduct._id ? { ...x, quantity: x.quantity + amount } : x)
      : [...prev, { productId: chosenProduct._id, name: chosenProduct.name,
          sku: chosenProduct.sku, price: chosenProduct.price, stockAtSelection: chosenProduct.stock, quantity: amount }]);
    setMessage('Producto agregado a la venta.');
  }
  function prepareSale() {
    if (!cart.length || busy) return;
    const valid = cart.every(item => item.stockAtSelection >= item.quantity);
    if (!valid) { setMessage('Actualiza inventario: uno de los productos ya no está disponible.'); return; }
    setDraft({ items: cart.map(x => ({ productId: x.productId, quantity: x.quantity })),
      paymentMethod: method, externalRef: `POS-${crypto.randomUUID()}`.toUpperCase(),
      lines: cart, estimate: cartTotal });
  }
  async function confirmSale() {
    if (!draft || busy) return;
    setBusy(true); setMessage('');
    try {
      const data = await request('/sales', { method: 'POST', body: JSON.stringify({
        items: draft.items, paymentMethod: draft.paymentMethod, externalRef: draft.externalRef }) });
      setRecentSale(data.sale); setCart([]); setDraft(null); refresh();
      setMessage(`Venta registrada: ${money(data.sale.total)}. Inventario actualizado.`);
    } catch (err) { setMessage(`${err.message} Revisa el historial antes de volver a intentar.`); }
    finally { setBusy(false); }
  }
  async function previewFile() {
    if (!file || busy) return;
    setBusy(true); setMessage(''); setPreview(null); setImportConfirmed(false);
    try {
      const body = new FormData(); body.append('file', file);
      const data = await request(`/${importKind === 'products' ? 'products' : 'sales'}/import/preview`,
        { method: 'POST', body });
      setPreview(data);
      setMessage(data.valid ? 'Vista previa correcta. Confirma si deseas importar.' : 'El archivo tiene errores; no se guardó ningún registro.');
    } catch (err) { setMessage(err.message); }
    finally { setBusy(false); }
  }
  async function commitFile() {
    if (!file || !preview?.valid || !importConfirmed || busy) return;
    setBusy(true); setMessage('');
    try {
      const body = new FormData(); body.append('file', file);
      const data = await request(`/${importKind === 'products' ? 'products' : 'sales'}/import/commit`,
        { method: 'POST', body });
      setMessage(data.message); setFile(null); setPreview(null); setImportConfirmed(false); refresh();
    } catch (err) {
      setMessage(err.message);
      if (err.data?.errors) setPreview(v => ({ ...v, valid: false, errors: err.data.errors }));
    } finally { setBusy(false); }
  }
  async function closeCash(e) {
    e.preventDefault(); if (busy || latestClosure) return;
    setBusy(true); setMessage('');
    try {
      const data = await request('/closures', { method: 'POST', body: JSON.stringify({
        day: dateInColombia(), declaredCash: Number(declaredCash), note: closureNote }) });
      setMessage(`Cierre registrado. Diferencia de efectivo: ${money(data.closure.difference)}.`);
      setDeclaredCash(''); setClosureNote(''); refresh();
    } catch (err) { setMessage(err.message); }
    finally { setBusy(false); }
  }

  const tabs = [
    ['products', 'Productos e inventario', Package],
    ['register', 'Registrar venta', ShoppingCart],
    ['history', 'Historial y filtros', History],
    ...(isAdmin ? [['import', 'Importar CSV', UploadCloud], ['closure', 'Cierre de caja', Wallet]] : []),
  ];
  return (
    <main className="fin-pos">
      <header className="fin-pos-head"><div><p className="fin-pos-kicker">FINCRM · VENTAS E INVENTARIO</p>
        <h1>FinPOS</h1><p>Productos, ventas, importaciones y caja de tu empresa.</p></div>
        <button type="button" className="fin-pos-secondary" onClick={refresh}><RefreshCw size={16}/> Actualizar</button>
      </header>
      <nav className="fin-pos-tabs" aria-label="Secciones de FinPOS">
        {tabs.map(([id, label, Icon]) => <button key={id} type="button"
          className={tab === id ? 'active' : ''} onClick={() => { setTab(id); setMessage(''); }}>
          <Icon size={17}/>{label}</button>)}
      </nav>
      {message && <p className="fin-pos-notice" role="status">{message}</p>}

      {tab === 'products' && <div className="fin-pos-stack">
        {isAdmin && <section className="fin-pos-card"><h2>{editing ? 'Editar producto' : 'Nuevo producto'}</h2>
          <form onSubmit={saveProduct} className="fin-pos-form-grid">
            <label>Nombre<input required minLength={2} maxLength={120} value={form.name} onChange={e => setForm(v=>({...v,name:e.target.value}))}/></label>
            <label>SKU <input required disabled={!!editing} value={form.sku} onChange={e => setForm(v=>({...v,sku:e.target.value}))}/></label>
            <label>Categoría<input required maxLength={60} value={form.category} onChange={e => setForm(v=>({...v,category:e.target.value}))}/></label>
            <label>Precio COP<input required type="number" min="1" step="1" value={form.price} onChange={e => setForm(v=>({...v,price:e.target.value}))}/></label>
            {!editing && <label>Existencias iniciales<input required type="number" min="0" step="1" value={form.stock} onChange={e => setForm(v=>({...v,stock:e.target.value}))}/></label>}
            <label>Alerta por stock mínimo<input required type="number" min="0" step="1" value={form.minStock} onChange={e => setForm(v=>({...v,minStock:e.target.value}))}/></label>
            {editing && <label className="fin-pos-inline"><input type="checkbox" checked={form.isActive} onChange={e => setForm(v=>({...v,isActive:e.target.checked}))}/> Producto activo</label>}
            <div className="fin-pos-inline"><button type="submit" disabled={busy}><Save size={16}/>{editing ? 'Guardar cambios' : 'Crear producto'}</button>
              {editing && <button type="button" className="fin-pos-secondary" onClick={()=>{setEditing('');setForm(emptyForm);}}>Cancelar edición</button>}</div>
          </form></section>}
        <section className="fin-pos-card"><h2>Inventario y filtros</h2>
          <div className="fin-pos-filters">
            <label>Buscar nombre, SKU o categoría<input placeholder="Buscar..." value={productFilter.q} onChange={e=>{setProductPage(1);setProductFilter(v=>({...v,q:e.target.value}));}}/></label>
            <label>Categoría<input placeholder="Todas" value={productFilter.category} onChange={e=>{setProductPage(1);setProductFilter(v=>({...v,category:e.target.value}));}}/></label>
            {isAdmin && <label className="fin-pos-inline"><input type="checkbox" checked={showInactive} onChange={e=>{setProductPage(1);setShowInactive(e.target.checked);}}/> Incluir inactivos</label>}
            <label>Disponibilidad<select value={productFilter.stockStatus} onChange={e=>{setProductPage(1);setProductFilter(v=>({...v,stockStatus:e.target.value}));}}>
              <option value="">Todas</option><option value="low">Bajo stock</option><option value="out">Agotados</option></select></label>
          </div>
          <p className="fin-pos-hint">{productTotal} productos coinciden con los filtros. Se muestran 25 por página.</p>
          <div className="fin-pos-table"><table><thead><tr><th>Nombre</th><th>SKU</th><th>Categoría</th><th>Precio</th><th>Existencias</th><th>Acciones</th></tr></thead>
            <tbody>{products.map(p=><tr key={p._id}><td>{p.name}</td><td>{p.sku}</td><td>{p.category}</td><td>{money(p.price)}</td>
              <td><span className={`fin-pos-stock ${p.stock===0?'out':p.stock<=(p.minStock ?? 3)?'low':''}`}>{!p.isActive?'Inactivo':p.stock===0?'Agotado':p.stock<=(p.minStock ?? 3)?`Bajo: ${p.stock}`:p.stock}</span></td>
              <td>{isAdmin && <div className="fin-pos-inline"><button type="button" className="fin-pos-tiny" onClick={()=>editProduct(p)}>Editar</button>
                {p.isActive && <button type="button" className="fin-pos-tiny" onClick={()=>setAdjust(v=>({...v,productId:p._id}))}>Ajustar</button>}</div>}</td></tr>)}
              {!products.length&&<tr><td colSpan={6}>No hay productos con estos filtros.</td></tr>}</tbody></table></div>
          <div className="fin-pos-pagination"><button type="button" className="fin-pos-secondary" disabled={productPage<=1} onClick={()=>setProductPage(v=>v-1)}>Anterior</button>
            <span>Página {productPage} / {Math.max(1,Math.ceil(productTotal/25))}</span>
            <button type="button" className="fin-pos-secondary" disabled={productPage>=Math.ceil(productTotal/25)} onClick={()=>setProductPage(v=>v+1)}>Siguiente</button></div>
        </section>
        {isAdmin && adjust.productId && <section className="fin-pos-card fin-pos-outline"><h2>Ajustar inventario</h2>
          <p>Registra entradas con un número positivo y salidas con un número negativo. Debes escribir el motivo.</p>
          <form onSubmit={changeStock} className="fin-pos-form-grid"><label>Variación de unidades<input required type="number" step="1" value={adjust.delta} onChange={e=>setAdjust(v=>({...v,delta:e.target.value}))}/></label>
            <label>Motivo<input required minLength={5} maxLength={200} value={adjust.reason} onChange={e=>setAdjust(v=>({...v,reason:e.target.value}))}/></label>
            <div className="fin-pos-inline"><button type="submit" disabled={busy}>Guardar ajuste</button><button type="button" className="fin-pos-secondary" onClick={()=>setAdjust({productId:'',delta:'',reason:''})}>Cancelar</button></div></form>
        </section>}
      </div>}

      {tab === 'register' && <div className="fin-pos-stack"><section className="fin-pos-card"><h2>Registrar venta</h2>
        <div className="fin-pos-form-grid"><label>Buscar producto<input placeholder="Nombre o SKU" value={saleSearch} onChange={e=>setSaleSearch(e.target.value)}/></label>
          <label>Producto<select value={chosen} onChange={e=>setChosen(e.target.value)}><option value="">Selecciona un producto</option>
            {choices.map(p=><option key={p._id} value={p._id}>{p.name} ({p.sku}) · {money(p.price)} · Stock {p.stock}</option>)}</select></label>
          <label>Cantidad<input type="number" min="1" step="1" value={qty} onChange={e=>setQty(e.target.value)}/></label>
          <div className="fin-pos-field-action"><button type="button" onClick={addCart} disabled={busy||!chosen}><Plus size={16}/>Agregar a la venta</button></div>
        </div><p className="fin-pos-hint">Busca por nombre o SKU. Se muestran hasta 100 coincidencias.</p>
        <div className="fin-pos-table"><table><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th><th></th></tr></thead>
          <tbody>{cart.map(l=><tr key={l.productId}><td>{l.name}</td><td>{l.quantity}</td><td>{money(l.price)}</td><td>{money(l.price*l.quantity)}</td>
            <td><button type="button" className="fin-pos-tiny" onClick={()=>setCart(v=>v.filter(x=>x.productId!==l.productId))}><X size={16}/></button></td></tr>)}
            {!cart.length&&<tr><td colSpan={5}>Agrega productos para preparar una venta.</td></tr>}</tbody></table></div>
        <div className="fin-pos-sale-footer"><label>Medio de pago<select value={method} onChange={e=>setMethod(e.target.value)}>
          {Object.entries(methods).map(([key,v])=><option key={key} value={key}>{v}</option>)}</select></label>
          <strong>Total estimado: {money(cartTotal)}</strong><button type="button" disabled={!cart.length||busy} onClick={prepareSale}><ShoppingCart size={17}/> Revisar venta</button>
        </div>
      </section>{recentSale&&<section className="fin-pos-card"><div className="fin-pos-inline"><Check size={18}/><strong>Última venta registrada: {recentSale.externalRef}</strong>
        <button type="button" className="fin-pos-secondary" onClick={()=>printReceipt(recentSale)}><Printer size={16}/>Imprimir comprobante</button></div></section>}</div>}

      {tab === 'history' && <section className="fin-pos-card"><h2>Historial de ventas</h2>
        <div className="fin-pos-filters"><label>Buscar por referencia o producto<input placeholder="Referencia / SKU" value={salesFilter.q} onChange={e=>{setSalesPage(1);setSalesFilter(v=>({...v,q:e.target.value}));}}/></label>
          <label>Desde<input type="date" value={salesFilter.from} onChange={e=>{setSalesPage(1);setSalesFilter(v=>({...v,from:e.target.value}));}}/></label>
          <label>Hasta<input type="date" value={salesFilter.to} onChange={e=>{setSalesPage(1);setSalesFilter(v=>({...v,to:e.target.value}));}}/></label>
          <label>Medio<select value={salesFilter.paymentMethod} onChange={e=>{setSalesPage(1);setSalesFilter(v=>({...v,paymentMethod:e.target.value}));}}>
            <option value="">Todos</option>{Object.entries(methods).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
          <label>Origen<select value={salesFilter.source} onChange={e=>{setSalesPage(1);setSalesFilter(v=>({...v,source:e.target.value}));}}>
            <option value="">Todos</option><option value="POS">Ventas POS</option><option value="HISTORICAL">Importadas</option></select></label>
        </div><p className="fin-pos-hint">{salesTotal} ventas encontradas. Las importadas no alteraron el inventario.</p>
        <div className="fin-pos-table"><table><thead><tr><th>Fecha de venta</th><th>Referencia</th><th>Productos</th><th>Total</th><th>Medio</th><th>Origen</th><th></th></tr></thead>
        <tbody>{sales.map(s=><tr key={s._id}><td>{fmtDate(s.soldAt||s.createdAt)}</td><td>{s.externalRef||'Registro anterior'}</td>
          <td>{s.lines?.map(l=>`${l.quantity} × ${l.name}`).join(', ')}</td><td>{money(s.total)}</td>
          <td>{methods[s.paymentMethod]||s.paymentMethod}</td><td>{s.source==='HISTORICAL'?'CSV histórico':'POS'}</td>
          <td><button type="button" className="fin-pos-tiny" onClick={()=>printReceipt(s)}><Printer size={16}/> Ver</button></td></tr>)}
          {!sales.length&&<tr><td colSpan={7}>No hay ventas con estos filtros.</td></tr>}</tbody></table></div>
        <div className="fin-pos-pagination"><button type="button" className="fin-pos-secondary" disabled={salesPage<=1} onClick={()=>setSalesPage(v=>v-1)}>Anterior</button>
          <span>Página {salesPage} / {Math.max(1,Math.ceil(salesTotal/25))}</span>
          <button type="button" className="fin-pos-secondary" disabled={salesPage>=Math.ceil(salesTotal/25)} onClick={()=>setSalesPage(v=>v+1)}>Siguiente</button></div>
      </section>}

      {tab === 'import' && isAdmin && <section className="fin-pos-card"><h2>Importación CSV con vista previa</h2>
        <p className="fin-pos-hint">Los archivos se validan en el servidor. Un error bloquea el lote completo. CSV UTF-8, máximo 1 MB.</p>
        <div className="fin-pos-form-grid"><label>Tipo de importación<select value={importKind} onChange={e=>{setImportKind(e.target.value);setFile(null);setPreview(null);setImportConfirmed(false);}}>
          <option value="products">Productos nuevos</option><option value="sales">Ventas históricas</option></select></label>
          <div className="fin-pos-field-action"><button type="button" className="fin-pos-secondary" onClick={()=>downloadExample(importKind)}>Descargar plantilla CSV</button></div>
          <label>Seleccionar archivo CSV<input type="file" accept=".csv,text/csv" onChange={e=>{setFile(e.target.files?.[0]||null);setPreview(null);setImportConfirmed(false);}}/></label>
          <div className="fin-pos-field-action"><button type="button" disabled={!file||busy} onClick={previewFile}><Search size={16}/>Validar y previsualizar</button></div></div>
        {importKind==='sales'&&<div className="fin-pos-warning"><AlertTriangle size={19}/><span>Las ventas históricas quedarán registradas con su fecha original, <strong>sin descontar stock ni sumarse al cierre de caja actual</strong>. Importa primero los productos de sus SKU.</span></div>}
        {preview&&<div className="fin-pos-import-results"><h3>{preview.valid?'Archivo válido':'Corrige el archivo'}</h3>
          <p>Registros detectados: {preview.total}. {preview.rows?`Filas: ${preview.rows}.`:''}</p>
          {!!preview.errors?.length&&<div role="alert" className="fin-pos-import-errors">{preview.errors.map((e,i)=><p key={i}>Fila {e.fila}: {e.motivo}</p>)}</div>}
          {!!preview.sample?.length&&<div className="fin-pos-table"><table><thead><tr>{Object.keys(preview.sample[0]).map(k=><th key={k}>{k}</th>)}</tr></thead>
            <tbody>{preview.sample.map((row,i)=><tr key={i}>{Object.values(row).map((v,j)=><td key={j}>{typeof v==='object'?JSON.stringify(v):String(v)}</td>)}</tr>)}</tbody></table></div>}
          {preview.valid&&<div className="fin-pos-confirm-import"><label className="fin-pos-inline"><input type="checkbox" checked={importConfirmed} onChange={e=>setImportConfirmed(e.target.checked)}/> Confirmo que revisé los datos y deseo guardar el lote.</label>
            <button type="button" disabled={!importConfirmed||busy} onClick={commitFile}><UploadCloud size={17}/>Confirmar importación</button></div>}
        </div>}
      </section>}

      {tab === 'closure'&&isAdmin&&<section className="fin-pos-card"><h2>Cierre de caja</h2>
        <p className="fin-pos-hint">Solo se cierran las ventas POS del día actual en Bogotá. Las ventas históricas no se incluyen.</p>
        {latestClosure?<p className="fin-pos-success">Caja cerrada hoy: efectivo esperado {money(latestClosure.expectedCash)}, declarado {money(latestClosure.declaredCash)}, diferencia {money(latestClosure.difference)}.</p>
        :<form className="fin-pos-form-grid" onSubmit={closeCash}><label>Fecha (Bogotá)<input readOnly value={dateInColombia()}/></label>
          <label>Efectivo contado (COP)<input required type="number" step="1" min="0" value={declaredCash} onChange={e=>setDeclaredCash(e.target.value)}/></label>
          <label>Observaciones<input maxLength={300} value={closureNote} onChange={e=>setClosureNote(e.target.value)}/></label>
          <div className="fin-pos-field-action"><button type="submit" disabled={busy||declaredCash===''}><Wallet size={16}/>Registrar cierre de caja</button></div>
        </form>}
        <h3>Últimos cierres</h3><div className="fin-pos-table"><table><thead><tr><th>Día</th><th>Ventas</th><th>Efectivo esperado</th><th>Declarado</th><th>Diferencia</th></tr></thead>
          <tbody>{closures.map(c=><tr key={c._id}><td>{c.day}</td><td>{c.salesCount}</td><td>{money(c.expectedCash)}</td><td>{money(c.declaredCash)}</td><td>{money(c.difference)}</td></tr>)}
            {!closures.length&&<tr><td colSpan={5}>No existen cierres todavía.</td></tr>}</tbody></table></div>
      </section>}

      {draft&&<div className="fin-pos-modal-overlay" role="presentation"><div className="fin-pos-modal" role="dialog" aria-modal="true" aria-labelledby="fin-pos-draft-title">
        <h2 id="fin-pos-draft-title">Confirmar venta real</h2><p>Revisa los productos y el medio de pago. Una vez confirmada se descontará stock.</p>
        {draft.lines.map(l=><p key={l.productId}>{l.quantity} × {l.name} — {money(l.quantity*l.price)}</p>)}
        <p><strong>Pago:</strong> {methods[draft.paymentMethod]}</p><h3>Total estimado: {money(draft.estimate)}</h3>
        <div className="fin-pos-inline"><button type="button" className="fin-pos-secondary" disabled={busy} onClick={()=>setDraft(null)}>Cancelar</button>
          <button type="button" disabled={busy} onClick={confirmSale}>{busy?'Registrando...':'Confirmar y descontar stock'}</button></div>
      </div></div>}
    </main>
  );
}
