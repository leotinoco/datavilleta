# Datavilleta — documentación técnica, metodológica y de operación

Manual completo del proyecto para retomarlo desde cualquier equipo: qué es, cómo está construido, de dónde sale cada dato, cómo se audita cada cifra para uso periodístico o institucional, cómo se actualiza lo que no tiene API y cómo se publica. El `README.md` es la presentación general; este documento es la referencia exhaustiva.

Última revisión: noviembre de 2026.

---

## 1. Qué es

Datavilleta es un observatorio web estático de datos públicos que reúne la información oficial sobre **Villeta, Cundinamarca** (código DANE `25875`, Provincia del Gualivá) y la organiza en **14 secciones temáticas** y **58 rutas canónicas**, con gráficos de evolución año a año, tablas descargables y trazabilidad completa. Cada cifra muestra:

- **la fuente oficial** (entidad responsable, conjunto de datos, identificador Socrata y enlace directo), al pie de cada tarjeta;
- **el periodo del dato más reciente** y su semáforo de vigencia (`✓ Actualizado`, `◔ Con rezago`, `! Desactualizado` o `■ Serie cerrada`), en el encabezado;
- **el ámbito territorial (`scope`)**, cuando el dato no es exclusivo de Villeta (por ejemplo, toda la jurisdicción de la Cámara de Comercio de Facatativá en el RUES, el flujo del corredor vial en el Peaje Caiquero de la ANI o las comparaciones con el departamento de Cundinamarca y los 12 municipios de la Provincia del Gualivá);
- herramientas para **periodistas, investigadores y servidores públicos**: alternancia a tabla (`Ver tabla`), descarga en CSV (`Descargar CSV`), referencia bibliográfica/periodística lista para pegar (`Copiar cita`), enlace permanente por subsección (`Copiar enlace`), vista de impresión/exportación en fondo claro (`Imprimir / PDF`) y las consultas SoQL exactas a la API (`Consulta API`).

La mayoría de los datos se consultan **en vivo** desde el navegador a la API SODA de `datos.gov.co` (**más de 65 conjuntos de datos oficiales**). Lo que no tiene API abierta (documentos PDF de la ESP Villeta, bodega de datos comercial del SUI de Superservicios y tablero histórico del RNT de MinCIT) se transcribió a archivos JSON dentro del repositorio (`data/*.json`), con su fuente, fecha de corte y verificación aritmética.

| Propiedad | Detalle |
|---|---|
| Sitio publicado | https://leotinoco.github.io/datavilleta/ |
| Repositorio | https://github.com/leotinoco/datavilleta (público, rama `main`) |
| Publicación | GitHub Pages desde la raíz de `main` (sin compilación) |
| Tecnología | HTML + CSS + JavaScript (módulos ES) sin dependencias ni empaquetador; Chart.js 4.4.4 desde jsDelivr |
| Idioma y formatos | Español de Colombia (`es-CO`): miles con punto, decimales con coma, `$` para pesos |
| Identificadores de Villeta | Código DANE `25875` (`25` Cundinamarca + `875` Villeta) · Cámara de Comercio `47` (Facatativá) · Centro Zonal ICBF `2505` (`CZ VILLETA`) · Autoridad ambiental `CAR Regional Gualivá` · Estación automática IDEAM `0023065180` |

---

## 2. Cómo trabajar en un equipo nuevo

### 2.1 Requisitos

- **Git** y, para publicar con comodidad, **GitHub CLI** (`gh auth login`).
- **Python 3** (solo para el servidor local) o cualquier servidor estático (`npx serve .`).
- **Node.js 18 o superior** para los scripts (`scripts/*.mjs`). No hay `npm install`: no se usan dependencias externas.
- **Microsoft Edge o Google Chrome** para regenerar la imagen de redes (`og-image.png`).

### 2.2 Clonar y ver el sitio en local

```bash
git clone https://github.com/leotinoco/datavilleta.git
cd datavilleta
python -m http.server 8080
```

Abrir http://localhost:8080/. En local el sitio vive en la raíz (`/`); en GitHub Pages vive en `/datavilleta/`. El código calcula la raíz solo (ver §4.3), así que funciona igual en los dos entornos.

> Las secciones consultan `datos.gov.co` en vivo desde el navegador; hace falta conexión a internet. Las respuestas quedan en caché del navegador durante 6 horas (botón **Actualizar datos** en la barra superior para borrarla y volver a consultar).

### 2.3 Publicar cambios

Antes de confirmar cambios, si se modificó `index.html`, el menú (`js/nav.js`) o algún encabezado de sección (`type: 'heading'`), regenerar siempre las rutas estáticas (§4.3):

```bash
node scripts/rutas.mjs
```

Luego confirmar y publicar:

```bash
git add -A
git commit -m "Descripción del cambio"
git push origin main
```

