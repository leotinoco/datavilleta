# Datavilleta

Observatorio estático de datos públicos de Villeta, Cundinamarca (HTML + JS módulos, sin compilación). Publicado en https://leotinoco.github.io/datavilleta/ desde la rama `main` (GitHub Pages).

**Antes de cambiar algo, leer `docs/DOCUMENTACION.md`**: arquitectura, bloques de sección, rutas, fuentes y cómo actualizar los datos transcritos (ESP Villeta, SUI, RNT).

Reglas del proyecto:
- Cada cifra cita su fuente y declara la vigencia del dato (`asOf`); si no es solo de Villeta, lleva `scope`.
- No publicar datos personales (correos, teléfonos, nombres de personas naturales).
- Textos en español de Colombia; números con `js/format.js`.
- Gráficos: máximo 8 series, una sola escala, tabla alternativa.
- Tras cambiar `index.html`, `js/nav.js` o encabezados de sección: `node scripts/rutas.mjs`.
- Servidor local: `python -m http.server 8080`. Scripts con Node 18+.
- Commits en español; no hacer push sin que el dueño lo pida.
