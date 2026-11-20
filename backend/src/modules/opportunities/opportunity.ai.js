const { GoogleGenAI } = require('@google/genai');

// Solo enviamos a Gemini datos estructurados de la oportunidad.
// Nunca nombres, teléfonos, documentos, correos o notas libres.
async function recommendOpportunity(opportunity) {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error('Configura GEMINI_API_KEY en el backend para utilizar recomendaciones.');
    error.code = 'NO_GEMINI_KEY';
    throw error;
  }

  const encounters = opportunity.encounters.slice(-15).map(item => ({
    type: item.type,
    outcome: item.outcome,
    daysAgo: Math.max(0, Math.floor((Date.now() - new Date(item.happenedAt).getTime()) / 86400000)),
    hasFollowup: Boolean(item.nextAction)
  }));
  const input = {
    stage: opportunity.stage,
    encounterCount: opportunity.encounters.length,
    encounters,
    hasCloseDate: Boolean(opportunity.expectedCloseAt)
  };
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: process.env.FINCRM_OPPORTUNITY_GEMINI_MODEL || 'gemini-3.5-flash-lite',
    contents: JSON.stringify(input),
    config: {
      systemInstruction: `Eres asesor comercial de FinCRM. Responde en español, máximo 180 palabras. Usa SOLO los datos estructurados proporcionados. Nunca inventes acuerdos, preferencias ni promesas del cliente. Explica con los apartados: 1) Siguiente acción sugerida, 2) Por qué, 3) Qué validar con el cliente. Si hay pocos datos, dilo. No ordenes comunicaciones automáticas ni operaciones financieras. No garantices cierres de ventas.`,
      temperature: 0.2,
      maxOutputTokens: 500,
      httpOptions: { timeout: 20000 }
    }
  });
  const text = typeof response.text === 'string' ? response.text.trim() : '';
  if (!text) throw new Error('Gemini no devolvió una recomendación.');
  return text.slice(0, 5000);
}

module.exports = { recommendOpportunity };