GitHub Pages publica en uno o dos minutos. Para comprobar el estado: `gh api repos/leotinoco/datavilleta/pages/builds/latest --jq .status` (debe responder `built`).

### 2.4 Retomar con asistentes de código (Claude Code / Antigravity)

El archivo `CLAUDE.md` en la raíz resume las reglas del proyecto y apunta a este documento. Basta con abrir el proyecto y pedir el cambio.

---

## 3. Estructura del repositorio

```text
index.html                 Página única: barra superior, menú lateral, <main>; metadatos Open Graph
404.html                   Copia de index.html para rutas no generadas (generada por scripts/rutas.mjs)
sitemap.xml                Mapa del sitio con las 58 URLs canónicas (generado)
og-image.png               Miniatura 1200×630 para redes (generada por scripts/og/render.mjs)
<seccion>/index.html       Una copia de index.html por sección y por subsección (generadas, ver §4.3)
css/styles.css             Estilos, tokens de color claro/oscuro, menú, tarjetas, gráficos y @media print
js/
  app.js                   Enrutador (URLs limpias), menú con subsecciones, tema, menú contraíble
  config.js                Municipio (nombre, códigos DANE, cámara), portal, horas de caché
  nav.js                   Menú: orden, nombre, descripción e ícono SVG de las 14 secciones
  sources.js               Catálogo de >65 conjuntos de datos.gov.co (clave → id, entidad, nombre, tema)
  soda.js                  Cliente de la API SODA: caché (memoria + localStorage), concurrencia, metadatos
  ui.js                    Motor de tarjetas: encabezado, vigencia, ámbito, gráfico, tabla, CSV, citas, fuentes
  charts.js                Envoltorio de Chart.js con el estilo y paleta del sitio
  format.js                Formatos numéricos y de fecha es-CO
  freshness.js             Vigencia del dato (actualizado / con rezago / desactualizado / serie cerrada)
  slug.js                  Identificadores de URL a partir de títulos; subsecciones de una sección
  sections/
    helpers.js             Utilidades comunes (series anuales, año corrido, agrupaciones, fechas de corte)
    inicio.js … fuentes.js Módulos de las 14 secciones temáticas (ver §5)
    sui.js                 Carga y utilidades de data/sui-comercial-villeta.json
data/
  esp-villeta.json         ESP Villeta: IANC, estados financieros, notas, indicadores, evaluación SSPD
  sui-comercial-villeta.json  SUI (Superservicios): suscriptores, consumo, facturación por prestador
  rnt-historico-villeta.json  RNT (MinCIT): prestadores activos por año y nuevos inscritos
  snapshots.json           Copias mensuales de RNT, RUPS y REPS (script automático)
scripts/
  snapshot.mjs             Guarda el corte mensual de RNT/RUPS/REPS en data/snapshots.json
  rutas.mjs                Genera las 58 páginas por ruta, 404.html y sitemap.xml
  og/og-image.html         Diseño de la imagen para redes
  og/render.mjs            Convierte og-image.html en og-image.png con Edge/Chrome sin interfaz
.github/workflows/snapshot.yml   Ejecuta snapshot.mjs cada mes y hace commit automático
.nojekyll                  Evita que GitHub Pages procese el sitio con Jekyll
.gitattributes             Fin de línea LF en todos los archivos de texto
```

---

## 4. Cómo funciona

### 4.1 Flujo general

1. `index.html` carga `css/styles.css`, Chart.js (jsDelivr) y `js/app.js` como módulo ES.
2. `app.js` importa las 14 secciones, construye el menú con sus subsecciones y resuelve la ruta de la URL.
3. `ui.js` (`renderSection`) dibuja el encabezado de la sección (con botones **Copiar enlace** e **Imprimir / PDF**), los filtros (si los hay) y cada bloque.
4. Cada bloque de tipo tarjeta ejecuta su `load()`: consulta la API (`q('clave', {$select, $where, …})`) o lee un JSON de `data/`, y devuelve qué dibujar.
5. `ui.js` pinta el gráfico (`charts.js`), la tabla oculta/alternativa, la nota metodológica, el semáforo de vigencia y el pie de fuentes con los botones **Ver tabla**, **Descargar CSV**, **Copiar cita** y **Consulta API**.

### 4.2 Bloques de una sección

Cada archivo de `js/sections/` exporta:

```js
export default {
  id: 'turismo',                  // coincide con el id en js/nav.js y con la URL
  title: 'Turismo y movilidad',
  eyebrow: '…',                   // opcional, línea pequeña sobre el título
  intro: 'Texto (admite HTML)',
  filters: [{ id, label, default, options: [{ value, label }] }],   // opcional
  blocks: [ … ],
};
```

Tipos de bloque:

