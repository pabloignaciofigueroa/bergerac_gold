# depurar/

Aquí está lo que la auditoría dio por no usado. **No se ha borrado nada**: los
archivos están movidos, con su ruta original intacta, y `MANIFIESTO.json`
guarda de dónde salió cada uno y por qué.

Para devolverlo todo a su sitio:

    node tools/depurar-mover.mjs --volver

Esta carpeta se borra cuando el QA confirme que no falta nada.

79 archivos · 1232 KB
