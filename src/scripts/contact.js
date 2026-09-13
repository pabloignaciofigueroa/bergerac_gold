export function initContact() {
  const form = document.getElementById('contact-form');
  const channel = document.getElementById('contact-channel');
  channel.addEventListener('input',()=>channel.setCustomValidity(''));
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const value = channel.value.trim();
    const digits = value.replace(/\D/g,'');
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || (/^[+\d\s().-]+$/.test(value) && digits.length>=8 && digits.length<=15);
    if (!valid){channel.setCustomValidity('Escribe un correo o un número de WhatsApp válido.');channel.reportValidity();return;}
    if (!form.reportValidity()) return;
    const name = document.getElementById('contact-name').value.trim();
    const message = document.getElementById('contact-message').value.trim();
    if (!name || !message){form.querySelector('.form-status').textContent='Completa tu nombre y cuéntanos qué necesitas.';return;}
    const reference = document.getElementById('contact-reference').value.trim();
    const body = `Tu nombre: ${name}\nTu correo o WhatsApp: ${value}\n\nCuéntanos qué necesitas:\n${message}${reference?`\n\nComparte un enlace: ${reference}`:''}`;
    form.querySelector('.form-status').textContent='Se abrirá tu aplicación de correo para enviar la consulta.';
    location.href=`mailto:pablo@bergerac.cl?subject=${encodeURIComponent('Comencemos — '+name)}&body=${encodeURIComponent(body)}`;
  });
}