| `type` | Uso |
|---|---|
| `heading` | Subtítulo de grupo (`title`, `text`). **Cada encabezado es una subsección del menú, tiene botón de copiar enlace y genera una URL propia.** |
| `chart` | Tarjeta con gráfico (y tabla automática o personalizada) |
| `table` | Tarjeta solo con tabla |
| `kpis` | Tarjeta de indicadores clave (cifras grandes con variación y semáforo propio) |
| `text` | Tarjeta con HTML libre devuelto en `html` |
| `html` | Bloque HTML sin marco de tarjeta |

Propiedades del bloque: `title`, `subtitle`, `wide` (ocupa las dos columnas de la grilla), `scope` (ámbito territorial, ver §4.6), `sources` (claves de `sources.js` para el pie), `sourceText` (cita en HTML para fuentes sin API), `note`, `load(ctx)`.

`load({ q, M, filters })` recibe la función de consulta `q`, el municipio `M` (`js/config.js`) y los filtros activos, y devuelve:

| Propiedad | Significado |
|---|---|
| `chart` | Especificación del gráfico (abajo) |
| `table` | `{ columns: [{ key, label, align, format, html }], rows }`; si falta en un `chart`, se arma automáticamente desde las series |
| `kpis` | `[{ label, value, delta, deltaLabel, goodWhen: 'up'|'down', hint, asOf, source, href }]` (admite objetos o promesas independientes) |
| `asOf` | Fecha del dato más reciente (`ofYear`, `ofMonth`, `ofQuarter`, `ofDate` de `freshness.js`); `false` para no mostrarla |
| `sources` | Claves adicionales de `sources.js` a incluir en el pie de la tarjeta |
| `labelTitle` | Encabezado de la primera columna de la tabla automática |
| `note` | Nota metodológica bajo el gráfico o tabla |
| `html` | HTML adicional en el cuerpo de la tarjeta |
| `sourceText` | Cita adicional (texto o lista de textos HTML) |
| `empty`, `emptyText` | La fuente no reporta datos para Villeta en el filtro elegido |

Especificación del gráfico (`charts.js`):

| Campo | Valores |
|---|---|
| `kind` | `bar`, `hbar`, `line`, `stacked`, `hstacked` |
| `labels` | Etiquetas del eje de categorías |
| `series` | `[{ name, data, color (0–7), muted }]` — máximo 8 series |
| `format` | `num`, `dec`, `dec2`, `pct`, `cop`, `compact` o función `(v) => string` |
| `timeline` | `[{ y, m }]` o `[{ y, q }]` paralelo a `labels`: eje mensual/trimestral con línea guía por periodo, mes abreviado y año en dos dígitos; si no cabe, el gráfico se desplaza en horizontal con eje Y y leyenda fijos |
| `months12` | Las etiquetas son los 12 meses y cada serie es un año (comparativo estacional) |
| `partialLast` | Último periodo incompleto: barra más clara y borde punteado |
| `yoy` | El tooltip muestra la variación porcentual frente al periodo anterior |
| `threshold` | `{ value, label }`: línea horizontal de referencia (p. ej. límite IRCA = 5) |
| `footer(i)` | Texto extra en el tooltip del periodo `i` |
| `beginAtZero`, `min`, `max` | Configuración de escala vertical |

### 4.3 Rutas limpias (URLs sin `#`)

- Formato: `/seccion/` y `/seccion/subseccion/`, más filtros en el query string (`/contratacion/?entidad=alcaldia`). En GitHub Pages todo cuelga de `/datavilleta/`.
- La subsección es el `slug` del título de un bloque `heading` (`js/slug.js`): `"Medicina Legal y ciencias forenses"` → `medicina-legal-y-ciencias-forenses`.
- `app.js` calcula la raíz del sitio (`BASE`) a partir del `<base>` o de la URL inicial, fija un `<base>` absoluto e intercepta los clics en enlaces internos para navegar con `history.pushState` sin recargar la página.
- Los enlaces antiguos con `#/seccion?filtros` se redirigen automáticamente a la ruta limpia.
- **GitHub Pages no resuelve rutas dinámicas de SPA por sí solo.** Por eso `scripts/rutas.mjs` genera una copia estática de `index.html` en cada una de las **58 rutas** (`<seccion>/index.html` y `<seccion>/<subseccion>/index.html`) con su `<base href="../">` o `../../`, título específico, descripción, URL canónica y etiquetas Open Graph / Twitter propias, además de `404.html` y `sitemap.xml`.
- **Regenerar siempre** después de cambiar `index.html`, `js/nav.js` o los encabezados (`type: 'heading'`) de cualquier sección: `node scripts/rutas.mjs`.

### 4.4 Consultas a datos.gov.co (`js/soda.js`) y particularidades de las fuentes

