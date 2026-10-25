# Datavilleta — documentación técnica y de operación

Manual completo del proyecto para retomarlo desde cualquier equipo: qué es, cómo está construido, de dónde sale cada dato, cómo se actualiza lo que no tiene API y cómo se publica. El `README.md` es la presentación corta; este documento es la referencia.

Última revisión: 25 de octubre de 2026.

---

## 1. Qué es

Datavilleta es un sitio web estático que reúne la información pública oficial sobre **Villeta, Cundinamarca** (código DANE 25875) y la presenta por temas, con gráficos de evolución año a año. Cada cifra muestra:

- **la fuente** (entidad, conjunto de datos y enlace), al pie de cada tarjeta;
- **el periodo del dato más reciente** y si está actualizado, con rezago o desactualizado, en el encabezado;
- **el ámbito**, cuando el dato no es solo de Villeta (por ejemplo, toda la jurisdicción de la Cámara de Comercio de Facatativá);
- la tabla de datos ("Ver tabla"), descarga en CSV y, para los datos en vivo, la consulta exacta a la API.

La mayoría de los datos se consultan **en vivo** desde el navegador a la API SODA de datos.gov.co. Lo que no tiene API (documentos PDF de la ESP Villeta, bodega de datos del SUI, tablero del RNT de MinCIT) se transcribió a archivos JSON dentro del repositorio, con su fuente y fecha.

| | |
|---|---|
| Sitio publicado | https://leotinoco.github.io/datavilleta/ |
| Repositorio | https://github.com/leotinoco/datavilleta (público, rama `main`) |
| Publicación | GitHub Pages desde la raíz de `main` (sin compilación) |
| Tecnología | HTML + CSS + JavaScript (módulos ES) sin dependencias ni compilación; Chart.js 4.4.4 desde jsDelivr |
| Idioma y formatos | Español de Colombia: miles con punto, decimales con coma, `$` para pesos |

---

## 2. Cómo trabajar en un equipo nuevo

### 2.1 Requisitos

- **Git** y, para publicar con comodidad, **GitHub CLI** (`gh auth login`).
- **Python 3** (solo para el servidor local) o cualquier servidor estático.
- **Node.js 18 o superior** para los scripts (`scripts/*.mjs`). No hay `npm install`: no se usan dependencias.
- **Microsoft Edge o Google Chrome** para regenerar la imagen de redes (`og-image.png`).

### 2.2 Clonar y ver el sitio en local

```bash
git clone https://github.com/leotinoco/datavilleta.git
cd datavilleta
python -m http.server 8080
```

Abrir http://localhost:8080/. En local el sitio vive en la raíz (`/`); en GitHub Pages vive en `/datavilleta/`. El código calcula la raíz solo (ver §4.3), así que funciona igual en los dos.

> Las secciones se consultan a datos.gov.co desde el navegador; hace falta internet. Las respuestas quedan en caché del navegador 6 horas (botón **Actualizar datos** para borrarla).

### 2.3 Publicar cambios

```bash
git add -A
git commit -m "Descripción del cambio"
git push origin main
```

GitHub Pages publica en uno o dos minutos. Para comprobar el estado: `gh api repos/leotinoco/datavilleta/pages/builds/latest --jq .status` (debe decir `built`).

Antes de publicar, si se cambió `index.html`, el menú (`js/nav.js`) o algún encabezado de sección, regenerar las rutas (§4.3):

```bash
node scripts/rutas.mjs
```

### 2.4 Retomar con Claude Code

El archivo `CLAUDE.md` en la raíz resume las reglas del proyecto y apunta a este documento; Claude Code lo lee al abrir la carpeta. Basta con abrir el proyecto y pedir el cambio.

---

## 3. Estructura del repositorio

