# Datavilleta

Observatorio estático de datos públicos de Villeta, Cundinamarca (código DANE `25875`), construido en HTML + CSS + módulos ES de JavaScript sin compilación. Publicado en https://leotinoco.github.io/datavilleta/ desde la rama `main` (GitHub Pages).

**Antes de cambiar algo, leer `docs/DOCUMENTACION.md`**: arquitectura, catálogo de las 14 secciones y >65 conjuntos de datos en `datos.gov.co`, rutas limpias (`58 rutas`), particularidades de las consultas SoQL y cómo actualizar los datos transcritos (`data/esp-villeta.json`, `data/sui-comercial-villeta.json`, `data/rnt-historico-villeta.json`).

Reglas del proyecto:
- Cada cifra cita su fuente oficial (`sources` o `sourceText`) y declara la vigencia del dato (`asOf`); si no es exclusiva del municipio de Villeta, debe incluir `scope: { nivel, texto }`.
- No publicar datos personales (correos, teléfonos, nombres de personas naturales) en cumplimiento de las Leyes 1581 de 2012 y 1712 de 2014.
- Textos en español de Colombia (`es-CO`); números formateados con `js/format.js`.
- Gráficos: máximo 8 series, una sola escala, sin reciclar colores, siempre con tabla alternativa (`Ver tabla`), descarga en CSV (`Descargar CSV`) y botón de referencia (`Copiar cita`).
- Tras cambiar `index.html`, `js/nav.js` o encabezados (`type: 'heading'`) de cualquier sección: ejecutar siempre `node scripts/rutas.mjs`.
- Servidor local: `python -m http.server 8080`. Scripts de mantenimiento con Node 18+.
- Commits en español; no hacer `git push` sin que el dueño lo pida explícitamente.
