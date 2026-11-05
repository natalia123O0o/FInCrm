
const CollectionLog = require(
  "../modules/collection/collectionLog.model"
);

const {
  validateContactFrequency
} = require("../modules/collection/collection.service");

// Datos simulados para las pruebas
const tenantId = "empresa-prueba";
const clientId = "cliente-prueba";

const tenantSettings = {
  collection: {
    maxContactsPerWeek: 1
  }
};

// Simularemos cuántos contactos encontró MongoDB
let contactosSimulados = 0;

// Reemplazar temporalmente la consulta a MongoDB
CollectionLog.countDocuments = async () => {
  return contactosSimulados;
};

// Ejecutar una prueba
const probar = async (nombre, cantidad, esperado) => {
  contactosSimulados = cantidad;

  const resultado = await validateContactFrequency({
    tenantId,
    clientId,
    tenantSettings,
    now: new Date("2026-11-04T15:00:00Z")
  });

  const correcto = resultado.valid === esperado;

  console.log("---------------------------");
  console.log("Prueba:", nombre);
  console.log("Contactos anteriores:", cantidad);
  console.log("Mensaje:", resultado.message);
  console.log("Estado:", correcto ? "CORRECTO" : "ERROR");

  if (!correcto) {
    process.exitCode = 1;
  }
};

// Ejecutar las pruebas
const ejecutarPruebas = async () => {
  await probar("Primer contacto", 0, true);
  await probar("Segundo contacto", 1, false);
  await probar("Limite superado", 2, false);
};

ejecutarPruebas().catch((error) => {
  console.error("Error al ejecutar pruebas:", error);
  process.exitCode = 1;
});