```
index.html                 Página única: barra superior, menú lateral, <main>; metadatos Open Graph
404.html                   Copia de index.html para rutas no generadas (generada por scripts/rutas.mjs)
sitemap.xml                Mapa del sitio (generado)
og-image.png               Miniatura 1200×630 para redes (generada por scripts/og/render.mjs)
<seccion>/index.html       Una copia de index.html por sección y por subsección (generadas, ver §4.3)
css/styles.css             Estilos, tokens de color claro/oscuro, menú, tarjetas, gráficos
js/
  app.js                   Enrutador (URLs limpias), menú con subsecciones, tema, menú contraíble
  config.js                Municipio (nombre, códigos DANE, cámara), portal, horas de caché
  nav.js                   Menú: orden, nombre, descripción e ícono de cada sección
  sources.js               Catálogo de conjuntos de datos.gov.co (clave → id, entidad, nombre)
  soda.js                  Cliente de la API SODA: caché (memoria + localStorage), concurrencia, metadatos
  ui.js                    Motor de tarjetas: encabezado, vigencia, ámbito, gráfico, tabla, CSV, fuentes
  charts.js                Envoltorio de Chart.js con el estilo del sitio
  format.js                Formatos numéricos y de fecha es-CO
  freshness.js             Vigencia del dato (actualizado / con rezago / desactualizado)
  slug.js                  Identificadores de URL a partir de títulos; subsecciones de una sección
  sections/
    helpers.js             Utilidades comunes (series anuales, año corrido, fechas de corte)
    inicio.js … fuentes.js Una sección por tema (ver §5)
    sui.js                 Carga y utilidades de data/sui-comercial-villeta.json
data/
  esp-villeta.json         ESP Villeta: IANC, estados financieros, notas, indicadores, evaluación SSPD
  sui-comercial-villeta.json  SUI (Superservicios): suscriptores, consumo, facturación por prestador
  rnt-historico-villeta.json  RNT (MinCIT): prestadores activos por año y nuevos inscritos
  snapshots.json           Copias mensuales de RNT, RUPS y REPS (script automático)
scripts/
  snapshot.mjs             Guarda el corte mensual de RNT/RUPS/REPS en data/snapshots.json
  rutas.mjs                Genera las páginas por ruta, 404.html y sitemap.xml
  og/og-image.html         Diseño de la imagen para redes
  og/render.mjs            Convierte og-image.html en og-image.png con Edge/Chrome sin interfaz
.github/workflows/snapshot.yml   Ejecuta snapshot.mjs el día 5 de cada mes y hace commit
.nojekyll                  Evita que GitHub Pages procese el sitio con Jekyll
.gitattributes             Fin de línea LF en todos los archivos de texto
```

---

## 4. Cómo funciona

### 4.1 Flujo general

1. `index.html` carga `css/styles.css`, Chart.js (jsDelivr) y `js/app.js` como módulo.
2. `app.js` importa todas las secciones, arma el menú y resuelve la ruta de la URL.
3. `ui.js` (`renderSection`) dibuja el encabezado de la sección, los filtros (si los hay) y cada bloque.
4. Cada bloque de tipo tarjeta ejecuta su `load()`: consulta la API (`q('clave', {$select, $where, …})`) o lee un JSON de `data/`, y devuelve qué dibujar.
5. `ui.js` pinta el gráfico (`charts.js`), la tabla, la nota, la vigencia y el pie de fuentes.

### 4.2 Bloques de una sección

Cada archivo de `js/sections/` exporta:

```js
export default {
  id: 'turismo',                  // coincide con el id en js/nav.js y con la URL
  title: 'Turismo y hotelería',
  eyebrow: '…',                   // opcional, línea pequeña sobre el título
  intro: 'Texto (admite HTML)',
  filters: [{ id, label, default, options: [{ value, label }] }],   // opcional
  blocks: [ … ],
};
```

Tipos de bloque:

| `type` | Uso |
|---|---|
| `heading` | Subtítulo de grupo (`title`, `text`). **Cada encabezado es una subsección del menú y una URL propia.** |
| `chart` | Tarjeta con gráfico (y tabla automática o propia) |
| `table` | Tarjeta solo con tabla |
| `kpis` | Tarjeta de indicadores (cifras grandes con variación) |
| `text` | Tarjeta con HTML libre devuelto en `html` |
| `html` | Bloque HTML sin tarjeta |

Propiedades del bloque: `title`, `subtitle`, `wide` (ocupa todo el ancho), `scope` (ámbito, ver §4.6), `sources` (claves de `sources.js` para el pie), `sourceText` (cita en HTML), `note`, `load(ctx)`.

`load({ q, M, filters })` recibe la función de consulta `q`, el municipio `M` (`js/config.js`) y los filtros, y devuelve:

| Propiedad | Significado |
|---|---|
| `chart` | Especificación del gráfico (abajo) |
| `table` | `{ columns: [{ key, label, align, format, html }], rows }`; si falta, se arma desde el gráfico |
| `kpis` | `[{ label, value, delta, deltaLabel, goodWhen: 'up'|'down', hint, asOf, source, href }]` |
| `asOf` | Fecha del dato más reciente (`ofYear`, `ofMonth`, `ofQuarter`, `ofDate` de `freshness.js`); `false` para no mostrarla |
| `labelTitle` | Encabezado de la primera columna de la tabla automática |
| `note` | Nota bajo el gráfico (texto) |
| `html` | HTML adicional en la tarjeta |
| `sourceText` | Cita adicional (texto o lista de textos HTML) |
| `empty`, `emptyText` | La fuente no tiene datos para Villeta |

