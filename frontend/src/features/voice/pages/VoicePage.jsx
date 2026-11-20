import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Headphones, HelpCircle, Keyboard,
  Mic, MicOff, PackageSearch, RefreshCw, Search, ShieldCheck,
  ShoppingCart, Volume2, VolumeX, Eye, EyeOff,
} from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext.jsx';
import { locateProduct, parseUtterance } from '../voiceInterpreter.js';
import './VoicePage.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const money = value => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
}).format(Number(value ?? 0));
const methods = { CASH: 'Efectivo', TRANSFER: 'Transferencia / Nequi', CARD: 'Tarjeta', OTHER: 'Otro' };
function speechIssue(error) {
  const messages = {
    'not-allowed': 'No hay permiso para usar el micrófono. Habilítalo en el navegador.',
    'service-not-allowed': 'El reconocimiento de voz está bloqueado en este navegador.',
    'no-speech': 'No se escuchó una frase. Intenta hablar de nuevo.',
    'audio-capture': 'No se detectó un micrófono disponible.',
    'network': 'El servicio de reconocimiento no está disponible. Utiliza el texto.',
    'aborted': 'Se interrumpió la escucha.',
  };
  return messages[error] || 'No se pudo reconocer la voz. Prueba escribir la instrucción.';
}