- API SODA: `https://www.datos.gov.co/resource/<id>.json` con parámetros SoQL (`$select`, `$where`, `$group`, `$order`, `$limit`). Sin `$limit`, el portal devuelve 1.000 filas; los bloques que agrupan muchos registros usan `$limit: 2000` o `5000`.
- Caché: memoria + `localStorage` (prefijo `dv:v1:`), 6 horas (`CACHE_HORAS` en `config.js`). Máximo 4 consultas HTTP simultáneas. Tiempo de espera: 90 s.
- **Particularidades técnicas resueltas en las consultas SoQL**:
  - **Superfinanciera (`u2wk-tfe3`)**: registra a Villeta con código de departamento `11` en lugar de `25`; por ello se filtra por `nombre_del_municipio='VILLETA'`.
  - **UARIV (`9qih-4vkc` y `krnc-8azs`)**: acumulan múltiples cortes mensuales en la misma tabla con formatos de fecha mixtos (`DD/MM/YYYY` y `YYYY/MM/DD`) y algunos cortes traen errores de codificación (`Desaparicin`). `victimas.js` parsea todas las fechas, filtra estrictamente al corte más reciente y repara los textos dañados.
  - **SECOP Integrado (`rpmr-utcd`)**: es una tabla de millones de filas donde `upper(...) like` causa *timeout*; se filtra con igualdad exacta `municipio_entidad in ('Villeta','VILLETA')`. Además, una persona natural figura erróneamente en el campo `nombre_de_la_entidad`; se agrupa en `"Otras entidades"` para proteger su nombre.
  - **INS COVID-19 (`gt2j-8ykr`)**: el campo `fecha_de_notificaci_n` es de tipo texto (`"2020-12-22 00:00:00"`), por lo que el año se extrae con `substring(fecha_de_notificaci_n, 1, 4)` en lugar de `date_extract_y()`.
  - **CAR Quejas Ambientales (`5ddb-j9e9`)**: los recursos naturales afectados no vienen en una sola columna sino en cinco columnas indicadoras (`agua`, `flora`, `suelo`, `aire`, `fauna`) marcadas con `'X'`.
  - **ADRES BDUA (`tq4m-hmg2` y `d7a5-cnra`)**: las EPS en movilidad entre regímenes llevan el sufijo `-CM` en `ent_nombre`; `salud.js` normaliza los nombres comerciales de las EPS para consolidar sus afiliados por régimen.

### 4.5 Vigencia del dato (`js/freshness.js`)

| Estado | Criterio |
|---|---|
| ✓ Actualizado | Dato anual del año actual o anterior; mensual/diario de hace 3 meses o menos (6 si es trimestral) |
| ◔ Con rezago | Anual de hace 2 años; mensual/diario hasta 12 meses (15 trimestral) |
| ! Desactualizado | Más antiguo que los umbrales anteriores |
| ■ Serie cerrada | La fuente cerró formalmente esa serie histórica (p. ej. EVA 2007–2018 o COVID-19 histórico) |

### 4.6 Ámbito territorial del dato (`scope`)

Cuando una cifra no es exclusiva de la jurisdicción municipal de Villeta, el bloque declara `scope: { nivel, texto }` y la tarjeta muestra un recuadro ámbar de advertencia:

1. **Economía → Registro mercantil (RUES)**: cubre toda la jurisdicción de la Cámara de Comercio de Facatativá (código `47`), que abarca municipios de Sabana Occidente, Gualivá y Tequendama.
2. **Turismo y movilidad → Peaje Caiquero (ANI)**: mide todos los vehículos que cruzan la estación de peaje Caiquero en el tramo Dindal–Villeta del corredor Bogotá–La Vega–Villeta–Guaduas (visitantes al municipio + tránsito pasante).
3. **Educación → Saber 11**: comparación del puntaje global de los colegios de Villeta frente al promedio departamental de Cundinamarca.
4. **Agro y tierra rural → Informalidad de la tierra (UPRA)**: comparación del índice de informalidad rural de Villeta (40,39 %) frente a los otros 11 municipios de la Provincia del Gualivá.

---

## 5. Secciones, bloques y fuentes

Claves de fuente = `js/sources.js`. Entre paréntesis, el identificador Socrata en `datos.gov.co`.

### 5.1 Resumen (`inicio`)
- **12 indicadores clave en vivo**: prestadores turísticos activos (`rnt`), llegada de pasajeros (`supertransporte`), tráfico anual en el Peaje Caiquero (`ani_peajes`), hurto a personas (`delito_hurto_personas`), homicidios (`delito_homicidio`), violencia intrafamiliar (`delito_vif`), valor contratado en SECOP (`secop`), cartera de créditos (`sfc_captaciones`), pobreza en Sisbén IV Grupos A y B (`sisben`), calidad del agua IRCA (`ins_irca`), cobertura educativa neta (`men`) y crédito agropecuario FINAGRO (`finagro`).
- **Tarjetas de acceso a las 13 secciones temáticas**.
- **Guía rápida para periodistas, investigadores y servidores públicos**.
- **Ficha institucional y territorial de Villeta**.