Especificación del gráfico (`charts.js`):

| Campo | Valores |
|---|---|
| `kind` | `bar`, `hbar`, `line`, `stacked`, `hstacked` |
| `labels` | Etiquetas del eje de categorías |
| `series` | `[{ name, data, color (0–7), muted }]` — máximo 8 series |
| `format` | `num`, `dec`, `dec2`, `pct`, `cop`, `compact` o función |
| `timeline` | `[{ y, m }]` o `[{ y, q }]` paralelo a `labels`: eje mensual/trimestral con línea guía por periodo, mes abreviado y año en dos dígitos; si no cabe, el gráfico se desplaza en horizontal con eje Y y leyenda fijos |
| `months12` | Las etiquetas son los 12 meses y cada serie es un año (comparativo) |
| `partialLast` | Último periodo incompleto: barra más clara |
| `yoy` | El detalle muestra la variación frente al periodo anterior |
| `threshold` | `{ value, label }`: línea de referencia |
| `footer(i)` | Texto extra en el detalle del periodo `i` |
| `beginAtZero`, `min`, `max` | Escala |

### 4.3 Rutas (URLs sin `#`)

- Formato: `/seccion/` y `/seccion/subseccion/`, más filtros en la consulta (`/contratacion/?entidad=alcaldia`). En GitHub Pages todo cuelga de `/datavilleta/`.
- La subsección es el `slug` del título de un bloque `heading` (`js/slug.js`): "Evolución del registro turístico, 2005–2026" → `evolucion-del-registro-turistico-2005-2026`.
- `app.js` calcula la raíz del sitio (`BASE`) a partir del `<base>` o de la URL inicial, fija un `<base>` absoluto (para que `data/…` y los enlaces relativos sigan funcionando tras cambiar la URL) e intercepta los clics en enlaces internos para navegar con `history.pushState` sin recargar.
- Los enlaces antiguos con `#/seccion?filtros` se convierten a la ruta limpia.
- Dentro de la misma sección, al saltar a una subsección se conservan los filtros.
- El menú despliega las subsecciones de la sección activa y resalta la que se está viendo al desplazarse.
- **GitHub Pages no resuelve rutas de aplicaciones de una sola página.** `scripts/rutas.mjs` crea una copia de `index.html` en `turismo/index.html`, `turismo/<subseccion>/index.html`, etc., con su `<base href="../">` o `../../`, y con título, descripción, URL canónica y metadatos Open Graph propios. También genera `404.html` (respaldo con `<base href="/datavilleta/">`) y `sitemap.xml`.
- **Regenerar** después de cambiar `index.html`, `js/nav.js` o los encabezados de una sección: `node scripts/rutas.mjs`. Las carpetas de rutas son generadas: no editarlas a mano.
- Si el sitio se mudara a otro dominio o ruta, cambiar `SITE` en `scripts/rutas.mjs`, las URL absolutas de `index.html` (canonical, `og:url`, `og:image`, `twitter:image`) y regenerar.

### 4.4 Consultas a datos.gov.co (`js/soda.js`)

- API SODA: `https://www.datos.gov.co/resource/<id>.json` con parámetros SoQL (`$select`, `$where`, `$group`, `$order`, `$limit`). Sin `$limit`, el portal devuelve 1.000 filas; los bloques que agrupan mucho usan `$limit: 5000`.
- Caché: memoria + `localStorage` (prefijo `dv:v1:`), 6 horas (`CACHE_HORAS` en `config.js`). Máximo 4 consultas simultáneas. Tiempo de espera 90 s.
- Metadatos del conjunto (`/api/views/<id>.json`) para la fecha de actualización en el portal.
- Lecciones aprendidas: en conjuntos grandes (SECOP), `upper(...) like` es muy lento; usar igualdad exacta (`municipio_entidad in ('Villeta','VILLETA')`). En conjuntos con cortes acumulados (UARIV), filtrar al último corte para no duplicar.

### 4.5 Vigencia del dato (`js/freshness.js`)

