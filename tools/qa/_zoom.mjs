import { existsSync, mkdirSync } from 'node:fs';
const chrome=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(existsSync);
const p=(await import('puppeteer-core')).default;
const esp=(ms)=>new Promise(r=>setTimeout(r,ms));
mkdirSync('qa-out/zoom',{recursive:true});
const b=await p.launch({executablePath:chrome,headless:'new',protocolTimeout:300000,args:['--no-sandbox']});
const pg=await b.newPage(); await pg.setViewport({width:1440,height:900,deviceScaleFactor:3});
await pg.goto('http://127.0.0.1:4310/?calidad=full',{waitUntil:'networkidle2',timeout:120000});
await esp(8000);
/* Pinta las dos frases fuera de la pagina, con SUS estilos calculados
   reales, una encima de otra, para compararlas sin scroll ni animacion. */
const dato = await pg.evaluate(() => {
  const buscar = (re) => [...document.querySelectorAll('h1,h2,h3,p')]
    .find(x => re.test(x.textContent.trim()));
  const a = buscar(/^Antes de diseñar/i);
  const c = buscar(/^Dos proyectos/i);
  const leer = (el) => { const s=getComputedStyle(el); return {
    txt: el.textContent.trim().split(/(?<=\.)\s/)[0].slice(0,26),
    ff:s.fontFamily, fw:s.fontWeight, fs:s.fontSize, ls:s.letterSpacing,
    tt:s.textTransform, col:s.color, fam:s.fontFamily.split(',')[0] }; };
  const A=leer(a), C=leer(c);
  const box=document.createElement('div');
  box.id='__cmp';
  box.style.cssText='position:fixed;inset:0;z-index:99999;background:#fff;padding:40px;display:flex;flex-direction:column;gap:34px;justify-content:center';
  for (const d of [A,C]) {
    const t=document.createElement('div');
    t.style.cssText=`font-family:${d.ff};font-weight:${d.fw};font-size:64px;letter-spacing:${(parseFloat(d.ls)/parseFloat(d.fs)*64).toFixed(2)}px;text-transform:${d.tt};color:#111;white-space:nowrap`;
    t.textContent=d.txt;
    box.appendChild(t);
  }
  document.body.appendChild(box);
  return { A, C };
});
console.log(JSON.stringify(dato,null,1));
await esp(600);
await pg.screenshot({path:'qa-out/zoom/comparacion.png', captureBeyondViewport:false});
await b.close(); console.log('lista');
