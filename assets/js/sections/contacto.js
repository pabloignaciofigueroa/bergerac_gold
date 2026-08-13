/* ============================================================
   06 · CONTACTO — Cierre sobrio + premio ganado
   Comanda: 06_COMANDA_06_CONTACTO_BERGERAC.md

   - Grilla tonal apenas perceptible que respira; sin tracking,
     sin halo, sin magnetismo.
   - Formulario protagonista: validación accesible, envío async
     real (data-endpoint) o simulado si no hay backend definido.
   - Chiki + Benito SOLO tras confirmación real de éxito.
   ============================================================ */

const CHIKI_SVG = `
<svg class="contacto__chiki" viewBox="0 0 150 110" aria-hidden="true">
  <g fill="none" stroke="#252522" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
    <!-- cuerpo sentado, un poco vencido -->
    <path d="M38 96 C 34 76, 40 60, 56 54 C 74 47, 92 50, 100 62 C 107 72, 106 88, 104 96" />
    <!-- pata delantera -->
    <path d="M66 96 L 66 78" />
    <path d="M80 96 L 79 80" />
    <!-- cola con curva torpe -->
    <path d="M104 88 C 116 86, 124 78, 121 68" />
    <!-- cabeza inclinada -->
    <path d="M44 58 C 34 52, 30 40, 36 30 C 42 20, 58 17, 68 23 C 76 28, 79 38, 74 47" />
    <!-- oreja caída -->
    <path d="M38 28 C 30 34, 28 46, 33 54 C 36 58, 42 58, 44 54" />
    <!-- oreja arriba, imperfecta -->
    <path d="M58 19 C 58 12, 64 8, 68 12 C 71 15, 70 21, 67 23" />
    <!-- hocico -->
    <path d="M36 36 C 30 37, 27 41, 29 45" />
    <circle cx="29" cy="44" r="1.6" fill="#252522" stroke="none" />
    <!-- ojo tranquilo -->
    <circle class="ojo" cx="48" cy="36" r="2" fill="#252522" stroke="none" />
    <!-- mancha -->
    <path d="M88 62 C 93 64, 95 70, 92 74" />
  </g>
</svg>`;

const BENITO_SVG = `
<svg class="contacto__benito" viewBox="0 0 120 64" aria-hidden="true">
  <g fill="none" stroke="#252522" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
    <!-- borde donde se apoya (coincide con el borde de la tarjeta) -->
    <!-- orejas desparejas -->
    <path d="M30 28 L 33 12 L 44 22" />
    <path d="M64 21 L 72 8 L 79 20" />
    <!-- cabeza asomando -->
    <path d="M26 44 C 24 30, 34 20, 52 19 C 70 18, 82 26, 83 40 C 83 42, 83 43, 82 44" />
    <!-- ojos: mirando por encima del borde -->
    <g class="ojos">
      <circle cx="45" cy="36" r="2.2" fill="#252522" stroke="none" />
      <circle cx="66" cy="35" r="2.2" fill="#252522" stroke="none" />
    </g>
    <!-- garritas sobre el borde -->
    <path d="M34 44 C 34 48, 40 48, 40 44" />
    <path d="M48 44 C 48 48, 54 48, 54 44" />
    <path d="M64 44 C 64 48, 70 48, 70 44" />
  </g>
</svg>`;

