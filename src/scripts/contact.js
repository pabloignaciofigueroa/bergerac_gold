export function initContact() {
  const form = document.getElementById('contact-form');
  const status = form.querySelector('.form-status');
  const button = form.querySelector('[type="submit"]');
  const label = button.querySelector('.button-label');
  const icon = button.querySelector('svg');
  const originalIcon = icon.innerHTML;
  const originalLabel = label.dataset.label;
  let busy=false, sent=false, lastPayload='', requestId='';
  function setButton(text, success=false) {
    label.dataset.label=text;button.setAttribute('aria-label',text);
    const textNode=label.querySelector('.button-text') || label;
    textNode.textContent=text;
    icon.innerHTML=success?'<path d="m5 12 4 4L19 6"/>':originalIcon;
    button.dataset.state=success?'sent':busy?'sending':'idle';
  }
  form.addEventListener('input',()=>{
    if (!sent || busy) return;
    sent=false;button.disabled=false;setButton(originalLabel);status.textContent='';
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if (busy || sent || !form.reportValidity()) return;
    const data={
      name:form.elements.nombre.value.trim(),
      email:form.elements.contacto.value.trim(),
      message:form.elements.consulta.value.trim(),
      reference:form.elements.enlace.value.trim(),
      website:form.elements.website.value
    };
    if (!data.name || !data.message) {status.textContent='Completa tu nombre y cuéntanos qué necesitas.';return;}
    const payload=JSON.stringify(data);
    if (payload!==lastPayload) {requestId=crypto.randomUUID();lastPayload=payload;}
    busy=true;button.disabled=true;form.setAttribute('aria-busy','true');
    setButton('Enviando…');
    status.textContent='Enviando tu consulta…';
    try {
      const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,requestId}),signal:AbortSignal.timeout(18000)});
      const result=await response.json();
      if (!response.ok || result.ok!==true) throw new Error(result.message || 'No pudimos confirmar el envío. Vuelve a intentarlo.');
      status.textContent='Tu consulta fue enviada. Te responderemos al correo que indicaste.';
      form.reset();lastPayload='';requestId='';
      sent=true;setButton('Mensaje enviado',true);
    } catch(error) {
      status.textContent=error.name==='TimeoutError' || error instanceof TypeError || error instanceof SyntaxError
        ? 'No pudimos confirmar el envío. Tus datos siguen aquí; vuelve a intentarlo.'
        : error.message;
    } finally {
      busy=false;button.disabled=sent;form.removeAttribute('aria-busy');
      if (!sent) setButton('Reintentar envío');
    }
  });
}
