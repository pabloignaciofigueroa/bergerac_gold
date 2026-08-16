/* ============================================================
   AUDITORÍA DE TIPOGRAFÍA

   Los textos son lo que se vende. Esto revisa, para CADA texto de la página
   y en los tres tamaños de pantalla:

     · qué familia pide y cuál se pinta de verdad
     · si el peso que pide EXISTE en el archivo o se lo inventa el navegador
     · si la cursiva que pide existe o es una inclinación falsa
     · talla, tracking, interlínea, caja
     · QUÉ REGLA GANA y de dónde viene: token global, hoja de sección,
       regla específica, media query o estilo puesto por JS

   POR QUÉ HAY QUE MEDIRLO Y NO LEER EL CSS. Tres razones que ya han mordido
   en este proyecto: las tallas salen de `clamp()`, hay reglas escondidas
   dentro del atajo `font:` —donde el peso no aparece si buscas
   `font-weight`—, y hay pesos que no se declaran en ninguna parte porque se
   HEREDAN (el `+` de los plegables) o los pone el navegador por defecto
   (`h3` y `h4` vienen en negrita).

   Uso:  node tools/qa/auditoria-tipografia.mjs
   Deja el detalle en qa-out/tipografia/auditoria.json
   ============================================================ */

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CHROMES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const puppeteer = (await import('puppeteer-core')).default;
const chrome = CHROMES.find(existsSync);
if (!chrome) { console.error('No encuentro Chrome.'); process.exit(1); }

const BASE = process.env.QA_URL || 'http://127.0.0.1:4310/';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const SALIDA = 'qa-out/tipografia';
mkdirSync(SALIDA, { recursive: true });

const PANTALLAS = [
  { nombre: 'escritorio', w: 1440, h: 900 },
  { nombre: 'tablet',     w: 768,  h: 1024 },
  { nombre: 'movil',      w: 390,  h: 844 },
];

/* ---- 1 · los archivos que existen de verdad ------------------------- */
const DIR_FUENTES = 'public/assets/fonts';
const archivos = existsSync(DIR_FUENTES)
  ? readdirSync(DIR_FUENTES).map((f) => ({ f, kb: Math.round(statSync(join(DIR_FUENTES, f)).size / 1024) }))
  : [];

/* ---- 2 · dónde vive cada regla en el código fuente -------------------
   El CSS se empaqueta en un solo archivo, así que para poder decir «esto
   viene de metodo.css» hay que buscar el selector en las fuentes. */
const FUENTES_CSS = [];
function recogerCss(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) recogerCss(p);
    else if (e.name.endsWith('.css')) FUENTES_CSS.push({ archivo: p.replace(/\\/g, '/'), txt: readFileSync(p, 'utf8') });
  }
}
recogerCss('src/styles');

function dondeVive(selector) {
  if (!selector) return null;
  /* el primer selector del grupo basta para localizar la regla */
  const s = selector.split(',')[0].trim();
  if (!s) return null;
  const escapado = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('(^|[},/\\n])\\s*' + escapado + '\\s*[,{]', 'm');
  for (const { archivo, txt } of FUENTES_CSS) {
    const m = re.exec(txt);
    if (m) {
      const linea = txt.slice(0, m.index).split('\n').length;
      return { archivo: archivo.replace('src/styles/', ''), linea };
    }
  }
  return null;
}

