# Activar contacto desde servidor

Implementacion preparada con funcion Node de Vercel en api/contact.js y Resend por HTTPS sin SDK. Destinatario fijo pablo@bergerac.cl; Reply-To es el correo validado del visitante. No se han enviado correos reales ni configurado credenciales.

1. Confirmar proveedor. Implementacion provisional: Resend.
2. Verificar un dominio remitente en el proveedor agregando sus registros DNS exactos. No reemplazar los MX del correo actual.
3. En Vercel, configurar RESEND_API_KEY (secreto, solo servidor), CONTACT_FROM (direccion verificada) y CONTACT_ALLOWED_ORIGINS (origenes exactos separados por coma). Para preview agregar su URL exacta. No usar prefijo VITE_.
4. Desplegar preview y probar un envio real a pablo@bergerac.cl. La respuesta API confirma aceptacion por el proveedor, no llegada a bandeja: verificar recepcion y carpeta spam.
5. Configurar limite distribuido en Vercel Firewall o proveedor antes de produccion. El limite incluido de cinco intentos por diez minutos es por instancia, NO global; honeypot y origen no reemplazan proteccion distribuida. No afirmar proteccion completa contra bots.
6. Si hay abuso, incorporar desafio antispam validado en servidor. Revisar limites de cuenta del proveedor.
7. Integrar a main solo una vez configurado y verificado el envio real.

Pruebas: node --test tests/contact-api.test.js; Playwright tests/contact-form.spec.js. Las pruebas usan proveedor simulado y nunca envian correo.

npm run dev sirve frontend Vite, no funciones Vercel. Para prueba integrada usar Vercel Preview o vercel dev con variables locales privadas.