### 5.2 Turismo y movilidad (`turismo`)
- **Oferta turística vigente** — RNT vigente (`rnt`, `thwd-ivmp`): KPIs de prestadores activos, habitaciones, camas y empleos; prestadores por subcategoría; capacidad por tipo; directorio de los principales establecimientos de alojamiento.
- **Evolución del registro turístico, 2005–2026** — `data/rnt-historico-villeta.json` (tablero de MinCIT) y `data/snapshots.json`: prestadores activos por año y grupo; hoteles y centros vacacionales; viviendas turísticas; nuevas inscripciones (desde 2018); entradas vs. salidas estimadas del registro; capacidad histórica 2005–2021; evolución de cortes mensuales.
- **Llegada de visitantes por carretera** — Supertransporte (`supertransporte`, `eh75-8ah6`): pasajeros despachados hacia Villeta por año, curva de estacionalidad mensual, terminales de origen y variación interanual de año corrido.
- **Flujo vehicular en el corredor vial (Peaje Caiquero – ANI)** — ANI (`ani_peajes`, `8yi9-t44c`, con `scope` de corredor vial): serie anual 2014–2026 de vehículos livianos (Cat. I) frente a buses y camiones (Cat. II–V) en la estación Caiquero.

### 5.3 Economía, empresas y sistema financiero (`economia`)
- **Registro mercantil – CC Facatativá** (`scope` regional): RUES matrículas y cancelaciones (`rues`, `c82u-588k`), nuevos establecimientos (`rues_estab`, `nb3d-v3n7`), actividad económica CIIU y organización jurídica.
- **Sistema financiero en Villeta**: Superfinanciera (`sfc_captaciones`, `u2wk-tfe3`) con KPIs y serie trimestral de cartera total, **cartera de vivienda**, depósitos totales, ahorro y **saldo y número de títulos CDT**; puntos de atención financiera por mes y por entidad (`sfc_puntos`, `vkbt-desu`).
- **Empresas y entidades vigiladas**: Supersociedades 10.000 empresas más grandes (`supersociedades`, `6cat-2gcs`) y Supersolidaria (`supersolidaria`, `kg2d-yfyg`).

### 5.4 Servicios públicos (`servicios`)
- **Acueducto, alcantarillado y aseo**: RUPS (`rups`, `4qkq-csdn`), calidad del agua IRCA urbano/rural (`ins_irca`, `nxt2-39c3`) y toneladas de residuos sólidos (`sspd_residuos`, `d7pt-p5fi`).
- **Suscriptores por servicio y acueductos comunitarios**: `data/sui-comercial-villeta.json` (ESP Villeta + 4 asociaciones comunitarias: Fernando Salazar y Río Dulce, Mave Bagazal, Caserío El Puente y La Masata).
- **Energía eléctrica y gas**: suscriptores mensuales, kWh facturados y comercializadores (SUI), más reclamaciones PQR de energía (`sspd_pqr_energia`, `myu9-6wb7`).
- **Conectividad**: serie histórica trimestral de accesos fijos (`mintic_internet_hist` `n48w-gutb` + `mintic_internet` `hwrp-3su3`), desglose por **tecnología**, por **proveedor**, por **segmento y estrato socioeconómico**, por **franja de velocidad de bajada (Mbps)** y tabla de **cobertura móvil 2G/3G/4G LTE por centro poblado y operador** (`mintic_cobertura_movil`, `9mey-c8s8`).

### 5.5 ESP Villeta (`esp`)
Todo desde `data/esp-villeta.json` salvo la contratación (SECOP en vivo) y la comparativa comercial con el SUI (`data/sui-comercial-villeta.json`):
- Resumen de la empresa, **Agua no contabilizada (IANC 2012–2025 y mensual 2023–2025)**, **Suscriptores, consumo y facturación en SUI**, **Estados financieros 2018–2025**, **Indicadores financieros en 4 grupos (liquidez, rentabilidad, endeudamiento y eficiencia)**, **Presupuesto, reporte SUI y hallazgos de Superservicios**, y **Contratación en SECOP**.

### 5.6 Seguridad, justicia forense y convivencia (`seguridad`)
Filtros: año de inicio de la serie y delito seleccionado.
- **Año corrido**: tabla comparativa de los 15 delitos SIEDCO y curva mensual de los últimos 3 años del delito elegido.
- **Serie histórica por delito**: 15 *small multiples* anuales (Policía Nacional – MinDefensa).
- **Detalle por modalidad**: **arma o medio empleado en el delito seleccionado**, hurto a vehículos por tipo, delitos ambientales por conducta y delitos informáticos por conducta.
- **Medicina Legal y ciencias forenses**:
  - Violencia intrafamiliar valorada por Medicina Legal según contexto (`medlegal_vif`, `ers2-kerr`: pareja, NNA, adulto mayor, otros familiares).
  - Homicidios y suicidios forenses en Villeta (`medlegal_homicidios` `vtub-3de2`, `medlegal_suicidios` `f75u-mirk`, `medlegal_fatales` `2kpj-cktv`).
  - Personas reportadas como desaparecidas en el SIRDEC según estado (`medlegal_desaparecidos`, `8hqm-7fdt`).
  - Lesiones fatales de causa externa recientes por manera de muerte (`medlegal_fatales`, `2kpj-cktv`).
