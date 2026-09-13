import {mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {pages,communes} from '../src/content/seo-pages.js';

const origin='https://bergerac.cl';
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const json=value=>JSON.stringify(value).replace(/</g,'\\u003c');
const arrow='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';
const organization={
  '@type':'Organization','@id':`${origin}/#organization`,name:'Bergerac',url:`${origin}/`,
  logo:`${origin}/images/brand-symbol.svg`,email:'hola@bergerac.cl',
  description:'Estudio digital de diseño y desarrollo web en Castro, Chiloé.',
  areaServed:communes.map(name=>({'@type':'AdministrativeArea',name:`${name}, Chiloé, Chile`}))
};
function render(page,notFound=false){
  const url=origin+page.path;
  const crumbs=[{'@type':'ListItem',position:1,name:'Inicio',item:`${origin}/`},{'@type':'ListItem',position:2,name:page.section,item:url}];
  const graph=[organization,{'@type':'WebSite','@id':`${origin}/#website`,url:`${origin}/`,name:'Bergerac',inLanguage:'es-CL',publisher:{'@id':`${origin}/#organization`}},
    {'@type':page.article?'Article':'WebPage','@id':`${url}#page`,url,name:page.title,headline:page.heading,description:page.description,inLanguage:'es-CL',
      ...(page.article?{author:{'@id':`${origin}/#organization`},publisher:{'@id':`${origin}/#organization`}}:{isPartOf:{'@id':`${origin}/#website`}})},
    {'@type':'BreadcrumbList',itemListElement:crumbs}];
  const related=(page.related||[]).map(path=>{
    const target=pages.find(item=>item.path===path);
    if(!target)throw new Error(`Missing related page ${path}`);
    return `<a class="reading-link" href="${path}"><span><span class="eyebrow">${escape(target.section)}</span><span class="reading-title">${escape(target.heading)}</span></span>${arrow}</a>`;
  }).join('');
  return `<!doctype html>
<html lang="es-CL"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(page.title)}</title><meta name="description" content="${escape(page.description)}">
${notFound?'<meta name="robots" content="noindex">':`<link rel="canonical" href="${url}">`}
<meta name="theme-color" content="#FDFCFA"><meta property="og:locale" content="es_CL">
<meta property="og:title" content="${escape(page.title)}"><meta property="og:description" content="${escape(page.description)}">
<meta property="og:type" content="${page.article?'article':'website'}"><meta property="og:url" content="${url}">
<meta property="og:image" content="${origin}${page.image||'/images/chiloe.webp'}"><meta property="og:site_name" content="Bergerac">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="/icons/favicon.svg">
<link rel="preload" href="/fonts/mona.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/src/styles/editorial.css">
${notFound?'':`<script type="application/ld+json">${json({'@context':'https://schema.org','@graph':graph})}</script>`}
</head><body>
<a class="skip-link" href="#contenido">Saltar al contenido</a>
<header class="editorial-header wrap"><a class="editorial-brand" href="/" aria-label="Bergerac, inicio"><img src="/images/brand-symbol.svg" width="30" height="34" alt="">BERGERAC</a><nav aria-label="Navegación principal"><a href="/servicios/diseno-web/"${page.path==='/servicios/diseno-web/'?' aria-current="page"':''}>Diseño web</a><a href="/diseno-web-chiloe/"${page.path==='/diseno-web-chiloe/'?' aria-current="page"':''}>Chiloé</a><a href="/guias/"${page.path==='/guias/'?' aria-current="page"':''}>Guías</a></nav><a class="editorial-button" href="/#comencemos">Conversemos ${arrow}</a></header>
<main id="contenido" tabindex="-1">
<section class="editorial-hero wrap" aria-labelledby="page-title"><nav class="breadcrumbs" aria-label="Ruta de navegación"><a href="/">Inicio</a><span aria-hidden="true">/</span><span aria-current="page">${escape(page.section)}</span></nav><p class="eyebrow">BERGERAC / ${escape(page.section)}</p><h1 id="page-title">${escape(page.heading)}</h1><p class="editorial-lead">${escape(page.lead)}</p></section>
${page.image?`<figure class="editorial-image wrap"><img src="${page.image}" alt="${escape(page.imageAlt)}" width="1600" height="900" decoding="async"></figure>`:''}
${page.blocks.length?`<div class="editorial-body wrap"><aside><p class="eyebrow">En esta página</p><nav aria-label="Contenido de esta página">${page.blocks.map((block,i)=>`<a href="#parte-${i+1}">${escape(block.title)}</a>`).join('')}</nav></aside><div class="prose">${page.blocks.map((block,i)=>`<section id="parte-${i+1}"><h2>${escape(block.title)}</h2>${block.html}</section>`).join('')}</div></div>`:''}
${related?`<section class="related wrap" aria-labelledby="related-title"><h2 id="related-title">${page.path==='/guias/'?'Para preparar tu proyecto':'Sigue explorando'}</h2><div class="reading-list">${related}</div></section>`:''}
<section class="editorial-contact"><div class="wrap contact-inner"><div><p class="eyebrow">CONVERSEMOS</p><h2>Tu punto de partida<br>puede ser una idea.</h2><p>Cuéntanos en qué estás y definamos el siguiente paso.</p></div><a class="editorial-button dark" href="/#comencemos">Compartir mi proyecto ${arrow}</a></div></section>
</main><footer class="editorial-footer wrap"><p>© Bergerac — Estudio digital · Castro, Chiloé</p><nav aria-label="Enlaces del pie"><a href="/servicios/diseno-web/">Diseño web</a><a href="/diseno-web-chiloe/">Chiloé</a><a href="/guias/">Guías</a><a href="/#comencemos">Contacto</a></nav></footer>
</body></html>`;
}
for(const page of pages){
  const file=`.${page.path}index.html`;
  await mkdir(dirname(file),{recursive:true});await writeFile(file,render(page));
}
await writeFile('404.html',render({path:'/404.html',section:'Página no encontrada',title:'Página no encontrada | Bergerac',heading:'Por aquí no era.',description:'La página que buscas no está disponible. Vuelve a Bergerac para conocer nuestro trabajo.',lead:'Puede que el enlace haya cambiado. Puedes volver al inicio, explorar nuestros servicios o contarnos qué necesitas.',blocks:[],related:['/servicios/diseno-web/','/diseno-web-chiloe/']},true));
await mkdir('public',{recursive:true});
await writeFile('public/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['/',...pages.map(page=>page.path)].map(path=>`  <url><loc>${origin}${path}</loc></url>`).join('\n')}\n</urlset>\n`);
await writeFile('public/robots.txt',`User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
console.log(`Generated ${pages.length} editorial pages, 404, sitemap and robots.txt.`);
