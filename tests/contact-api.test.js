import test from 'node:test';
import assert from 'node:assert/strict';
import handler,{validateContact,allowAttempt} from '../api/contact.js';
const data={name:'Ana',email:'ana@example.com',message:'Necesito una web.',reference:'',website:'',requestId:'12345678-1234-4234-8234-123456789012'};
test('rechaza datos incompletos, correo inválido y cabeceras inyectadas',()=>{
 assert.ok(validateContact(data));
 for(const change of [{email:'12345678'},{name:'Ana\r\nBcc: x'},{message:' '},{message:'a'.repeat(4001)},{requestId:'bad'}])assert.equal(validateContact({...data,...change}),null);
});
test('limita intentos y permite volver después del intervalo',()=>{
 for(let i=0;i<5;i++)assert.equal(allowAttempt('test-limit',1000),true);
 assert.equal(allowAttempt('test-limit',1000),false);
 assert.equal(allowAttempt('test-limit',602000),true);
});
function res(){return {code:0,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(body){this.body=body;return this}}}
test('envío validado, destinatario fijo, error y origen no autorizado',async()=>{
 const original=globalThis.fetch;
 process.env.CONTACT_ALLOWED_ORIGINS='https://bergerac.cl';process.env.CONTACT_FROM='Bergerac <web@bergerac.cl>';process.env.RESEND_API_KEY='test-only';
 try {
  let sent;
  globalThis.fetch=async(url,options)=>{sent={url,...options};return {ok:true,json:async()=>({id:'accepted'})}};
  const req={method:'POST',headers:{origin:'https://bergerac.cl','content-type':'application/json','x-forwarded-for':'test-api'},body:{...data,to:'attacker@example.com'}};
  let out=res();await handler(req,out);assert.equal(out.code,200);const email=JSON.parse(sent.body);assert.deepEqual(email.to,['pablo@bergerac.cl']);assert.equal(email.reply_to,data.email);assert.equal(sent.headers['Idempotency-Key'],'contact/'+data.requestId);
  out=res();await handler({...req,headers:{...req.headers,origin:'https://evil.example'}},out);assert.equal(out.code,403);
  globalThis.fetch=async()=>({ok:false});out=res();await handler(req,out);assert.equal(out.code,502);assert.equal(out.body.ok,false);
  delete process.env.RESEND_API_KEY;out=res();await handler(req,out);assert.equal(out.code,503);
 }finally{globalThis.fetch=original;delete process.env.CONTACT_ALLOWED_ORIGINS;delete process.env.CONTACT_FROM;delete process.env.RESEND_API_KEY;}
});
