'use strict';
const id = v => String(v?._id || v || '');
const percent = (n, d) => d ? Math.round(n / d * 1000) / 10 : null;

// KPIs calculados exclusivamente a partir de registros confirmados.
// Sin webhooks no existen datos de entrega, apertura o clics.
function summarize(campaigns, events, opportunities = []) {
  const opp = new Map(opportunities.map(o => [id(o), o]));
  const buckets = new Map(campaigns.map(c => [id(c), {
    id: id(c), name: c.name, status: c.status,
    audience: (c.clientIds || []).length,
    budget: Number(c.budget || 0),
    contactedSet: new Set(), responseSet: new Set(), optOutSet: new Set(), opportunitySet: new Set(), opportunityClientSet: new Set()
  }]));
  const trend = new Map();
  for (const event of events) {
    const b = buckets.get(id(event.campaignId));
    if (!b) continue;
    const client = id(event.clientId);
    if (event.type === 'CONTACTED') b.contactedSet.add(client);
    if (event.type === 'RESPONDED') b.responseSet.add(client);
    if (event.type === 'OPT_OUT') b.optOutSet.add(client);
    if (event.type === 'OPPORTUNITY' && event.opportunityId) { b.opportunitySet.add(id(event.opportunityId)); b.opportunityClientSet.add(client); }
    const date = new Date(event.createdAt);
    if (!Number.isNaN(date.getTime())) {
      const month = date.toISOString().slice(0, 7);
      const entry = trend.get(month) || { month, contacts: 0, responses: 0, opportunities: 0 };
      if (event.type === 'CONTACTED') entry.contacts++;
      if (event.type === 'RESPONDED') entry.responses++;
      if (event.type === 'OPPORTUNITY') entry.opportunities++;
      trend.set(month, entry);
    }
  }
  const byCampaign = [...buckets.values()].map(b => {
    const won = [...b.opportunitySet].map(k => opp.get(k)).filter(o => o?.stage === 'WON');
    const contacted = b.contactedSet.size;
    const responses = b.responseSet.size;
    return {
      id: b.id, name: b.name, status: b.status, audience: b.audience, budget: b.budget,
      contacted, responses, optOuts: b.optOutSet.size,
      opportunities: b.opportunitySet.size,
      opportunityClients: b.opportunityClientSet.size,
      won: won.length,
      estimatedWonValue: won.reduce((s, o) => s + (Number(o.estimatedValue) || 0), 0),
      responseRate: percent(responses, contacted),
      opportunityRate: percent(b.opportunityClientSet.size, contacted)
    };
  });
  const sum = key => byCampaign.reduce((s, item) => s + item[key], 0);
  const totals = {
    campaigns: campaigns.length,
    active: campaigns.filter(c => c.status === 'ACTIVE').length,
    audience: sum('audience'), // Sum of campaign recipients: repeats across campaigns are counted.
    contacted: sum('contacted'), // Distinct per campaign, not a unique global contact count.
    responses: sum('responses'),
    opportunities: sum('opportunities'),
    won: sum('won'),
    estimatedWonValue: sum('estimatedWonValue'),
    plannedBudget: sum('budget'),
    optOuts: sum('optOuts')
  };
  totals.responseRate = percent(totals.responses, totals.contacted);
  totals.opportunityRate = percent(byCampaign.reduce((s, item) => s + (Number(item.opportunityClients) || 0), 0), totals.contacted);
  return {
    totals, byCampaign, trend: [...trend.values()].sort((a,b) => a.month.localeCompare(b.month)),
    providerMetrics: { delivered: null, opens: null, clicks: null, bounces: null, unsubscribes: null },
    definitions: {
      contacted: 'Clientes con contacto registrado manualmente, no entregas verificadas por el proveedor.',
      responses: 'Clientes con respuesta registrada manualmente.',
      estimatedWonValue: 'Suma del valor estimado de oportunidades ganadas vinculadas; no representa ingresos facturados.',
      audience: 'Clientes seleccionados en campañas; una persona puede aparecer en varias.'
    }
  };
}
module.exports = { summarize, percent };