- **Siniestralidad vial y convivencia ciudadana**:
  - Vehículos involucrados en accidentes de tránsito en Villeta por clase de vehículo y gravedad (`mintransporte_accidentes`, `6jmc-vaxk`).
  - Comportamientos contrarios a la convivencia y medidas correctivas de la Ley 1801 (`policia_convivencia` `xac8-4he4`, `policia_comparendos` `7j4w-6p73`).

### 5.7 Educación, cultura y formación laboral (`educacion`)
- **Educación preescolar, básica y media** (`men`, `nudc-7mev`): cobertura neta y bruta total; **cobertura neta desagregada por nivel educativo** (transición, primaria, secundaria y media); tasas generales de deserción, reprobación y repitencia; **deserción intraanual por nivel educativo**; población de 5 a 16 años y sedes conectadas a internet.
- **Pruebas Saber 11 (ICFES)** (`icfes`, `kgxf-xxbe`): puntaje global Villeta vs. Cundinamarca (`scope` departamental); **puntaje global por naturaleza del colegio (Oficial vs. No oficial)**; **porcentaje de evaluados con acceso a internet y computador en el hogar**; puntaje por área evaluada y tabla de resultados por colegio.
- **Tecnología educativa, formación laboral (SENA) y cultura**: equipos entregados y docentes formados por **Computadores para Educar** (`mintic_cpe`, `pyqj-s96k`); aprendices certificados por el **SENA** en Villeta por nivel de formación y sexo (`sena_certificados`, `28vu-5tx7`); beneficiarios de programas culturales (`mincultura`, `bq7b-e3sb`).

### 5.8 Salud y vigilancia epidemiológica (`salud`)
- **Aseguramiento y red de prestadores**: KPIs de afiliación por régimen (`afiliados`, `hn4i-593p`) y vigilancia; **afiliados por EPS y régimen (Contributivo y Subsidiado)** y **estructura de afiliados por grupo de edad y régimen** en la Base de Datos Única de Afiliados (**BDUA – ADRES**: `adres_contributivo` `tq4m-hmg2` y `adres_subsidiado` `d7a5-cnra`); sedes de prestadores por clase/naturaleza y directorio habilitado en el **REPS** (`reps`, `c36g-9fc2`, anonimizando profesionales independientes).
- **Vigilancia en salud pública (SIVIGILA e INS)**: eventos de interés en salud pública notificados en Villeta (`ins_sivigila`, `fhc4-jjti`: agresiones rábicas, dengue, violencia de género, leishmaniasis, desnutrición aguda infantil, etc.) y serie histórica anual de casos y fallecimientos por **COVID-19** (`ins_covid`, `gt2j-8ykr`).

### 5.9 Población, Sisbén y protección social (`social`)
- **KPIs de focalización social**: personas expandidas en Sisbén IV, porcentaje en pobreza (Grupos A y B), beneficiarios activos de Más Familias en Acción, cupos y presupuesto de Colombia Mayor (`dps_colombia_mayor`, `7tfe-kjaw`), afiliados/pensionados de Colpensiones y total de organizaciones comunales.
- **Clasificación socioeconómica (Sisbén IV)** (`sisben`, `hq2v-5umk`): personas categorizadas por grupo (`A` pobreza extrema, `B` pobreza moderada, `C` vulnerabilidad, `D` no pobre ni vulnerable) y comparación entre cabecera urbana y centros poblados / rural disperso.
- **Programas de superación de la pobreza y primera infancia**: inversión y cobertura por programa de Prosperidad Social (`dps_inversion`, `deuu-ikix`), beneficiarios activos de Más Familias en Acción por edad y género (`dps_familias`, `xfif-myr2`), beneficiarios de Primera Infancia del **ICBF** por servicio (`icbf_beneficiarios`, `5akr-u7t8`) y directorio de Unidades de Servicio (UDS) en el Centro Zonal Villeta (`icbf_uds`, `i8ww-5mcf`).
- **Protección a la vejez y organización comunitaria**: afiliados por género y pensionados de **Colpensiones** (`colpensiones_afiliados` `xfsi-rqje`, `colpensiones_pensionados` `hdnf-a76p`) y directorio de las 58 **Juntas de Acción Comunal (JAC) y de Vivienda Comunitaria** registradas ante el IDACO (`idaco_jac`, `tjdz-uu2b`).

