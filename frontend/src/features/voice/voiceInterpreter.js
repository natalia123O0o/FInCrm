/**
 * FinVoice: interpretación básica en español sin servicios de pago.
 * No toma decisiones financieras: solo identifica intenciones y sugiere productos.
 */
export function normalizeSpeech(value) {
  return String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const NUMBERS = new Map(Object.entries({
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11,
  doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16,
  diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
  veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
  veinticinco: 25, treinta: 30,
}));

const IGNORE = new Set(`
  a al algo alguna alguno algunas algunos ambos antes articulo articulos asi como con
  consulta consultar cuanto cuanta cuantos cuantas costo cuesta cuestan cuestaria cual cuales
  de del desde dime decir decirme darme cuentame contame dinos disponible disponibles donde el ella ellas ellos en entre es esta
  estan estas este estos existencias favor fue ha hay hola hoy la las le les lo los mas
  me mi mis mucho muy necesito necesito no nos nuestro nuestros o para por precio precios
  producto productos puedes podria podrias puede puedo que queda quedan quedar quedo
  quiero quisiera saber se si sigue son stock su sus tengo tiene tienen tienes tiene tieneis todo todos
  un una unos unas unidades unidad valor vale valen vender vendi vendimos vendieron vendio
  vendido venta ventas registre registra registrar registrame anota anotar
  anotame agrega agregar acabo acaba hacer hacerse hicieron seria solo son sale salen
  esta estan esta estas tengo tienes tenemos tenemos tengo tener tenemos hay
  inventario cantidad cantidades me queda quedan quedan queda reciente ahora mismo
  dame cuanto cuantos cuantas a como esta en cuanto costo total vale puedo necesito
  comprar a cuanto podria mirar conocer quiero preguntar cuanto es seria gracias
  en con de las los por del nombre de esta este de esos de esas de ello por favor
  efectivo transferencia transferi nequi daviplata tarjeta datafono contado medio pago
  pagos mediante usando pagaron pago pague pagado pagaron pagaron se los las
  mostrar muestra muestrame mostrarme ver dime digame di informe informame
  baja bajas bajo bajos alerta alertas pocas pocos poco quedan disponibles disponibles
  precio cuanto vale costo total
`.split(/\s+/).filter(Boolean));

const ALIASES = new Map(Object.entries({
  collares: 'collar', cadenas: 'cadena', pulseras: 'pulsera', anillos: 'anillo',
  aretes: 'arete', pendientes: 'arete', zarcillos: 'arete', brazaletes: 'brazalete',
  relojes: 'reloj', unidades: 'unidad',
}));

function canonical(word) {
  const t = normalizeSpeech(word);
  if (ALIASES.has(t)) return ALIASES.get(t);
  if (t.length >= 5 && t.endsWith('ces')) return `${t.slice(0, -3)}z`;
  if (t.length >= 5 && t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1);
  return t;
}

function tokens(value) {
  return normalizeSpeech(value).split(' ').filter(Boolean).map(canonical);
}

export function parseQuantity(value) {
  const input = normalizeSpeech(value).replace(/\b(una|un) venta\b/g, 'venta');
  // Los dígitos no son decimales; un SKU tipo ANI-001 no cuenta como cantidad.
  const number = input.match(/(?:^|\s)([1-9][0-9]{0,3})(?=\s|$)/);
  if (number) return Number(number[1]);
  for (const token of tokens(input)) {
    if (NUMBERS.has(token)) return NUMBERS.get(token);
  }
  return null;
}

export function parsePaymentMethod(value) {
  const s = normalizeSpeech(value);
  if (/\b(efectivo|contado|cash)\b/.test(s)) return 'CASH';
  if (/\b(transferencia|transferencia bancaria|transferi|nequi|daviplata|consignacion)\b/.test(s)) return 'TRANSFER';
  if (/\b(tarjeta|datafono|debito|credito)\b/.test(s)) return 'CARD';
  if (/\b(otro medio|otro metodo|pago otro)\b/.test(s)) return 'OTHER';
  return null;
}

export function parseUtterance(value) {
  const normalized = normalizeSpeech(value);
  const quantity = parseQuantity(value);
  const paymentMethod = parsePaymentMethod(value);
  if (!normalized) return { kind: 'unknown', normalized, quantity, paymentMethod };

  let kind = 'unknown';
  if (/\b(ayuda|que puedo decir|como funciona|que comandos)\b/.test(normalized)) {
    kind = 'help';
  } else if (/\b(bajo stock|stock bajo|pocas existencias|por agotarse|agotados|agotadas|se estan acabando)\b/.test(normalized)) {
    kind = 'low-stock';
  } else if (/\b(que|cuales|muestra|muestrame|lista|listar|ver|dime)\b.*\b(productos|articulos|catalogo)\b|\b(que hay en inventario|muestrame el inventario|listar inventario)\b/.test(normalized)) {
    kind = 'catalog';
  } else if (/\b(vendi|vendimos|vendieron|vendio|vender|vendeme|se vendio|se vendieron|acabo de vender|registrar (una )?venta|registra (una )?venta|registrame (una )?venta|anotar (una )?venta|anota (una )?venta|agregar (una )?venta|agrega (una )?venta|nueva venta|cobrar|cobre)\b/.test(normalized)) {
    kind = 'sale';
  } else if (/\b(precio|precios|cuanto vale|cuanto cuesta|cuanto sale|que precio|cual es el valor|cual es su valor|cuanto cobras|a como|en cuanto|que vale|me dices el precio|dime cuanto vale|cuanto me cuesta|que cuesta|que cuestan|cuanto cuestan|a cuanto|que costo|cuanto esta)\b/.test(normalized)) {
    kind = 'price';
  } else if (/\b(stock|existencias|inventario|queda|quedan|disponibles|disponible|cuantos tengo|cuantas tengo|cuantos hay|cuantas hay|cuantas unidades|cuantos productos|tienes|tienen|tenemos|hay|me quedan)\b/.test(normalized)) {
    kind = 'stock';
  }
  return { kind, normalized, quantity, paymentMethod };
}

export function isReferenceToPrevious(value) {
  return /\b(ese|esa|eso|este|esta|esos|esas|mismo|misma|de aquel|de aquella|y cuanto|y cuantos|y cuantas|y tiene|y quedan|y que precio|de ese|de esa)\b/.test(normalizeSpeech(value));
}

function editDistanceAtMostOne(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a === b) return true;
  let i = 0; let j = 0; let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return edits + Number(i < a.length || j < b.length) <= 1;
}