/* Clasifica el alcance de una regla por su selector. */
function alcance(sel) {
  if (!sel) return 'heredado';
  const s = sel.split(',')[0].trim();
  if (/^(:root|html|body|\*)/.test(s)) return 'global';
  if (/^[a-z0-9]+$/i.test(s)) return 'etiqueta';                 /* h3 {} */
  const clases = (s.match(/\./g) || []).length;
  if (clases >= 3 || /#/.test(s)) return 'especifico';
  if (clases === 2) return 'combinado';
  return 'clase';
}

const browser = await puppeteer.launch({
  executablePath: chrome, headless: 'new', protocolTimeout: 300000, args: ['--no-sandbox'],
});

const informe = { archivos, fuentes: null, pantallas: {} };

for (const pantalla of PANTALLAS) {
  const page = await browser.newPage();
  await page.setViewport({ width: pantalla.w, height: pantalla.h, deviceScaleFactor: 1 });
  await page.goto(BASE + '?calidad=full', { waitUntil: 'networkidle2', timeout: 120000 });
  await espera(6000);
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 450) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); }
    window.scrollTo(0, 0);
  });
  await espera(2500);

  const datos = await page.evaluate(() => {
    /* Qué caras hay cargadas de verdad, según el propio navegador */
    const caras = [];
    document.fonts.forEach((f) => caras.push({
      familia: f.family.replace(/["']/g, ''), peso: f.weight, estilo: f.style, estado: f.status,
    }));

    const familiasDe = (nombre) => caras.filter((c) => c.familia.toLowerCase() === nombre.toLowerCase());

    /* ¿el peso pedido existe? CSS elige la cara más cercana; el navegador
       falsifica la negrita cuando pide >=600 y la cara elegida es ligera. */
    function analizarPeso(familia, pesoPedido) {
      const cs = familiasDe(familia);
      if (!cs.length) return { hay: null, falsa: false, nota: 'familia no declarada' };
      const pesos = new Set();
      for (const c of cs) {
        const p = String(c.peso);
        if (p.includes(' ')) { const [a, b] = p.split(' ').map(Number); pesos.add(`${a}-${b}`); }
        else pesos.add(p);
      }
      const n = Number(pesoPedido);
      const cubre = [...pesos].some((p) => {
        if (p.includes('-')) { const [a, b] = p.split('-').map(Number); return n >= a && n <= b; }
        return Number(p) === n;
      });
      /* si no lo cubre, ¿hay alguna cara >=600 a la que caer? */
      const hayNegritaReal = [...pesos].some((p) => {
        if (p.includes('-')) return Number(p.split('-')[1]) >= 600;
        return Number(p) >= 600;
      });
      return {
        hay: [...pesos].join(' · '),
        falsa: !cubre && n >= 600 && !hayNegritaReal,
        nota: cubre ? 'real' : (n >= 600 && !hayNegritaReal ? 'NEGRITA FALSA' : 'cae a la cara mas cercana'),
      };
    }

    function analizarCursiva(familia, estilo) {
      if (!/italic|oblique/.test(estilo)) return { falsa: false, nota: '' };
      const cs = familiasDe(familia);
      const hay = cs.some((c) => /italic|oblique/.test(c.estilo));
      return { falsa: !hay, nota: hay ? 'real' : 'CURSIVA FALSA' };
    }

    const PROPS = ['font-family', 'font-size', 'font-weight', 'font-style',
                   'letter-spacing', 'line-height', 'text-transform'];
    const out = [];
    const vistos = new Set();
    let n = 0;

    for (const el of document.querySelectorAll('h1,h2,h3,h4,h5,p,a,li,span,button,label,figcaption,div,em,i,strong,b')) {
      /* solo nodos con texto propio: si no, cada envoltorio contaría */
      const propio = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim().length > 1);
      if (!propio) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const cs = getComputedStyle(el);
      const texto = el.textContent.replace(/\s+/g, ' ').trim().slice(0, 40);
      if (!texto) continue;

      const familia = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      const clave = familia + '|' + cs.fontWeight + '|' + cs.fontSize + '|' + cs.fontStyle + '|' +
                    (el.className || el.tagName).toString().slice(0, 40);
      if (vistos.has(clave)) continue;
      vistos.add(clave);

      const peso = analizarPeso(familia, cs.fontWeight);
      const cursiva = analizarCursiva(familia, cs.fontStyle);
      /* ¿el navegador puede pintar esa familia? si no, se ve la de reserva */
      let cargada = true;
      try { cargada = document.fonts.check(`${cs.fontStyle} ${cs.fontWeight} 16px "${familia}"`); } catch { }

      /* ¿lo pisa un estilo puesto por JS? */
      const enLinea = PROPS.filter((p) => el.style.getPropertyValue(p));

      el.setAttribute('data-audit', String(n));
      out.push({
        i: n++,
        etiqueta: el.tagName.toLowerCase(),
        clases: (el.className || '').toString().trim().slice(0, 48),
        seccion: el.closest('section')?.id || '—',
        texto,
        familia,
        familiaCompleta: cs.fontFamily,
        cargada,
        peso: cs.fontWeight, pesoHay: peso.hay, pesoFalsa: peso.falsa, pesoNota: peso.nota,
        estilo: cs.fontStyle, cursivaFalsa: cursiva.falsa, cursivaNota: cursiva.nota,
        talla: +parseFloat(cs.fontSize).toFixed(1),
        tracking: cs.letterSpacing === 'normal' ? 0 : +(parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize)).toFixed(4),
        interlinea: +(parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)).toFixed(2),
        transformar: cs.textTransform,
        enLinea,
      });
    }
    return { caras, elementos: out };
  });

  /* ---- de qué regla viene cada propiedad, vía el protocolo de Chrome ---- */
  const cdp = await page.target().createCDPSession();
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const hojas = new Map();
  cdp.on('CSS.styleSheetAdded', (e) => hojas.set(e.header.styleSheetId, e.header));
  await espera(400);
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });

  for (const el of datos.elementos) {
    try {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `[data-audit="${el.i}"]` });
      if (!nodeId) continue;
      const m = await cdp.send('CSS.getMatchedStylesForNode', { nodeId });
      const interesa = new Set(['font-family', 'font-size', 'font-weight', 'font-style', 'letter-spacing', 'line-height', 'font']);
      const cadena = [];
      for (const r of (m.matchedCSSRules || [])) {
        const sel = r.rule.selectorList.text;
        const props = (r.rule.style.cssProperties || [])
          .filter((p) => interesa.has(p.name) && p.text)
          .map((p) => p.name);
        if (!props.length) continue;
        const hoja = hojas.get(r.rule.styleSheetId);
        cadena.push({
          selector: sel,
          props,
          media: (r.rule.media || []).map((x) => x.text).join(' · ') || null,
          agente: r.rule.origin === 'user-agent',
        });
      }
      el.reglas = cadena;
    } catch { /* nodo que ya no está */ }
  }

  informe.pantallas[pantalla.nombre] = datos;
  if (!informe.fuentes) informe.fuentes = datos.caras;
  await page.close();
  console.log(`  ${pantalla.nombre.padEnd(11)} ${datos.elementos.length} textos distintos`);
}