| Estado | Criterio |
|---|---|
| ✓ Actualizado | Dato anual del año actual o anterior; mensual/diario de hace 3 meses o menos (6 si es trimestral) |
| ◔ Con rezago | Anual de hace 2 años; mensual/diario hasta 12 meses (15 trimestral) |
| ! Desactualizado | Más antiguo |
| ■ Serie cerrada | La fuente dejó de publicarla |

Cada bloque declara `asOf`. Si no lo hace, se deduce de etiquetas anuales del gráfico o, en último caso, de la fecha de publicación en el portal.

### 4.6 Ámbito del dato

Cuando una cifra no es exclusiva de Villeta, el bloque declara `scope: { nivel, texto }` y la tarjeta muestra un recuadro ámbar con ícono. Hoy:

- Economía → Registro mercantil (RUES): toda la jurisdicción de la Cámara de Comercio de Facatativá (el conjunto abierto no trae municipio).
- Educación → Saber 11: comparación de Villeta con el promedio de Cundinamarca.

Cualquier dato nuevo que sea regional, departamental o nacional debe llevar `scope`.

### 4.7 Interfaz

- **Tema** oscuro por defecto; interruptor sol/luna en la barra superior (preferencia en `localStorage` `dv:theme`).
- **Menú lateral** contraíble a íconos en escritorio (`dv:nav`); en celular es un menú desplegable.
- **Gráficos**: paleta categórica validada (8 colores fijos, nunca reciclados), una sola escala por gráfico, leyenda siempre que hay 2 o más series, tabla alternativa en todas las tarjetas. Las series con más de 8 grupos se agrupan en "Otros/Otras".
- **Ejes mensuales**: línea guía vertical por mes (más marcada en enero), mes abreviado (`ene`, `feb`…) y año en dos dígitos debajo; si no caben, desplazamiento horizontal con eje Y y leyenda fijos, empezando en los meses más recientes.
- **Redes sociales**: `og-image.png` + metadatos Open Graph y X en cada ruta.

---

## 5. Secciones, bloques y fuentes

Claves de fuente = `js/sources.js`. Entre paréntesis, el id del conjunto en datos.gov.co.

### Resumen (`inicio`)
Indicadores clave con enlace a su sección: prestadores turísticos (RNT), pasajeros hacia Villeta (Supertransporte), hurto a personas (Policía), valor contratado (SECOP), cartera de créditos (Superfinanciera), IRCA (INS), cobertura educativa (MEN), crédito FINAGRO. Tarjetas de acceso a cada sección.

### Turismo y hotelería (`turismo`)
- **Oferta turística vigente** — RNT vigente (`rnt`, thwd-ivmp): prestadores activos, capacidad, tipos, establecimientos de alojamiento.
- **Evolución del registro turístico, 2005–2026** — `data/rnt-historico-villeta.json` (tablero de MinCIT): activos por año y tipo, hoteles y centros vacacionales, viviendas turísticas, nuevas inscripciones (desde 2018), entradas y salidas estimadas, capacidad 2005–2021; más los cortes mensuales de `data/snapshots.json`.
- **Llegada de visitantes por carretera** — Supertransporte (`supertransporte`, eh75-8ah6): pasajeros despachados con destino Villeta, estacionalidad, terminal de origen, año corrido.

### Economía y empresas (`economia`)
- **Registro mercantil – CC Facatativá** (ámbito regional): RUES (`rues` c82u-588k, `rues_estab` nb3d-v3n7).
- **Sistema financiero en Villeta**: Superfinanciera captaciones/colocaciones (`sfc_captaciones` u2wk-tfe3) y puntos de atención (`sfc_puntos` vkbt-desu).
- **Empresas y entidades vigiladas**: Supersociedades 10.000 empresas (`supersociedades` 6cat-2gcs), Supersolidaria (`supersolidaria` kg2d-yfyg).

### Servicios públicos (`servicios`)
- **Acueducto, alcantarillado y aseo**: RUPS (`rups` 4qkq-csdn, corte 2021), IRCA (`ins_irca` nxt2-39c3), residuos (`sspd_residuos` d7pt-p5fi).
- **Suscriptores por servicio y acueductos comunitarios**: `data/sui-comercial-villeta.json` (SUI).
- **Energía eléctrica y gas**: SUI (suscriptores, kWh facturados, comercializadores) y PQR de energía (`sspd_pqr_energia` myu9-6wb7).
- **Conectividad**: MinTIC internet fijo (`mintic_internet_hist` n48w-gutb, `mintic_internet` hwrp-3su3).