function productSearchTokens(value) {
  return [...new Set(tokens(value).filter(t => !IGNORE.has(t) && !NUMBERS.has(t) && !/^\d+$/.test(t) && t.length > 1))];
}

function matchScore(query, product) {
  const title = normalizeSpeech(product.name);
  const sku = normalizeSpeech(product.sku);
  if (sku && query.normalized.includes(sku)) return 2.5;
  if (title && query.normalized.includes(title)) return 2;
  const requested = productSearchTokens(query.normalized);
  if (!requested.length) return 0;
  const actual = productSearchTokens(product.name);
  if (!actual.length) return 0;
  let matched = 0;
  for (const word of requested) {
    if (actual.includes(word)) { matched++; continue; }
    if (word.length > 4 && actual.some(t => t.length > 4 && editDistanceAtMostOne(word, t))) matched += 0.73;
  }
  if (!matched) return 0;
  const coverageRequest = matched / requested.length;
  const coverageProduct = matched / actual.length;
  return coverageRequest * 0.65 + coverageProduct * 0.35;
}

/**
 * Devuelve la coincidencia segura o candidatos para que el usuario elija.
 * Jamás devuelve automáticamente un producto si hay varios resultados parecidos.
 */
export function locateProduct(command, products, previousProductId = null) {
  const active = (products || []).filter(p => p?.isActive !== false);
  const scored = active.map(product => ({ product, score: matchScore(command, product) }))
    .filter(item => item.score >= 0.42)
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name, 'es'));

  if (scored.length) {
    const first = scored[0];
    const second = scored[1];
    const sure = first.score >= 0.8 && (!second || first.score - second.score >= 0.18);
    const hasOne = scored.length === 1 && first.score >= 0.58;
    if (sure || hasOne) return { product: first.product, options: [] };
    return { product: null, options: scored.slice(0, 6).map(x => x.product) };
  }
  if (previousProductId && isReferenceToPrevious(command.normalized)) {
    const found = active.find(p => String(p._id) === String(previousProductId));
    if (found) return { product: found, options: [] };
  }
  return { product: null, options: [] };
}
