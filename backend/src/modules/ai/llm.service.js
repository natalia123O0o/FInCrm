const { GoogleGenAI } = require("@google/genai");
const { herramientasFinCRM } = require("./ai.tools");
const {
  consultarResumenCartera,
  consultarDetalleDeudas,
  consultarSaldosPorCliente,
} = require("./cartera.tools");

// Modelo que ya ha funcionado en FinCRM.
// Podemos cambiarlo después de verificar otro modelo disponible.
const MODELO = "gemini-3.5-flash-lite";

// Crea el cliente de Google Gemini.
const crearClienteIA = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY no está configurada");
  }

  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
};

// Responde preguntas generales utilizando Gemini.
const generarRespuesta = async (pregunta) => {
  const ai = crearClienteIA();
  const inicio = Date.now();

  try {
    console.log("Consulta general a FinCRM IA");

    const respuesta = await ai.models.generateContent({
      model: MODELO,
      contents: pregunta,
      config: {
        httpOptions: {
          timeout: 20000,
        },
      },
    });

    const duracion = Date.now() - inicio;

    console.log(`Tiempo de respuesta de FinCRM IA: ${duracion} ms`);

    return respuesta.text || "No pude generar una respuesta.";
  } catch (error) {
    const duracion = Date.now() - inicio;

    console.error(
      `Error de FinCRM IA después de ${duracion} ms:`,
      error.message,
    );

    throw error;
  }
};

// Responde preguntas empresariales utilizando herramientas
// autorizadas que consultan información real de MongoDB.
const generarRespuestaEmpresarial = async (pregunta, tenantId, actor = {}) => {
  if (!tenantId) {
    throw new Error("Empresa no identificada");
  }

  const ai = crearClienteIA();
  const inicio = Date.now();
  const canUseCompanyTools = actor.role === 'ADMIN';

  const instrucciones = `
    Eres FinCRM IA, un asistente empresarial.

    Responde siempre en español, de manera clara,
    profesional y fácil de entender.

    Cuando el usuario pregunte por información
    financiera o privada de su empresa,
    utiliza las herramientas disponibles.

    Nunca inventes nombres, clientes, pagos,
    deudas, fechas ni cantidades.

    Utiliza exclusivamente los resultados
    verificados que entregan las herramientas.

    Si los resultados no contienen la información
    solicitada, explica qué datos faltan.

    No afirmes tener acceso a información
    que no fue proporcionada por las herramientas.

    No realices modificaciones en los datos.
    ${canUseCompanyTools ? '' : 'No tienes herramientas para consultar cartera, clientes ni datos privados de la empresa. No afirmes conocerlos. Ayuda con orientación general y con el texto que comparte el usuario.'}
  `;

  try {
    // PASO 1: Gemini interpreta la pregunta.
    const primeraRespuesta = await ai.models.generateContent({
      model: MODELO,
      contents: pregunta,
      config: {
        systemInstruction: instrucciones,
        httpOptions: {
          timeout: 30000,
        },
        maxOutputTokens: 800,
        ...(canUseCompanyTools ? { tools: [
          {
            functionDeclarations: herramientasFinCRM,
          },
        ] } : {}),
      },
    });

    // PASO 2: Revisamos si Gemini solicitó una herramienta.
    const llamadas = primeraRespuesta.functionCalls ?? [];

    // Si la pregunta es general, no necesita MongoDB.
    if (llamadas.length === 0) {
      return primeraRespuesta.text || "No pude generar una respuesta.";
    }

    // PASO 3: Verificamos que la herramienta esté autorizada.

    // PASO 3: Validamos que Gemini solicite una
    // única herramienta autorizada.
    if (llamadas.length !== 1) {
      throw new Error("Número de herramientas no permitido");
    }

    const llamada = llamadas[0];
    let resultado;
    // No aceptar una herramienta inventada por el modelo o una sesión de
    // empleado que intente consultar la cartera completa de la empresa.
    if (!canUseCompanyTools) throw new Error('Herramienta no autorizada para este rol');
    const Tenant = require('../tenants/tenant.model');
    const User = require('../users/user.model');
    const { effectiveUserStatus } = require('../users/user.status');
    const { assertFeature, accessError } = require('../../middlewares/feature.middleware');
    const currentTenant = await Tenant.findById(tenantId);
    assertFeature(currentTenant, 'ai');
    assertFeature(currentTenant, 'crm');
    const currentActor = await User.findOne({ _id: actor.actorId, tenantId, role: 'ADMIN' });
    if (!currentActor || effectiveUserStatus(currentActor) !== 'ACTIVE' ||
        (currentActor.tokenVersion || 0) !== actor.tokenVersion) {
      throw accessError('USER_UNAVAILABLE', 'La cuenta ya no tiene acceso.', 401);
    }

    // Ejecutamos únicamente herramientas conocidas.

    switch (llamada.name) {
      case "consultarResumenCartera":
        resultado = await consultarResumenCartera(tenantId);
        break;

      case "consultarDetalleDeudas":
        resultado = await consultarDetalleDeudas(tenantId);
        break;

      case "consultarSaldosPorCliente":
        resultado = await consultarSaldosPorCliente(tenantId);
        break;

      default:
        throw new Error("Herramienta no autorizada");
    }

    // PASO 5: Recuperamos la respuesta original de Gemini.
    const contenidoModelo = primeraRespuesta.candidates?.[0]?.content;

    if (!contenidoModelo) {
      throw new Error("Respuesta de Gemini incompleta");
    }

    // PASO 6: Devolvemos a Gemini los datos reales de MongoDB.
    const segundaRespuesta = await ai.models.generateContent({
      model: MODELO,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: pregunta,
            },
          ],
        },
        contenidoModelo,
        {
          role: "user",
          parts: [
            {
              functionResponse: {
                name: llamada.name,
                ...(llamada.id ? { id: llamada.id } : {}),
                response: {
                  resultado,
                },
              },
            },
          ],
        },
      ],
      config: {
        systemInstruction: instrucciones,
        maxOutputTokens: 1200,
        httpOptions: {
          timeout: 30000,
        },
      },
    });

    // PASO 7: Gemini redacta la respuesta usando los datos.
    const respuestaFinal =
      segundaRespuesta.text ||
      "No pude interpretar los resultados de la consulta.";

    const duracion = Date.now() - inicio;

    console.log(`Consulta empresarial completada en ${duracion} ms`);

    return respuestaFinal;
  } catch (error) {
    const duracion = Date.now() - inicio;

    console.error(
      `Error en consulta empresarial después de ${duracion} ms:`,
      error.message,
    );

    throw error;
  }
};

module.exports = {
  generarRespuesta,
  generarRespuestaEmpresarial,
};
