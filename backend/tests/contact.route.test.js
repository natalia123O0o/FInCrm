'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const routes = require('../src/modules/publicSite/contact.routes');

const valid = {
  nombre: 'Andrea Perez', empresa: 'Empresa de prueba', correo: 'andrea@example.com',
  telefono: '3001234567', planInteres: 'BUSINESS',
  mensaje: 'Quiero conocer las cotizaciones inteligentes.', aceptaDatos: true, website: '',
};

async function postJson(server, body) {
  const { port } = server.address();
  return await new Promise((resolve, reject) => {
    const req = http.request({ hostname:'127.0.0.1', port, path:'/api/contact', method:'POST', headers:{ 'content-type':'application/json' } }, res=>{
      let text='';
      res.on('data', chunk=>text+=chunk);
      res.on('end',()=>resolve({ status:res.statusCode, body:JSON.parse(text) }));
    });
    req.on('error', reject);
    req.end(JSON.stringify(body));
  });
}

test('Contacto publico: validacion, config Brevo y entrega simulada por proveedor', async()=>{
  const app=express(); app.use(express.json()); app.use('/api/contact',routes);
  const server=app.listen(0);
  const oldFetch=global.fetch;
  const oldValues = Object.fromEntries(['BREVO_API_KEY','BREVO_SENDER_EMAIL','BREVO_TO_EMAIL','BREVO_TEMPLATE_ID'].map(k=>[k,process.env[k]]));
  try {
    let res=await postJson(server, {...valid, correo:'correo-invalido'});
    assert.equal(res.status,400);
    delete process.env.BREVO_API_KEY;
    delete process.env.BREVO_SENDER_EMAIL;
    delete process.env.BREVO_TO_EMAIL;
    res=await postJson(server,valid);
    assert.equal(res.status,503);

    process.env.BREVO_API_KEY='test-key-not-real';
    process.env.BREVO_SENDER_EMAIL='sender@example.com';
    process.env.BREVO_TO_EMAIL='equipo@example.com';
    delete process.env.BREVO_TEMPLATE_ID;
    let intercepted=null;
    global.fetch=async (url, options)=>{intercepted={url,...options}; return {ok:true,status:201};};
    res=await postJson(server,{...valid,empresa:'Prueba <script>alert(1)</script>'});
    assert.equal(res.status,201);
    assert.equal(res.body.ok,true);
    assert.equal(intercepted.url,'https://api.brevo.com/v3/smtp/email');
    const payload=JSON.parse(intercepted.body);
    assert.equal(payload.to[0].email,'equipo@example.com');
    assert.equal(payload.replyTo.email,valid.correo);
    assert.equal(payload.htmlContent.includes('<script>'),false);
    assert.equal(payload.htmlContent.includes('&lt;script&gt;'),true);
    assert.equal(intercepted.headers['api-key'],'test-key-not-real');
    global.fetch=async()=>({ok:false,status:401,text:async()=> 'INVALID_API_KEY'});
    res=await postJson(server,valid);
    assert.equal(res.status,502);
  } finally {
    global.fetch=oldFetch;
    for (const [key,value] of Object.entries(oldValues)) {
      if(value===undefined)delete process.env[key]; else process.env[key]=value;
    }
    await new Promise(resolve=>server.close(resolve));
  }
});
