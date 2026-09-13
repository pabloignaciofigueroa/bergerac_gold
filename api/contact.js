const buckets = new Map();
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
export function validateContact(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const limits = {name:150,email:200,message:4000,reference:2048};
  const clean = {};
  for (const [key,limit] of Object.entries(limits)) {
    if (typeof data[key] !== 'string' || data[key].length > limit) return null;
    clean[key] = data[key].trim();
  }
  if (!clean.name || !clean.message || !emailPattern.test(clean.email) || /[\r\n]/.test(clean.name)) return null;
  if (!/^[a-f0-9-]{36}$/i.test(data.requestId || '')) return null;
  clean.requestId = data.requestId;
  return clean;
}
export function allowAttempt(ip, now=Date.now()) {
  for (const [key,value] of buckets) if (value.until <= now) buckets.delete(key);
  if (!buckets.has(ip)) {
    if (buckets.size >= 10000) return false;
    buckets.set(ip,{count:0,until:now+600000});
  }
  return ++buckets.get(ip).count <= 5;
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  const fail=(code,message)=>res.status(code).json({ok:false,message});
  if (req.method !== 'POST') {res.setHeader('Allow','POST');return fail(405,'Usa el formulario para enviar tu consulta.');}
  const allowed=(process.env.CONTACT_ALLOWED_ORIGINS || '').split(',').map(s=>s.trim()).filter(Boolean);
  if (!allowed.includes(req.headers.origin)) return fail(403,'No se pudo validar el origen de la consulta.');
  if (!(req.headers['content-type'] || '').startsWith('application/json')) return fail(415,'Formato de consulta no válido.');
  let data=req.body;
  try {
    if (Buffer.byteLength(typeof data==='string'?data:JSON.stringify(data ?? {}))>24000) return fail(413,'La consulta es demasiado extensa.');
    if (typeof data==='string') data=JSON.parse(data);
  } catch {return fail(400,'Revisa los datos de tu consulta.');}
  if (data?.website) return fail(400,'No se pudo validar la consulta.');
  const contact=validateContact(data);
  if (!contact) return fail(400,'Revisa tu nombre, correo y mensaje.');
  const ip=String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (!allowAttempt(ip)) {res.setHeader('Retry-After','600');return fail(429,'Has realizado varios intentos. Espera unos minutos antes de volver a enviar.');}
  if (!process.env.RESEND_API_KEY || !process.env.CONTACT_FROM) return fail(503,'El envío no está disponible por el momento. Inténtalo más tarde.');
  try {
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',signal:AbortSignal.timeout(12000),
      headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`contact/${contact.requestId}`},
      body:JSON.stringify({from:process.env.CONTACT_FROM,to:['pablo@bergerac.cl'],reply_to:contact.email,
        subject:`Conversemos — ${contact.name}`,
        text:`Nombre: ${contact.name}\nCorreo: ${contact.email}\n\nConsulta:\n${contact.message}${contact.reference?`\n\nReferencia: ${contact.reference}`:''}`})
    });
    if (!response.ok) return fail(502,'No pudimos confirmar el envío. Conservamos tus datos para que puedas reintentar.');
    const result=await response.json();
    if (!result.id) return fail(502,'No pudimos confirmar el envío. Vuelve a intentarlo.');
    return res.status(200).json({ok:true});
  } catch {return fail(502,'No pudimos confirmar el envío. Conservamos tus datos para que puedas reintentar.');}
}
