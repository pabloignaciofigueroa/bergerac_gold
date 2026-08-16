import { defineConfig } from 'astro/config';

/* Bergerac — sitio estático puro. No hay servidor ni SSR: `astro build`
   escupe HTML, CSS y JS en dist/ y eso se copia a cualquier hosting.

   Decisiones que NO son por defecto y por qué:

   · build.inlineStylesheets: 'never'
     El sitio depende del ORDEN de la cascada (tokens → base → sections) y
     de que el <style> crítico del loader vaya ANTES que las hojas. Dejando
     que Astro decida qué mete en línea, ese orden se vuelve impredecible y
     reaparece el fallo de "la pantalla de carga sale después del sitio".

   · scopedStyleStrategy: 'where'
     Astro aísla los estilos de cada componente añadiendo un atributo. Eso
     sube la especificidad y rompería la cascada del proyecto, que está
     escrita a mano. Con 'where' el aislamiento no cuenta para especificidad.

   · assetsInlineLimit: 0
     Ningún asset se convierte en data: URI. Las fuentes y las texturas se
     miden y se cachean como archivos; incrustarlas falsea el peso.        */
export default defineConfig({
  output: 'static',
  build: {
    format: 'file',
    inlineStylesheets: 'never',
  },
  scopedStyleStrategy: 'where',
  vite: {
    build: {
      assetsInlineLimit: 0,
      target: 'es2022',
    },
  },
});
