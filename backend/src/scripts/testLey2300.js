
const {
  validateBasicContactRules
} = require("../modules/collection/ley2300.rules");

// Configuración de nuestra empresa
const tenantSettings = {
  timezone: "America/Bogota",
  collection: {
    allowedChannels: ["email", "sms"]
  }
};

// Casos que vamos a probar
const pruebas = [
  {
    nombre: "Martes a las 10:00 a. m.",
    fecha: "2026-11-03T15:00:00Z",
    canal: "email",
    esperado: true
  },
  {
    nombre: "Martes a las 8:00 p. m.",
    fecha: "2026-11-04T01:00:00Z",
    canal: "email",
    esperado: false
  },
  {
    nombre: "Sabado a las 9:00 a. m.",
    fecha: "2026-11-07T14:00:00Z",
    canal: "sms",
    esperado: true
  },
  {
    nombre: "Sabado a las 4:00 p. m.",
    fecha: "2026-11-07T21:00:00Z",
    canal: "sms",
    esperado: false
  },
  {
    nombre: "Domingo a las 10:00 a. m.",
    fecha: "2026-11-08T15:00:00Z",
    canal: "email",
    esperado: false
  },
  {
    nombre: "Martes con WhatsApp no autorizado",
    fecha: "2026-11-03T15:00:00Z",
    canal: "whatsapp",
    esperado: false
  }
];

// Ejecutar las pruebas
for (const prueba of pruebas) {
  const resultado = validateBasicContactRules({
    channel: prueba.canal,
    date: new Date(prueba.fecha),
    tenantSettings
  });

  const correcto = resultado.valid === prueba.esperado;

  console.log("-----------------------------");
  console.log("Prueba:", prueba.nombre);
  console.log("Resultado:", resultado.message);
  console.log("Estado:", correcto ? "CORRECTO" : "ERROR");
}