export default function VoicePage() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [listening, setListening] = useState(false);
  const [typed, setTyped] = useState('');
  const [transcript, setTranscript] = useState('');
  const [output, setOutput] = useState(null);
  const [notice, setNotice] = useState('');
  const [showResult, setShowResult] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window);
  const [candidates, setCandidates] = useState([]);
  const [candidateCommand, setCandidateCommand] = useState(null);
  const [missingSale, setMissingSale] = useState(null);
  const [draft, setDraft] = useState(null);
  const [working, setWorking] = useState(false);
  const recognitionRef = useRef(null);
  const lastProductIdRef = useRef(null);
  const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Los ejemplos se crean usando productos reales del inventario de la empresa.
  // No se registra ningun producto de ejemplo en la base de datos.
  const productoEjemplo = products.find(p => p.isActive !== false && Number(p.stock) > 0)
    || products.find(p => p.isActive !== false);
  const samples = [
    ...(productoEjemplo ? [
      `¿Cuánto vale ${productoEjemplo.name}?`,
      `¿Cuántas unidades quedan de ${productoEjemplo.name}?`,
    ] : []),
    '¿Qué productos tienes disponibles?',
    '¿Qué artículos están por agotarse?',
    ...(productoEjemplo && Number(productoEjemplo.stock) > 0
      ? [`Vendí 1 ${productoEjemplo.name} en efectivo`]
      : []),
  ];

  const request = useCallback(async (path, options = {}) => {
    const res = await fetch(`${API}/api/pos${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Error HTTP ${res.status}`);
    return data;
  }, [token]);

  const refreshProducts = useCallback(async () => {
    setLoading(true);
    try {
      const collected = [];
      let total = 0;
      for (let page = 1; page <= 10; page++) {
        const data = await request(`/products?limit=100&page=${page}`);
        collected.push(...(data.products || []));
        total = data.total ?? collected.length;
        if (page >= (data.pages || 0)) break;
      }
      setProducts(collected);
      setTruncated(total > collected.length);
      setLoaded(true);
      setNotice('');
      return collected;
    } catch (error) {
      setNotice(`No se pudo cargar el inventario: ${error.message}`);
      setLoaded(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => { if (token) refreshProducts(); }, [token, refreshProducts]);
  useEffect(() => () => {
    recognitionRef.current?.abort?.();
    if (canSpeak) window.speechSynthesis.cancel();
  }, [canSpeak]);

  function respond(text, info = null) {
    setOutput({ text, info });
    setNotice('');
    if (!voiceEnabled || !canSpeak) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-CO';
    utterance.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(v => v.lang === 'es-CO') || voices.find(v => v.lang.startsWith('es')) || null;
    window.speechSynthesis.speak(utterance);
  }

  function prepareSale(product, quantity, paymentMethod) {
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000) {
      setNotice('Indica una cantidad válida de 1 a 10000 unidades.');
      return;
    }
    if (!methods[paymentMethod]) {
      setNotice('Elige un medio de pago antes de continuar.');
      return;
    }
    if (quantity > product.stock) {
      respond(`No hay inventario suficiente de ${product.name}. Solo quedan ${product.stock} unidades.`, { product, mode: 'stock' });
      return;
    }
    const total = quantity * product.price;
    if (!Number.isSafeInteger(total)) {
      setNotice('El importe supera el rango permitido.');
      return;
    }
    if (!globalThis.crypto?.randomUUID) {
      setNotice('La venta requiere un navegador seguro con generación de identificadores disponible.');
      return;
    }
    setMissingSale(null);
    setDraft({ productId: product._id, product: product.name, quantity, paymentMethod, total,
      externalRef: `POS-${globalThis.crypto.randomUUID()}`.toUpperCase(), });
    respond(`Preparé ${quantity} unidades de ${product.name} por ${money(total)}. Revisa y confirma la venta en pantalla.`);
  }

  function withProduct(command, product) {
    lastProductIdRef.current = product._id;
    setCandidates([]);
    setCandidateCommand(null);
    setMissingSale(null);
    if (command.kind === 'price') {
      respond(`${product.name} cuesta ${money(product.price)}. Quedan ${product.stock} unidades.`, { product, mode: 'price' });
    } else if (command.kind === 'stock') {
      respond(`Tienes ${product.stock} unidades disponibles de ${product.name}.`, { product, mode: 'stock' });
    } else if (command.kind === 'sale') {
      if (!command.quantity || !command.paymentMethod) {
        setMissingSale({ product, quantity: command.quantity ?? '', paymentMethod: command.paymentMethod ?? '' });
        respond(`Encontré ${product.name}. ${!command.quantity ? 'Falta la cantidad. ' : ''}${!command.paymentMethod ? 'Falta el medio de pago. ' : ''}Puedes decirlo o completarlo en pantalla.`);
      } else {
        prepareSale(product, command.quantity, command.paymentMethod);
      }
    }
  }

  function handleCommand(input, confidence = 1) {
    const text = String(input || '').trim();
    setTranscript(text);
    setTyped(text);
    setDraft(null);
    setCandidates([]);
    setCandidateCommand(null);
    if (!loaded) { setNotice('Primero debemos cargar el inventario de FinPOS.'); return; }
    if (confidence > 0 && confidence < 0.55) {
      setNotice('El micrófono reconoció la frase con poca confianza. Corrige la transcripción y pulsa Interpretar.');
      return;
    }
    const command = parseUtterance(text);
    // Segunda frase de una venta incompleta: «dos por Nequi» o «en efectivo».
    if (missingSale && command.kind === 'unknown' && (command.quantity || command.paymentMethod)) {
      const quantity = command.quantity || Number(missingSale.quantity) || null;
      const paymentMethod = command.paymentMethod || missingSale.paymentMethod;
      if (quantity && paymentMethod) prepareSale(missingSale.product, quantity, paymentMethod);
      else {
        setMissingSale({ ...missingSale, quantity: quantity || '', paymentMethod: paymentMethod || '' });
        respond(`Perfecto. ${!quantity ? 'Falta la cantidad. ' : ''}${!paymentMethod ? 'Falta el medio de pago.' : ''}`);
      }
      return;
    }
    setMissingSale(null);

    if (command.kind === 'help' || command.kind === 'unknown') {
      respond(productoEjemplo
        ? `Puedo consultar precios, existencias y preparar ventas. Por ejemplo: ¿cuánto vale ${productoEjemplo.name}?`
        : 'Puedo consultar precios, existencias y preparar ventas. Primero registra tus productos en FinPOS.');
      return;
    }
    if (command.kind === 'catalog') {
      const inStock = products.filter(p => p.stock > 0);
      const first = inStock.slice(0, 6);
      respond(`Tienes ${inStock.length} productos con existencias entre los cargados. Algunos son: ${first.map(p => p.name).join(', ') || 'ninguno'}.`, { products: first, mode: 'catalog' });
      return;
    }
    if (command.kind === 'low-stock') {
      const allLow = products.filter(p => p.stock <= p.minStock);
      const low = allLow.slice(0, 10);
      respond(allLow.length ? `Encontré ${allLow.length}${truncated ? ' o más' : ''} productos agotados o con existencias bajas entre los cargados.` : 'No encontré productos con existencias bajas entre los cargados.', { products: low, mode: 'low-stock' });
      return;
    }
    const result = locateProduct(command, products, lastProductIdRef.current);
    if (result.product) { withProduct(command, result.product); return; }
    if (result.options.length) {
      setCandidateCommand(command);
      setCandidates(result.options);
      respond(`Encontré ${result.options.length} productos posibles. Selecciona el correcto en pantalla para continuar.`);
      return;
    }
    respond('No identifiqué con seguridad el producto. Prueba con parte del nombre o la referencia, o consulta el inventario de FinPOS.');
  }

  function startListening() {
    if (!Recognition || listening || working || loading) {
      if (!Recognition) setNotice('Este navegador no dispone de reconocimiento de voz. Puedes escribir cualquier consulta.');
      return;
    }
    if (canSpeak) window.speechSynthesis.cancel();
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = 'es-CO';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognition.onresult = event => {
      const current = event.results[event.resultIndex] || event.results[0];
      const alternative = current?.[0];
      if (alternative) handleCommand(alternative.transcript, alternative.confidence);
    };
    recognition.onerror = event => setNotice(speechIssue(event.error));
    recognition.onend = () => setListening(false);
    setListening(true);
    try { recognition.start(); } catch {
      setListening(false);
      setNotice('No se pudo encender el micrófono. Verifica permisos y conexión.');
    }
  }

  async function confirmSale() {
    if (!draft || working) return;
    setWorking(true);
    try {
      const response = await request('/sales', { method: 'POST', body: JSON.stringify({
        items: [{ productId: draft.productId, quantity: draft.quantity }],
        paymentMethod: draft.paymentMethod, externalRef: draft.externalRef,
      }) });
      setDraft(null);
      lastProductIdRef.current = draft.productId;
      respond(`Venta registrada correctamente por ${money(response.sale.total)}. Se actualizó el inventario.`);
      await refreshProducts();
    } catch (error) {
      setDraft(null); // No permitir reintentos automáticos ante fallos de red.
      setNotice(`No se confirmó el resultado: ${error.message}. Revisa Historial de ventas antes de volver a intentarlo.`);
    } finally {
      setWorking(false);
    }
  }

  function toggleVoice(checked) {
    if (!checked && !showResult) return;
    setVoiceEnabled(checked);
    if (!checked && canSpeak) window.speechSynthesis.cancel();
  }
  function toggleText(checked) {
    if (!checked && !voiceEnabled) return;
    setShowResult(checked);
  }

  return (
    <main className="fin-voice">
      <header className="fin-voice-head">
        <p>FINCRM · ASISTENTE OPERATIVO</p>
        <h1>FinVoice</h1>
        <span>Pregunta con tus propias palabras. Los precios y las existencias provienen del inventario de tu empresa.</span>
      </header>

      <div className="fin-voice-layout">
        <section className="fin-voice-card fin-voice-primary">
          <div className="fin-voice-config" aria-label="Opciones de respuesta">
            <label className="fin-voice-switch">
              <input type="checkbox" checked={showResult} onChange={e => toggleText(e.target.checked)} />
              {showResult ? <Eye size={17} /> : <EyeOff size={17} />}
              Mostrar resultado en pantalla
            </label>
            <label className="fin-voice-switch">
              <input type="checkbox" checked={voiceEnabled} onChange={e => toggleVoice(e.target.checked)} disabled={!canSpeak} />
              {voiceEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
              Responder con voz
            </label>
          </div>

          <div className="fin-voice-microphone">
            <button type="button" className={`fin-voice-mic ${listening ? 'listening' : ''}`}
              disabled={!Recognition || !loaded || working || loading}
              onClick={listening ? () => recognitionRef.current?.stop() : startListening}
              aria-label={listening ? 'Detener escucha' : 'Activar micrófono'}>
              {listening ? <MicOff size={35} /> : <Mic size={35} />}
            </button>
            <h2>{listening ? 'Te estoy escuchando...' : 'Habla con FinVoice'}</h2>
            <p>{Recognition ? 'Puedes preguntar libremente por tus productos.' : 'Tu navegador no permite reconocimiento de voz: escribe tu consulta.'}</p>
          </div>

          <div className="fin-voice-status">
            <strong><Keyboard size={15} /> Transcripción (siempre visible)</strong>
            <p>{transcript || 'Lo que escuche el micrófono aparecerá aquí.'}</p>
          </div>

          <form className="fin-voice-text" onSubmit={e => { e.preventDefault(); handleCommand(typed); }}>
            <label>Escribir o corregir la pregunta
              <input value={typed} onChange={e => setTyped(e.target.value)}
                placeholder={productoEjemplo ? `¿Cuánto vale ${productoEjemplo.name}?` : "Consulta un producto de tu inventario"} maxLength={300} />
            </label>
            <button type="submit" disabled={!loaded || !typed.trim() || working}><Search size={17} /> Interpretar</button>
          </form>

          {notice && <div role="alert" className="fin-voice-warning"><AlertTriangle size={19} /><span>{notice}</span></div>}

          {showResult && output && <div className="fin-voice-response" role="status" aria-live="polite">
            <Volume2 size={19} />
            <div className="fin-voice-response-content">
              <strong>Respuesta de FinVoice</strong><p>{output.text}</p>
              {output.info?.product && <div className="fin-voice-facts">
                <div><span>Producto</span><b>{output.info.product.name}</b></div>
                <div><span>Precio</span><b>{money(output.info.product.price)}</b></div>
                <div><span>Existencias</span><b>{output.info.product.stock}</b></div>
              </div>}
              {output.info?.products && <ul className="fin-voice-result-list">{output.info.products.map(p =>
                <li key={p._id}>{p.name} · {money(p.price)} · {p.stock} disponibles</li>
              )}</ul>}
            </div>
          </div>}

          {candidates.length > 0 && <div className="fin-voice-candidates">
            <strong>¿Cuál de estos productos quieres consultar?</strong>
            {candidates.map(p => <button type="button" key={p._id} onClick={() => withProduct(candidateCommand, p)}>
              {p.name} · {p.sku} · {money(p.price)}
            </button>)}
          </div>}

          {missingSale && <form className="fin-voice-missing" onSubmit={e => {
            e.preventDefault(); prepareSale(missingSale.product, Number(missingSale.quantity), missingSale.paymentMethod);
          }}>
            <strong>Completar venta · {missingSale.product.name}</strong>
            <div className="fin-voice-sale-fields">
              <label>Cantidad
                <input type="number" min="1" max="10000" step="1" required value={missingSale.quantity}
                  onChange={e => setMissingSale(v => ({ ...v, quantity: e.target.value }))} />
              </label>
              <label>Medio de pago
                <select required value={missingSale.paymentMethod}
                  onChange={e => setMissingSale(v => ({ ...v, paymentMethod: e.target.value }))}>
                  <option value="">Selecciona...</option>
                  {Object.entries(methods).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                </select>
              </label>
            </div>
            <button type="submit">Preparar venta</button>
          </form>}
        </section>

        <aside className="fin-voice-card fin-voice-examples">
          <h2><HelpCircle size={21} /> Preguntas que puedes hacer</h2>
          <p>Prueba estas frases, o utiliza tus propias palabras.</p>
          {samples.map(example => <button type="button" key={example} onClick={() => { setTyped(example); handleCommand(example); }}
            disabled={!loaded || working} className="fin-voice-example-button">
            {example}
          </button>)}
          <div className="fin-voice-inventory-status">
            <PackageSearch size={18} />
            <span>Productos cargados: <strong>{products.length}</strong>{truncated ? ' (hay más en FinPOS)' : ''}</span>
            <button type="button" onClick={refreshProducts} disabled={loading || working} aria-label="Actualizar inventario">
              <RefreshCw size={17} />
            </button>
          </div>
          <div className="fin-voice-warning"><Headphones size={19} />
            <span>El reconocimiento puede depender del navegador y de servicios externos. No menciones datos sensibles de clientes.</span>
          </div>
        </aside>
      </div>

      {draft && <div className="fin-voice-overlay">
        <section className="fin-voice-dialog" role="dialog" aria-modal="true" aria-labelledby="voice-sale-title">
          <div className="fin-voice-dialog-icon"><ShieldCheck size={26} /></div>
          <h2 id="voice-sale-title">Confirmar venta por voz</h2>
          <p>La venta <strong>todavía no está registrada</strong>. Revisa los datos:</p>
          <div className="fin-voice-summary">
            <div><span>Producto</span><strong>{draft.product}</strong></div>
            <div><span>Cantidad</span><strong>{draft.quantity}</strong></div>
            <div><span>Pago</span><strong>{methods[draft.paymentMethod]}</strong></div>
            <div><span>Total estimado</span><strong>{money(draft.total)}</strong></div>
          </div>
          <div className="fin-voice-actions">
            <button type="button" className="fin-voice-cancel" disabled={working}
              onClick={() => { setDraft(null); respond('Venta cancelada. No se modificó el inventario.'); }}>Cancelar</button>
            <button type="button" disabled={working} onClick={confirmSale}>
              <ShoppingCart size={16} /> {working ? 'Registrando...' : 'Confirmar venta'}
            </button>
          </div>
        </section>
      </div>}

      <footer className="fin-voice-footer"><CheckCircle2 size={17} />
        FinVoice nunca registra ventas sin confirmación. Si una pregunta es ambigua, te pedirá elegir el producto.
      </footer>
    </main>
  );
}