### 5.10 Agro, uso del suelo y tierra rural (`agro`)
- **Caña panelera y producción agrícola**: área sembrada y producción en las dos series de las Evaluaciones Agropecuarias Municipales (`eva_hist` `2pnw-mmge` en toneladas de panela 2007–2018 y `eva` `uejq-wxrr` en toneladas de caña 2019+) y área de otros cultivos.
- **Ganadería y crédito rural**: inventario bovino y predios vacunados (`fng`, `cea5-4ctf`), desembolsos anuales y por cadena productiva de **FINAGRO** (`finagro`, `jjvv-55ck`), y **crédito agropecuario por tamaño de productor, sexo (mujer rural) y subsidios otorgados**.
- **Uso del suelo y tenencia de la tierra rural**: predios por destino económico y sector (`catastro`, `h9h6-gkdg`), **superficie catastral en hectáreas por destino económico**, e **índice de informalidad en la tenencia de la tierra rural de la UPRA** comparado entre los 12 municipios de la Provincia del Gualivá (`upra_informalidad`, `nr49-4vwb`, con `scope` provincial).

### 5.11 Contratación y finanzas públicas (`contratacion`)
Filtro por entidad contratante (Todas, Alcaldía, Hospital Salazar, ESP Villeta, Bomberos, Concejo, Colegios, Otras).
- **Contratos públicos (SECOP)** (`secop`, `rpmr-utcd`): KPIs de año corrido, contratos y valor por año, valor por entidad, modalidad de selección, tipo de contrato, principales contratistas (personas jurídicas) y tabla de contratos recientes.
- **Regalías y desempeño municipal**: proyectos del Sistema General de Regalías (`sgr`, `g4qj-2p2e`) y Medición del Desempeño Municipal del DNP (`mdm`, `nkjx-rsq7`).

### 5.12 Víctimas del conflicto y restitución de tierras (`victimas`)
- **Registro Único de Víctimas (UARIV)**: desplazamiento forzado anual por expulsión y llegada (`uariv_desplazamiento`, `krnc-8azs`), víctimas por hecho victimizante (`uariv_hechos`, `9qih-4vkc`) y **caracterización demográfica de las víctimas por ciclo vital y sexo**.
- **Restitución de tierras (URT)** (`urt_restitucion`, `33hn-pgph`): KPIs de solicitudes recibidas en el SRTDAF, predios reclamados, titulares asociados, solicitudes microfocalizadas e inscritas en Villeta.

### 5.13 Territorio, clima, riesgo y ambiente (`territorio`)
- **Gestión del riesgo de desastres (UNGRD)**: serie anual por tipo de evento y tabla detallada de emergencias reportadas (`ungrd_2019` `4fd8-ptcr`, `ungrd_2020` `4t8v-ywmw`, `ungrd_2023` `rgre-6ak4`, `ungrd_v2` `2343-nuqp`).
- **Quejas y conflictividad ambiental (CAR Cundinamarca)** (`car_quejas`, `5ddb-j9e9`): serie histórica 2009–presente de quejas ambientales radicadas en Villeta y distribución según recurso natural afectado (flora, agua, suelo, aire y fauna).
- **Clima y red hidrometeorológica (IDEAM)**: serie de temperatura media anual del aire (°C) en la estación automática de Villeta (`ideam_temperatura`, `sbwg-7ju4`) y catálogo de las **24 estaciones hidrometeorológicas del IDEAM** en el municipio (`ideam_estaciones`, `hp9r-jxuu`).
- **Cartografía oficial y capas de amenaza y riesgo**: búsqueda en vivo de mapas y capas geográficas de Villeta mediante la API de catálogo de `datos.gov.co`.

### 5.14 Fuentes y metodología (`fuentes`)
- **Catálogo de conjuntos de datos en vivo** (más de 65 conjuntos con fecha de actualización consultada en tiempo real en `/api/views`).
- **Metodología y guía para periodistas y servidores públicos**.
- **Documentos técnicos transcritos (ESP Villeta y SUI) y explorador en vivo de nuevos conjuntos en `datos.gov.co`**.

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

**IANC.** Fórmula: `(volumen producido − volumen facturado) ÷ volumen producido × 100`. 2017, 2020, 2021 y 2022 no tienen un valor válido publicado; 2014 aparece en el SUI como −16 % y la Superservicios lo marcó como inválido. 2023–2025 se calcularon con los volúmenes mensuales. **El IANC de 2026 no es público** hasta que la ESP publique su informe de control social a comienzos de 2027.

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

### 6.3 `data/rnt-historico-villeta.json` — Registro Nacional de Turismo (MinCIT)

**Origen.** Tablero Power BI público "Registro Nacional de Turismo" del Viceministerio de Turismo, enlazado desde PorTuColombia:
https://portucolombia.mincit.gov.co/tematicas/cifras-empresariales-del-sector/registro-nacional-de-turismo-rnt-1

