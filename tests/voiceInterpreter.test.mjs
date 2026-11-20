/**
 * Inventarios SIMULADOS de empresas de distintos sectores.
 * Este archivo NO agrega productos a MongoDB ni decide que vende una empresa.
 * La aplicacion real consulta /api/pos/products con JWT; el backend debe filtrar por tenant.
 * Ejecutar: node --test tests/voiceInterpreter.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const { parseUtterance, locateProduct, parseQuantity, parsePaymentMethod } =
  await import(pathToFileURL(resolve(import.meta.dirname, '../frontend/src/features/voice/voiceInterpreter.js')));

const ferreteria = [
  { _id:'f1', name:'Taladro inalambrico', sku:'FER-001', stock:5, price:135000, isActive:true },
  { _id:'f2', name:'Caja de tornillos', sku:'FER-002', stock:20, price:12000, isActive:true },
];
const papeleria = [
  { _id:'p1', name:'Cuaderno cuadriculado', sku:'PAP-001', stock:14, price:8000, isActive:true },
  { _id:'p2', name:'Cuaderno rayado', sku:'PAP-002', stock:8, price:7500, isActive:true },
  { _id:'p3', name:'Marcador negro', sku:'PAP-003', stock:10, price:3500, isActive:true },
];
const alimentos = [
  { _id:'a1', name:'Cafe molido', sku:'ALI-001', stock:9, price:23000, isActive:true },
  { _id:'a2', name:'Arroz integral', sku:'ALI-002', stock:18, price:6500, isActive:true },
];

const cases = [
  ['¿Cuánto vale el taladro inalambrico?', 'price', ferreteria, 'f1'],
  ['¿Que precio tiene el cafe molido?', 'price', alimentos, 'a1'],
  ['¿Cuantas cajas de tornillos quedan?', 'stock', ferreteria, 'f2'],
  ['¿Cuantos cuadernos cuadriculados me quedan?', 'stock', papeleria, 'p1'],
  ['¿Tienes arroz integral?', 'stock', alimentos, 'a2'],
  ['Registra una venta de dos taladros inalambricos por transferencia', 'sale', ferreteria, 'f1'],
  ['Vendi 1 cuaderno cuadriculado en efectivo', 'sale', papeleria, 'p1'],
  ['Acabo de vender tres cafes molidos por Nequi', 'sale', alimentos, 'a1'],
  ['¿Cuanto cuesta el cuaderno?', 'price', papeleria, null],
  ['¿Cuantos cuadernos quedan?', 'stock', papeleria, null],
];
for (const [sentence, intent, products, target] of cases) {
  test(`${sentence} -> ${intent}, resultado ${target || 'ambiguo'}`, () => {
    const cmd = parseUtterance(sentence);
    assert.equal(cmd.kind, intent);
    const result = locateProduct(cmd, products);
    if (target) assert.equal(result.product?._id, target);
    else {
      assert.equal(result.product, null);
      assert.ok(result.options.length > 1);
    }
  });
}

test('pregunta posterior sobre el ultimo producto consultado', () => {
  const cmd = parseUtterance('¿Y cuanto cuesta ese?');
  assert.equal(cmd.kind, 'price');
  assert.equal(locateProduct(cmd, alimentos, 'a1').product?._id, 'a1');
});
test('no inventa un producto que no existe en los datos recibidos', () => {
  const result = locateProduct(parseUtterance('¿Cuanto cuesta bicicleta plegable?'), ferreteria);
  assert.equal(result.product, null);
});
test('las coincidencias se limitan a la lista proporcionada (el backend debe aislar por tenant)', () => {
  const cmd = parseUtterance('¿Cuanto vale el taladro inalambrico?');
  assert.equal(locateProduct(cmd, alimentos).product, null);
  assert.equal(locateProduct(cmd, ferreteria).product?._id, 'f1');
});
test('catalogo y avisos de inventario bajo', () => {
  assert.equal(parseUtterance('¿Que productos tienes?').kind, 'catalog');
  assert.equal(parseUtterance('¿Que productos estan por agotarse?').kind, 'low-stock');
});
test('cantidades y medios de pago', () => {
  assert.equal(parseQuantity('Registra una venta de tres cuadernos'), 3);
  assert.equal(parseQuantity('Vendi 2 taladros'), 2);
  assert.equal(parsePaymentMethod('por Nequi'), 'TRANSFER');
  assert.equal(parsePaymentMethod('con datafono'), 'CARD');
});
test('consultar ventas no debe registrar una venta', () => {
  assert.notEqual(parseUtterance('¿Cuantas ventas hice hoy?').kind, 'sale');
});
