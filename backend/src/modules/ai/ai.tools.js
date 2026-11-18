const herramientasFinCRM = [
  // HERRAMIENTA 1:
  // Consultar indicadores generales de cartera.
  {
    name: "consultarResumenCartera",

    description:
      "Consulta indicadores reales de la cartera de la empresa " +
      "autenticada: cantidad de deudas, saldo pendiente, " +
      "deudas vencidas, pagadas y parcialmente pagadas. " +
      "Utilizar cuando el usuario pregunte por cantidades, " +
      "totales, indicadores financieros o saldos pendientes.",

    parametersJsonSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },

  // HERRAMIENTA 2:
  // Consultar deudas con los nombres de sus clientes.
  {
    name: "consultarDetalleDeudas",

    description:
      "Consulta hasta 50 deudas activas de la empresa " +
      "autenticada. Devuelve el nombre del cliente, " +
      "descripción, valor original, saldo pendiente, " +
      "fecha de vencimiento y estado de cada deuda. " +
      "Utilizar cuando el usuario pregunte qué clientes " +
      "tienen deudas, quién debe dinero, nombres de " +
      "deudores o detalles de deudas individuales. " +
      "Si hay más de 50 deudas, el resultado puede " +
      "ser incompleto.",

    parametersJsonSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },

  {
    name: "consultarSaldosPorCliente",

    description:
      "Consulta los saldos pendientes agrupados por cliente " +
      "de la empresa autenticada. Devuelve el nombre del cliente, " +
      "la cantidad de deudas pendientes y el saldo pendiente total. " +
      "Ordena los resultados de mayor a menor saldo. " +
      "Utilizar cuando el usuario pregunte cuánto debe cada cliente, " +
      "quién debe más dinero, cuáles son los mayores deudores " +
      "o solicite un ranking de clientes por saldo pendiente. " +
      "Devuelve un máximo de 50 clientes.",

    parametersJsonSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
];

module.exports = { herramientasFinCRM };