### ESP Villeta (`esp`)
Todo desde `data/esp-villeta.json` salvo la contratación (SECOP en vivo) y la parte SUI (`data/sui-comercial-villeta.json`).
- Resumen de la empresa.
- **Agua no contabilizada y gestión comercial**: IANC 2012–2025, IANC mensual 2023–2025, agua producida vs. facturada, cobertura/medición/recaudo, calidad y continuidad, IUS.
- **Suscriptores, consumo y facturación reportados al SUI**: suscriptores mes a mes y por año, agua facturada SUI vs. informe de la empresa, facturación por servicio, subsidios y contribuciones.
- **Estados financieros 2018–2025**: ingresos, resultado neto, por servicio, márgenes, liquidez, cartera.
- **Indicadores financieros** (cuatro grupos, 2019–2025): liquidez (razón corriente, prueba ácida, KTNO), rentabilidad (márgenes bruto, operativo, EBITDA, neto, ROA, ROE), endeudamiento y solvencia (endeudamiento, apalancamiento, cobertura de intereses, deuda neta ÷ EBITDA), eficiencia (DSO, DIO, DPO, ciclo de conversión). Estados detallados.
- **Presupuesto, reporte de información y hallazgos** (evaluación integral SSPD 2026).
- **Contratación de la ESP (en vivo)** — SECOP.

### Seguridad y convivencia (`seguridad`)
Filtros: delito y año de inicio. **Año corrido** (comparativo y mensual), **Serie histórica por delito** (15 conjuntos de la Policía, ver `DELITOS` en `sources.js`), **Detalle por modalidad**.

### Educación y cultura (`educacion`)
MEN (`men` nudc-7mev), ICFES Saber 11 (`icfes` kgxf-xxbe, con comparación departamental), MinCulturas (`mincultura` bq7b-e3sb).

### Salud (`salud`)
REPS (`reps` c36g-9fc2) y afiliados por régimen (`afiliados` hn4i-593p).

### Agro y ruralidad (`agro`)
EVA 2007–2018 (`eva_hist` 2pnw-mmge) y desde 2019 (`eva` uejq-wxrr), inventario bovino FNG (`fng` cea5-4ctf), FINAGRO (`finagro` jjvv-55ck), catastro (`catastro` h9h6-gkdg).

### Contratación y finanzas (`contratacion`)
Filtro: entidad contratante. **Contratos públicos (SECOP)** (`secop` rpmr-utcd): año corrido, contratos y valor por año, valor por entidad y año, contratos por modalidad y año, por tipo y año, contratos recientes. **Regalías y desempeño**: SGR (`sgr` g4qj-2p2e), MDM del DNP (`mdm` nkjx-rsq7, hasta la medición de 2020).

### Víctimas del conflicto (`victimas`)
UARIV desplazamiento (`uariv_desplazamiento` krnc-8azs) y víctimas por hecho (`uariv_hechos` 9qih-4vkc), filtrando al último corte publicado.

### Territorio y riesgo (`territorio`)
Emergencias UNGRD (cuatro conjuntos 2019–2025+) y capas geográficas oficiales de Villeta.

### Fuentes y metodología (`fuentes`)
Catálogo de conjuntos usados con fecha de actualización, búsqueda en vivo de otros conjuntos que mencionan a Villeta, documentos transcritos de la ESP, bodega SUI transcrita y fuentes complementarias sin API.

---

## 6. Datos sin API: origen y cómo actualizarlos

### 6.1 `data/esp-villeta.json` — Empresa de Servicios Públicos de Villeta

**Origen.** Documentos PDF oficiales en https://espvilleta.gov.co/ (sección *Documentación*, descargas WPDM) y la evaluación integral de la Superservicios (2026). Cada cifra referencia un documento en `documentos` (título, entidad, fecha, URL).

**Contenido.** `empresa`, `documentos`, `estadoResultados` (2018–2025), `situacionFinanciera` (2019–2025), `resultadoPorServicio`, `indicadoresSspd`, `indicadoresGestion`, `ius`, `operacion`, `reporteSui`, `presupuesto`, `ejecucion2025`, `hallazgos`, `ianc` (anual 2012–2025, mensual 2023–2025 con volúmenes producido y facturado), `partidasNotas` (depreciación, amortización, gastos financieros, comisiones, préstamos y proveedores 2020–2025, de las revelaciones).

**Calendario de actualización (aproximado):**

