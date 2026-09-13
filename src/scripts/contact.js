export function initContact() {
  const form = document.getElementById('contact-form');
  const status = form.querySelector('.form-status');
  const button = form.querySelector('[type="submit"]');
  const label = button.querySelector('.button-label');
  const icon = button.querySelector('svg');
  const originalIcon = icon.innerHTML;
  const originalLabel = label.dataset.label;
  const fields = [...form.querySelectorAll('.form-field input,.form-field textarea')];
  const validation = document.createElement('div');
  validation.className='form-validation';validation.id='contact-validation';
  validation.setAttribute('role','alert');validation.hidden=true;
  validation.innerHTML='<span class="form-validation-icon" aria-hidden="true">!</span><span class="form-validation-text"></span>';
  form.append(validation);
  let invalidField;
  function clearValidation() {
    if (invalidField) {
      invalidField.removeAttribute('aria-invalid');
      const descriptions=(invalidField.getAttribute('aria-describedby') || '').split(' ').filter(id=>id && id!==validation.id);
      if(descriptions.length)invalidField.setAttribute('aria-describedby',descriptions.join(' '));
      else invalidField.removeAttribute('aria-describedby');
    }
    invalidField=null;validation.hidden=true;
  }
  function validate() {
    clearValidation();
    const field=fields.find(field=>!field.validity.valid || (field.required&&!field.value.trim()));
    if (!field) return true;
    invalidField=field;
    const message=!field.value.trim()?'Completa este campo.':field.validity.typeMismatch?'Escribe un correo válido, como nombre@dominio.cl.':'Revisa este campo.';
    validation.querySelector('.form-validation-text').textContent=message;
    field.closest('.form-field').append(validation);
    field.setAttribute('aria-invalid','true');
    field.setAttribute('aria-describedby',`${field.getAttribute('aria-describedby') || ''} ${validation.id}`.trim());
    validation.hidden=false;field.focus();
    return false;
  }
  // Keep native constraints as the validation source without browser-owned bubbles.
  form.noValidate=true;
  form.addEventListener('input',event=>{if(event.target===invalidField)clearValidation();});
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
    if (busy || sent || !validate()) return;
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