**Datos.** `historico` = `[año, categoría, subcategoría, prestadores, habitaciones, camas, empleados]` de prestadores **activos** por año (habitaciones, camas y empleados solo hasta 2021); `nuevos` = `[año, categoría, subcategoría, número]` de inscripciones por primera vez (desde 2018). 2026 es acumulado al 30 de septiembre.

**Cómo se consultó.** Desde la página del tablero (`app.powerbi.com`), con la API pública que usa el propio tablero: `POST https://wabi-paas-1-scus-api.analysis.windows.net/public/reports/querydata?synchronous=true` con el encabezado `X-PowerBI-ResourceKey: b3996b70-fdb0-4d6d-aba8-9ba88a70d243`, `DatasetId 9853cab7-41aa-4853-93eb-e3605e0e0cd4`, `ReportId 737e95d9-c887-4b37-944b-1a3e530f7c7d`, `modelId 2326806`.

### 6.4 `data/snapshots.json` — cortes mensuales automáticos

`scripts/snapshot.mjs` consulta RNT, RUPS y REPS (que en `datos.gov.co` solo son "fotografía vigente") y agrega una entrada por mes. Lo ejecuta `.github/workflows/snapshot.yml` mensualmente y hace commit. A mano: `node scripts/snapshot.mjs`.

---

## 7. Convenciones del proyecto

- **Fuente siempre visible** y **vigencia del dato** en cada tarjeta (`asOf`).
- **Ámbito (`scope`)**: obligatorio si el dato no es exclusivo del municipio de Villeta.
- **Sin datos personales**: jamás se publican correos, teléfonos ni nombres de personas naturales aunque estén en las fuentes abiertas (Leyes 1581 de 2012 y 1712 de 2014). Los nombres de empresas y entidades públicas o jurídicas sí se muestran.
- **Textos** en español de Colombia (`es-CO`), claros para periodistas, funcionarios y ciudadanía; números formateados siempre con `format.js` (`num`, `pct`, `cop`, `compact`).
- **Gráficos**: máximo 8 series, una sola escala vertical, sin colores reciclados; el año en curso se marca con `*` y barra más clara (`partialLast`).
- **Datos transcritos**: guardar en `data/*.json` con `_nota`, `fuente` y, cuando aplique, `calidad`; verificar sumas aritméticas y contrastar con otra fuente cuando exista.
- **Commits** en español, descriptivos. No hacer `git push` sin solicitud explícita del propietario del repositorio.

---

## 8. Historial resumido

| Fecha | Cambio |
|---|---|
| Oct. 2026 | Primera versión: 13 secciones con datos en vivo de `datos.gov.co`, fuentes y vigencia por gráfico |
| Oct. 2026 | Sección ESP Villeta (IANC 2012–2025, estados financieros, evaluación SSPD) |
| Oct. 2026 | Tema con interruptor, menú contraíble, ejes mensuales con guías |
| Oct. 2026 | SUI: suscriptores, consumo y facturación por servicio; acueductos comunitarios; publicación en GitHub Pages |
| Oct. 2026 | Etiqueta de ámbito regional; serie anual del RNT 2005–2026 |
| Oct. 2026 | Indicadores financieros de la ESP en cuatro grupos; contratación año a año por entidad, modalidad y tipo |
| Oct. 2026 | URLs sin `#`, subsecciones en el menú, imagen y metadatos para redes |
| Nov. 2026 | Ampliación a 14 secciones y >65 conjuntos de datos en vivo: nueva sección de **Población, Sisbén IV y protección social** (DNP Sisbén IV, Prosperidad Social, ICBF, Colpensiones, Juntas de Acción Comunal IDACO); incorporación de **Medicina Legal**, siniestralidad vial (MinTransporte) y comparendos de convivencia (Ley 1801) en Seguridad; **ADRES (BDUA por EPS y edad)**, **SIVIGILA** y **COVID-19** en Salud; cobertura y deserción por nivel educativo, brecha oficial/privado en Saber 11, **Computadores para Educar** y **SENA** en Educación; flujo vehicular en el **Peaje Caiquero (ANI)** en Turismo; área catastral en hectáreas, crédito FINAGRO por tipo de productor/mujer rural e **informalidad de la tierra (UPRA)** en Agro; **restitución de tierras (URT)** y demografía de víctimas en Víctimas; **quejas ambientales CAR Cundinamarca** y **estaciones y clima del IDEAM** en Territorio; velocidad y estratos de internet fijo y **cobertura móvil por centro poblado** en Servicios; herramientas editoriales para periodistas y funcionarios (**Copiar cita**, **Copiar enlace**, **Imprimir / PDF** y guía de verificación). |

El detalle completo está en `git log`.