| Documento | Cuándo sale | Qué actualiza |
|---|---|---|
| Informe de control social (Res. CRA 151/2001) | Inicio del año siguiente | IANC anual y mensual (volúmenes producido y facturado) |
| Estado de situación financiera y de resultado integral | Febrero–abril del año siguiente | `estadoResultados`, `situacionFinanciera` |
| Revelaciones (notas) a los estados financieros | Igual | `partidasNotas` |
| Indicadores de gestión / informe de gestión | Anual | `indicadoresGestion`, `presupuesto` |
| Evaluación integral de la Superservicios | Irregular | `indicadoresSspd`, `ius`, `operacion`, `hallazgos` |

**Cómo extraer.**
- PDF con texto: `pdftotext -layout archivo.pdf salida.txt` (en Windows, copiar el PDF a un nombre corto: pdftotext falla con rutas muy largas).
- PDF escaneado: OCR (en el proyecto se usó el OCR de Windows desde PowerShell) o lectura manual de la imagen.
- Revelaciones: la depreciación del año es la suma de "Depreciación aplicada" en los cuadros de propiedades, planta y equipo (muebles e inmuebles); los gastos financieros y comisiones están en la nota de "Otros gastos" (cuentas 5.8.02 y 5.8.04); proveedores = "Adquisición de bienes y servicios nacionales" en cuentas por pagar; préstamos = nota "Préstamos por pagar".
- **Verificar** que cada estado cuadre (ingresos − costos = utilidad bruta, etc.) y que los indicadores 2024–2025 coincidan con la Superservicios.
- El sitio de la ESP bloquea su API de WordPress (403); usar la búsqueda pública `https://espvilleta.gov.co/?s=<término>`.

**IANC.** Fórmula: (volumen producido − volumen facturado) ÷ volumen producido × 100. 2017, 2020, 2021 y 2022 no tienen un valor válido publicado; 2014 aparece en el SUI como −16 % y la Superservicios lo marcó como inválido. 2023–2025 se calcularon con los volúmenes mensuales. **El IANC de 2026 no es público** hasta que la ESP publique su informe de control social a comienzos de 2027.

### 6.2 `data/sui-comercial-villeta.json` — SUI de la Superservicios

**Origen.** Bodega de datos pública del SUI (Ideasoft O3), cubo `SUI_COMERCIAL`:
http://bi.superservicios.gov.co/o3web/VistaInicialAcueducto.jsp (entra como usuario público sin contraseña).

No tiene API documentada y el portal de la Superservicios bloquea consultas automáticas (Incapsula): **se consulta en el navegador**.

**Procedimiento usado (oct. 2026):**
1. Abrir la vista. Dimensiones: PERIODICIDAD, TIEMPO, SERVICIO, EMPRESA, UBICACION_GEOGRAFICA, UBICACION, USO, ESTRATO. Medidas: facturación total, consumo total, número de suscriptores, subsidios, contribuciones, etc.
2. UBICACION_GEO → buscar **VILLETA** y seleccionarlo. PERIODICIDAD → **Mensual** (con periodicidad "Mensual", los suscriptores de un año son el promedio de sus meses).
3. Medidas → marcar consumo total, número de suscriptores, subsidios y contribuciones además de facturación.
4. Botón **Spreadsheet** (vista de tabla). Para poner EMPRESA y SERVICIO en columnas, en la consola del marco `dispatcher` se usaron las funciones del propio visor: `setDimension('o3_1', 0, '3', 0)` (EMPRESA en columnas) y `addDimension('o3_1', 0, '2', 1)` (SERVICIO anidado). Ejes: 0 = columnas, 1 = filas; dimensiones por posición en la barra (0 = PERIODICIDAD, 1 = TIEMPO, 2 = SERVICIO, 3 = EMPRESA…).
5. TIEMPO → modo **Drill Level** → nivel **MES** para tener filas mensuales.
6. La tabla está en el marco `view-grid.jsp`: encabezados de columnas en la tabla 6 (con `colSpan`), etiquetas de filas en la tabla 5 y datos en la 7 (índices 5, 4 y 6 en base cero).

**Contenido.** `prestadores` (ESP: acueducto, alcantarillado y aseo con series mensuales desde 2019; acueductos comunitarios: Fernando Salazar y Río Dulce, Mave Bagazal, Caserío El Puente, La Masata — anuales), `municipio` (energía, gas natural, GLP, telefonía), `otros` (comercializadores) y `calidad` (advertencias).

