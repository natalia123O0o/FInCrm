'use strict';
const assert = require('node:assert/strict');
const {summarize,percent}=require('../src/modules/campaigns/campaign.stats');
const c=[{_id:'a',name:'Diciembre',status:'ACTIVE',clientIds:['x','y','z'],budget:150000},{_id:'b',name:'Seguimiento',status:'DRAFT',clientIds:['x'],budget:20000}];
const e=[
  {campaignId:'a',clientId:'x',type:'CONTACTED',createdAt:'2026-11-20'},
  {campaignId:'a',clientId:'x',type:'CONTACTED',createdAt:'2026-11-20'},
  {campaignId:'a',clientId:'x',type:'RESPONDED',createdAt:'2026-11-21'},
  {campaignId:'a',clientId:'x',type:'OPPORTUNITY',opportunityId:'opp1',createdAt:'2026-11-22'},
  {campaignId:'a',clientId:'y',type:'OPT_OUT',createdAt:'2026-11-22'}
];
const r=summarize(c,e,[{_id:'opp1',stage:'WON',estimatedValue:400000}]);
assert.equal(r.totals.campaigns,2);
assert.equal(r.totals.contacted,1);
assert.equal(r.totals.responses,1);
assert.equal(r.totals.opportunities,1);
assert.equal(r.totals.won,1);
assert.equal(r.totals.estimatedWonValue,400000);
assert.equal(r.totals.audience,4);
assert.equal(r.totals.plannedBudget,170000);
assert.equal(r.totals.responseRate,100);
assert.equal(r.providerMetrics.delivered,null);
assert.equal(percent(1,0),null);
console.log('OK FinCampaigns: métricas deduplicadas y datos no disponibles.');