await browser.close();

/* ---- localizar cada regla en el código fuente ---- */
for (const p of Object.values(informe.pantallas)) {
  for (const el of p.elementos) {
    for (const r of (el.reglas || [])) {
      r.donde = r.agente ? { archivo: '(navegador)', linea: 0 } : dondeVive(r.selector);
      r.alcance = r.agente ? 'navegador' : alcance(r.selector);
    }
  }
}

writeFileSync(join(SALIDA, 'auditoria.json'), JSON.stringify(informe, null, 1));
console.log(`\n  detalle en ${SALIDA}/auditoria.json`);

/* ---- resumen en pantalla ---- */
const esc = informe.pantallas.escritorio.elementos;
const falsasNegrita = esc.filter((e) => e.pesoFalsa);
const falsasCursiva = esc.filter((e) => e.cursivaFalsa);
const noCargadas = esc.filter((e) => !e.cargada);
const familias = [...new Set(esc.map((e) => e.familia))];

console.log('\n  familias en uso:', familias.join(' · '));
console.log('  caras cargadas :', informe.fuentes.map((c) => `${c.familia} ${c.peso} ${c.estilo}`).join(' | '));
console.log(`\n  negritas falsas: ${falsasNegrita.length}`);
falsasNegrita.forEach((e) => console.log(`     ${e.peso}  ${e.seccion.padEnd(9)} .${(e.clases || e.etiqueta).padEnd(30)} ${e.texto.slice(0, 30)}`));
console.log(`  cursivas falsas: ${falsasCursiva.length}`);
falsasCursiva.forEach((e) => console.log(`     ${e.estilo}  ${e.seccion.padEnd(9)} .${(e.clases || e.etiqueta).padEnd(30)} ${e.texto.slice(0, 30)}`));
console.log(`  familias que no cargan: ${noCargadas.length}`);
noCargadas.forEach((e) => console.log(`     ${e.familia}  ${e.seccion}  ${e.texto.slice(0, 30)}`));