export function initContacto({ gsap, prefersReduced, registerScene, wake, ScrollTrigger }) {
  const section = document.querySelector('#contacto');
  if (!section) return;
  const form = section.querySelector('.contacto__form');
  const sent = section.querySelector('.contacto__sent');
  const canvas = section.querySelector('.contacto__grid');

  /* ---- Grilla tonal que respira ---- */
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const SPACING = 56;
    const SAMPLE = 28;
    let W = 0, H = 0;
    const mouse = { x: -9e3, y: -9e3, in: false };
    const eased = { x: -9e3, y: -9e3, k: 0 };

    function measure() {
      const r = section.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    const off = (x, y, t) => {
      /* respiración ambiental + influencia mínima del mouse (pocos px) */
      let dx = Math.sin(t * .32 + y * .011) * 1.3;
      let dy = Math.cos(t * .27 + x * .013) * 1.3;
      const mdx = x - eased.x, mdy = y - eased.y;
      const d2 = mdx * mdx + mdy * mdy;
      if (d2 < 220 * 220) {
        const d = Math.sqrt(d2) || 1;
        const f = (1 - d / 220) * 3 * eased.k;
        dx += (mdx / d) * f;
        dy += (mdy / d) * f;
      }
      return [x + dx, y + dy];
    };
    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(140, 98, 0, 0.30)'; /* tono más oscuro del mismo amarillo */
      ctx.lineWidth = 1;
      for (let gx = SPACING / 2; gx < W; gx += SPACING) {
        ctx.beginPath();
        for (let y = 0; y <= H; y += SAMPLE) {
          const [px, py] = off(gx, y, t);
          y === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      for (let gy = SPACING / 2; gy < H; gy += SPACING) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += SAMPLE) {
          const [px, py] = off(x, gy, t);
          x === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
    measure();
    window.addEventListener('resize', () => { measure(); });
    if (prefersReduced) {
      draw(0);
    } else {
      section.addEventListener('pointermove', (ev) => {
        if (ev.pointerType && ev.pointerType !== 'mouse') return;
        const r = section.getBoundingClientRect();
        mouse.x = ev.clientX - r.left;
        mouse.y = ev.clientY - r.top;
        mouse.in = true;
      });
      section.addEventListener('pointerleave', () => { mouse.in = false; });
      const scene = registerScene({
        active: false,
        render(dt, t) {
          eased.x += (mouse.x - eased.x) * Math.min(1, dt * 2);
          eased.y += (mouse.y - eased.y) * Math.min(1, dt * 2);
          eased.k += ((mouse.in ? 1 : 0) - eased.k) * Math.min(1, dt * 1.6);
          draw(t);
        },
      });
      if (ScrollTrigger) {
        ScrollTrigger.create({
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => { scene.active = self.isActive; if (self.isActive) wake(); },
        });
      }
    }
  }

  /* ---- Formulario: validación + envío + premio ---- */
  if (!form) return;
  const submitBtn = form.querySelector('.contacto__submit');

  /* el error se disuelve en cuanto la persona corrige el campo */
  form.querySelectorAll('input, textarea').forEach((el) => {
    el.addEventListener('input', () => {
      const group = el.closest('.contacto__group');
      if (group && group.classList.contains('has-error')) setError(el, '');
    });
  });

  function setError(input, msg) {
    const group = input.closest('.contacto__group');
    if (!group) return;
    const slot = group.querySelector('.contacto__error');
    group.classList.toggle('has-error', !!msg);
    if (slot) slot.textContent = msg || '';
    if (msg) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  function validate() {
    let firstBad = null;
    const nombre = form.querySelector('#c-nombre');
    const email = form.querySelector('#c-email');
    const contexto = form.querySelector('#c-contexto');
    if (!nombre.value.trim()) { setError(nombre, 'Completa este campo.'); firstBad = firstBad || nombre; }
    else setError(nombre, '');
    if (!email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      setError(email, 'Revisa este correo.');
      firstBad = firstBad || email;
    } else setError(email, '');
    if (!contexto.value.trim()) { setError(contexto, 'Completa este campo.'); firstBad = firstBad || contexto; }
    else setError(contexto, '');
    return firstBad;
  }

  async function send(data) {
    const endpoint = form.dataset.endpoint;
    if (endpoint) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('endpoint ' + res.status);
      return true;
    }
    /* sin backend configurado: el flujo async se completa localmente */
    await new Promise(r => setTimeout(r, 900));
    return true;
  }

  function premio() {
    /* Chiki aparece tranquila; Benito se asoma desde donde no debería. */
    sent.insertAdjacentHTML('beforeend', CHIKI_SVG + BENITO_SVG);
    const chiki = sent.querySelector('.contacto__chiki');
    const benito = sent.querySelector('.contacto__benito');
    if (prefersReduced || !gsap) return;
    gsap.from(chiki, { y: 10, opacity: 0, duration: .7, ease: 'power2.out', delay: .5 });
    gsap.from(benito, { y: 26, duration: .8, ease: 'power3.out', delay: 1.15 });
    gsap.to(benito, { rotate: -4, duration: .5, ease: 'power1.inOut', delay: 2.1, transformOrigin: '50% 90%' });
    /* pestañeo doble y quietud */
    const ojos = benito.querySelector('.ojos');
    if (ojos) {
      const blink = () => gsap.fromTo(ojos, { scaleY: 1 }, { scaleY: .1, yoyo: true, repeat: 1, duration: .09, transformOrigin: '50% 50%' });
      gsap.delayedCall(2.5, blink);
      gsap.delayedCall(3.1, blink);
    }
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const bad = validate();
    if (bad) { bad.focus(); return; }
    submitBtn.disabled = true;
    const prev = submitBtn.textContent;
    submitBtn.textContent = 'Enviando…';
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      await send(data);
      /* confirmación REAL de éxito: recién ahora existe el premio */
      form.hidden = true;
      sent.hidden = false;
      /* la página encoge al retirarse el formulario: reencuadrar al inicio
         de la sección — amarillo de borde a borde, créditos finales */
      section.scrollIntoView({ block: 'start', behavior: prefersReduced ? 'auto' : 'smooth' });
      if (!prefersReduced && gsap) {
        gsap.from(sent, { y: 18, opacity: 0, duration: .6, ease: 'power2.out' });
      }
      premio();
    } catch (e) {
      submitBtn.disabled = false;
      submitBtn.textContent = prev;
      let err = form.querySelector('.contacto__send-error');
      if (!err) {
        err = document.createElement('p');
        err.className = 'contacto__error contacto__send-error';
        err.setAttribute('role', 'alert');
        submitBtn.insertAdjacentElement('afterend', err);
      }
      err.textContent = 'No pudimos enviar tu mensaje. Inténtalo nuevamente.';
    }
  });
}
