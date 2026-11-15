// Importa el modelo 'CollectionLog' para poder consultar las gestiones previas en la base de datos
const CollectionLog = require("./collectionLog.model");

/**
 * Función auxiliar asíncrona encargada de validar si a un cliente se le puede realizar 
 * un nuevo contacto de cobro, basándose en una frecuencia máxima permitida por semana.
 * 
 * @param {Object} params - Objeto de parámetros de configuración y filtrado.
 * @param {string} params.tenantId - ID de la empresa (Tenant) actual.
 * @param {string} params.clientId - ID del cliente que se desea contactar.
 * @param {Object} [params.tenantSettings={}] - Configuraciones de la empresa (incluye límites de cobranza).
 * @param {Date} [params.now=new Date()] - Fecha base de referencia actual para el cálculo.
 * @returns {Promise<Object>} Retorna un objeto indicando si es válido ('valid: true/false') y un mensaje descriptivo.
 */
const validateContactFrequency = async ({
  tenantId,
  clientId,
  tenantSettings = {},
  now = new Date()
}) => {
  // 1. Obtiene el límite máximo de contactos permitidos por semana desde la configuración de la empresa.
  // Si no está definido, por defecto se establece en 1 contacto por semana.
  const maxContacts =
    tenantSettings.collectionSettings?.maxContactsPerWeek ?? 1;

  // Valida que el límite configurado sea obligatoriamente un número entero mayor o igual a 0.
  if (!Number.isInteger(maxContacts) || maxContacts < 0) {
    return {
      valid: false,
      message: "Configuración de frecuencia no válida"
    };
  }

  // 2. Verificación de integridad de los datos de entrada indispensables:
  // - Que exista un 'tenantId'.
  // - Que exista un 'clientId'.
  // - Que 'now' sea estrictamente una instancia válida del objeto Date de JavaScript.
  if (
    !tenantId ||
    !clientId ||
    !(now instanceof Date) ||
    Number.isNaN(now.getTime())
  ) {
    return {
      valid: false,
      message: "Datos de contacto no válidos"
    };
  }

  // 3. Calcula el intervalo de tiempo exacto de los últimos 7 días 
  // (restando 7 días en milisegundos: 7 días * 24 horas * 60 minutos * 60 segundos * 1000 milisegundos).
  const sevenDaysAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000
  );

  // 4. Cuenta de forma eficiente en MongoDB cuántas gestiones cumple con los criterios restrictivos:
  const contacts = await CollectionLog.countDocuments({
    tenantId: tenantId,
    clientId: clientId,
    // Filtra únicamente los resultados que se consideran "contactos efectivos" 
    // (es decir, cuando sí contestó el cliente o hizo una promesa de pago).
    result: {
      $in: ["CONTACTED", "PROMISE_TO_PAY"]
    },
    // Filtra el rango de tiempo: gestiones realizadas estrictamente en los últimos 7 días ($gt y $lte).
    contactedAt: {
      $gt: sevenDaysAgo,
      $lte: now
    }
  });

  // 5. Comprobación de límite: si la cantidad de contactos efectivos encontrados es mayor o igual al límite permitido...
  if (contacts >= maxContacts) {
    return {
      valid: false,
      message: "Límite de contactos alcanzado",
      contacts,
      maxContacts
    };
  }

  // 6. Si no se ha superado el límite, se permite continuar con el nuevo contacto de cobro.
  return {
    valid: true,
    message: "Frecuencia de contacto permitida",
    contacts,
    maxContacts
  };
};

// Exporta la función para que pueda ser utilizada en los controladores del sistema
module.exports = {
  validateContactFrequency
};