**Problemas de calidad documentados** (también en `calidad` del JSON):
- El SUI duplica consumo y facturación de acueducto de la ESP en los periodos enero 2024–febrero 2025 (salvo enero 2025) y agosto 2021.
- El periodo del SUI va un mes detrás del mes de consumo del informe de la ESP.
- La ESP no carga aseo al SUI desde mayo de 2024; septiembre de 2020 no tiene reporte.
- La Masata y Caserío El Puente reportan suscriptores inverosímiles (1 a 92) en varios años.
- Gas natural sin periodos después de diciembre de 2022.

**Lo que no está en el SUI público:** estados financieros e IANC de los acueductos comunitarios (no se encontraron publicados; se pueden pedir por derecho de petición).

### 6.3 `data/rnt-historico-villeta.json` — Registro Nacional de Turismo (MinCIT)

**Origen.** Tablero Power BI público "Registro Nacional de Turismo" del Viceministerio de Turismo, enlazado desde PorTuColombia:
https://portucolombia.mincit.gov.co/tematicas/cifras-empresariales-del-sector/registro-nacional-de-turismo-rnt-1
(páginas: distribución, información histórica mensual desde 2019, activos por año desde 2005; filtros por departamento, municipio y categoría).

**Datos.** `historico` = `[año, categoría, subcategoría, prestadores, habitaciones, camas, empleados]` de prestadores **activos** por año (habitaciones, camas y empleados solo hasta 2021); `nuevos` = `[año, categoría, subcategoría, número]` de inscripciones por primera vez (desde 2018). 2026 es acumulado al 30 de septiembre.

**Cómo se consultó.** Desde la página del tablero (app.powerbi.com), con la API pública que usa el propio tablero: `POST https://wabi-paas-1-scus-api.analysis.windows.net/public/reports/querydata?synchronous=true` con el encabezado `X-PowerBI-ResourceKey: b3996b70-fdb0-4d6d-aba8-9ba88a70d243`, `DatasetId 9853cab7-41aa-4853-93eb-e3605e0e0cd4`, `ReportId 737e95d9-c887-4b37-944b-1a3e530f7c7d`, `modelId 2326806`. Entidades útiles del modelo:
- `Historico`: PERIODO, DEPARTAMENTO, CIUDAD/MUNICIPIO, CATEGORÍA, CATEGORÍA AJUSTADA, SUB-CATEGORÍA, ESTADO, PRESTADORES, NÚMERO DE HABITACIONES, NÚMERO DE CAMAS, NÚMERO DE EMPLEADOS.
- `Nuevos VF`: Año, MUNICIPIO, CATEGORIA, SUB_CATEGORIA, FECHA_INSCRIP_RNT, RNT.
- `Activos` y `Total`: registros individuales con fechas de inscripción y actualización.

Consulta tipo (consulta semántica de Power BI): seleccionar `Historico.PERIODO`, `CATEGORÍA AJUSTADA`, `SUB-CATEGORÍA` y la suma de PRESTADORES, HABITACIONES, CAMAS y EMPLEADOS, con filtro `CIUDAD/MUNICIPIO = 'VILLETA'` y `DEPARTAMENTO = 'CUNDINAMARCA'`. La API solo responde a solicitudes hechas desde app.powerbi.com (CORS), por eso se corre en la consola de esa página. La respuesta viene en formato DSR (filas comprimidas con máscaras `R` de repetición y `Ø` de nulos).

**Verificación.** El total de activos de 2026 (579) coincide con el RNT vigente de datos.gov.co.

**Notas de lectura.** El tablero no publica cancelaciones: las "salidas del registro" se estiman como activos del año anterior + nuevos − activos del año. Las subcategorías cambiaron de nombre con los años; `js/sections/turismo.js` (`TIPOS`) las agrupa sin tildes. "Otros tipos de hospedaje no permanente" (2019–2022) se repartió en 2023 entre fincas, casas y apartamentos.

Una copia completa del RNT de julio de 2022 (cortes mensuales de 2021) está en Internet Archive: `http://web.archive.org/web/20220711193543id_/https://www.datos.gov.co/api/views/thwd-ivmp/rows.csv?accessType=DOWNLOAD`.

### 6.4 `data/snapshots.json` — cortes mensuales automáticos

`scripts/snapshot.mjs` consulta RNT, RUPS y REPS (que en datos.gov.co solo son "fotografía vigente") y agrega una entrada por mes. Lo ejecuta `.github/workflows/snapshot.yml` el día 5 de cada mes y hace commit. A mano: `node scripts/snapshot.mjs`.

> El repositorio tiene los permisos de flujos de trabajo en "solo lectura" por defecto; el flujo pide `contents: write`. Si el primer corte automático falla al hacer push, activar **Settings → Actions → General → Workflow permissions → Read and write permissions**.

---

## 7. Hallazgos y advertencias que el sitio ya explica

- **ESP Villeta**: margen operativo negativo todos los años 2019–2025; el resultado final depende de ingresos no operacionales. Sin préstamos (caja neta). Los "gastos financieros" son comisiones bancarias. EBITDA solo desde 2020 (notas de 2019 escaneadas sin detalle). Prueba ácida con la fórmula del sitio (1,11 en 2025) distinta a la de la Superservicios (0,86).
- **Superservicios / SUI**: no hay API pública con IANC ni información financiera; datos.gov.co solo trae RUPS (2021), residuos, PQR de energía y áreas de prestación.
- **Contratación**: años anteriores a 2014 incompletos en SECOP; el régimen especial lo usan Hospital, ESP y colegios; SECOP registra a una persona natural como "entidad" (se agrupa en "Otras entidades" para no publicar su nombre).
- **Internet fijo (MinTIC)**: los conjuntos usados llegan hasta 2023 T4.
- **MDM (DNP)**: el conjunto abierto llega a la medición publicada en 2022.

---

## 8. Convenciones del proyecto

- **Fuente siempre visible** y **vigencia del dato** en cada tarjeta (`asOf`).
- **Ámbito**: si el dato no es solo de Villeta, `scope` en el bloque.
- **Sin datos personales**: no se publican correos, teléfonos ni nombres de personas naturales aunque estén en las fuentes. Los nombres de empresas y entidades sí.
- **Textos** en español de Colombia, claros para la ciudadanía; números con `format.js` (`num`, `pct`, `cop`, `compact`).
- **Gráficos**: máximo 8 series, una sola escala, sin colores reciclados; el año en curso se marca con `*` y barra más clara (`partialLast`).
- **Datos transcritos**: guardar en `data/*.json` con `_nota`, `fuente` y, cuando aplique, `calidad`; verificar sumas y comparar con otra fuente cuando exista.
- **Commits** en español, descriptivos, terminados con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` cuando los hace Claude. No publicar (push) sin que el dueño lo pida.
- **Navegación de fuentes protegidas**: no se evaden CAPTCHA ni bloqueos; se usa la navegación normal del portal.

---

## 9. Tareas frecuentes

**Agregar un indicador de datos.gov.co**
1. Registrar el conjunto en `js/sources.js` (`clave: { id, entidad, nombre, tema }`).
2. Agregar un bloque en `js/sections/<seccion>.js` con su `load({ q, M })` y `asOf`.
3. Si el dato no es solo de Villeta, agregar `scope`.

**Agregar una subsección**: agregar un bloque `{ type: 'heading', title, text }` y correr `node scripts/rutas.mjs`.

**Agregar una sección**: crear `js/sections/<id>.js`, importarla en `js/app.js` (lista `SECTIONS`), agregarla a `js/nav.js` (con ícono SVG) y correr `node scripts/rutas.mjs`.

**Actualizar datos transcritos**: ver §6 (ESP cada año, SUI y RNT cuando se quiera refrescar la serie).

**Cambiar la imagen para redes**: editar `scripts/og/og-image.html` y correr `node scripts/og/render.mjs`. Las redes guardan la vista previa en caché; en Facebook se fuerza con el Depurador de contenido compartido.

**Reutilizar para otro municipio**: cambiar `js/config.js` (nombre, códigos DANE, cámara de comercio), revisar los filtros por nombre en las secciones, reemplazar o quitar los JSON de `data/` (son de Villeta), ajustar `SITE` y textos, y regenerar rutas e imagen.

---

## 10. Historial resumido

| Fecha | Cambio |
|---|---|
| Oct. 2026 | Primera versión: 13 secciones con datos en vivo de datos.gov.co, fuentes y vigencia por gráfico |
| Oct. 2026 | Sección ESP Villeta (IANC 2012–2025, estados financieros, evaluación SSPD) |
| Oct. 2026 | Tema con interruptor, menú contraíble, ejes mensuales con guías |
| Oct. 2026 | SUI: suscriptores, consumo y facturación por servicio; acueductos comunitarios; publicación en GitHub Pages |
| Oct. 2026 | Etiqueta de ámbito regional; serie anual del RNT 2005–2026 |
| Oct. 2026 | Indicadores financieros de la ESP en cuatro grupos; contratación año a año por entidad, modalidad y tipo |
| Oct. 2026 | URLs sin `#`, subsecciones en el menú, imagen y metadatos para redes |

El detalle está en `git log`.
