# Datavilleta · Villeta, Cundinamarca en datos públicos

**Sitio en línea:** <https://leotinoco.github.io/datavilleta/>  
**Documentación técnica y metodológica:** [`docs/DOCUMENTACION.md`](docs/DOCUMENTACION.md)

**Datavilleta** es un observatorio territorial de datos públicos sobre el municipio de **Villeta, Cundinamarca** (código DANE `25875`, Provincia del Gualivá). Conecta en tiempo real desde el navegador con **más de 65 conjuntos de datos oficiales** del Portal de Datos Abiertos del Estado colombiano ([datos.gov.co](https://www.datos.gov.co)) —mediante la API Socrata (SODA) y consultas en lenguaje SoQL— e integra series históricas auditadas de servicios públicos y turismo.

Está diseñado como una herramienta de **consulta, verificación y citación** para **periodistas, servidores públicos, concejales, investigadores, veedurías ciudadanas y habitantes del municipio**.

---

## Guía rápida para periodistas y servidores públicos

1. **Verificación en vivo de cada cifra (`Consulta API`)**  
   Ningún gráfico es una imagen estática ni una cifra sin respaldo. Al pie de cada tarjeta aparece la entidad oficial productora del dato, el enlace directo al conjunto en `datos.gov.co` (con su fecha de actualización en el portal) y el desplegable **`Consulta API`**, que abre la sentencia SoQL exacta contra el servidor del Estado para auditar los registros originales.
2. **Descarga de tablas (`Descargar CSV`) y alternancia gráfica (`Ver tabla`)**  
   Todas las visualizaciones cuentan con versión tabular accesible y descarga directa en archivo `.csv` (codificado en UTF-8 con BOM y separador `;`, listo para abrir en Microsoft Excel en español, LibreOffice, R o Python).
3. **Citación técnica en un clic (`Copiar cita`)**  
   El botón **`Copiar cita`** al pie de cada tarjeta copia al portapapeles la referencia completa con el título del indicador, la entidad responsable, el identificador del conjunto en `datos.gov.co`, el enlace canónico y la fecha de consulta, lista para pegar en notas periodísticas, informes de gestión, planes de desarrollo o derechos de petición.
4. **Enlaces directos por sección y subsección (`Copiar enlace`)**  
   Cada una de las **58 rutas** del observatorio tiene su propio archivo HTML estático con metadatos Open Graph y enlace canónico (por ejemplo, `/seguridad/medicina-legal-y-ciencias-forenses/` o `/esp/agua-no-contabilizada-ianc/`).
5. **Impresión y exportación a PDF (`Imprimir / PDF`)**  
   El encabezado de cada sección incluye el botón **`Imprimir / PDF`**, que formatea automáticamente la vista en modo claro de alto contraste, oculta controles de navegación y evita cortes de página dentro de las tarjetas.
6. **Semáforo de vigencia y advertencias de alcance territorial**  
   - **Vigencia:** cada tarjeta e indicador calcula automáticamente la edad de su último registro frente a la fecha actual y muestra si está **✓ Actualizado**, **◔ Con rezago**, **! Desactualizado** o **■ Serie cerrada**.
   - **Alcance territorial (`Alcance:`):** cuando una fuente oficial no desagrega a nivel municipal o mide un flujo regional (como la Cámara de Comercio de Facatativá en RUES, el Peaje Caiquero de la ANI o las comparativas con Cundinamarca y la Provincia del Gualivá), una etiqueta ámbar en el encabezado de la tarjeta lo advierte explícitamente.
7. **Protección de datos personales**  
   En cumplimiento de las Leyes 1581 de 2012 y 1712 de 2014, el observatorio omite nombres de personas naturales, números telefónicos y direcciones de correo electrónico aunque figuren en las bases abiertas originales (p. ej. profesionales independientes en el REPS o contratistas personas naturales en el SECOP).

---

## Secciones del observatorio

| Sección | Ruta | Contenido principal |
|---|---|---|
| **Resumen** | `/` | 12 indicadores clave en tiempo real con variación interanual, guía rápida de verificación, mapa de áreas temáticas y ficha institucional de Villeta. |
| **Turismo y movilidad** | `/turismo/` | Oferta activa en el Registro Nacional de Turismo (RNT), capacidad en habitaciones y camas, evolución histórica 2005–2026 (altas y bajas estimadas), llegada de pasajeros desde terminales (Supertransporte) y flujo vehicular anual por el **Peaje Caiquero** (ANI). |
| **Economía y empresas** | `/economia/` | Dinámica empresarial en la jurisdicción de la Cámara de Comercio de Facatativá (RUES), cartera total y de vivienda, depósitos de ahorro, CDT y puntos de atención financiera en Villeta (Superfinanciera), grandes empresas (Supersociedades) y cooperativas (Supersolidaria). |
| **Servicios públicos** | `/servicios/` | Prestadores inscritos en RUPS, calidad del agua para consumo humano (IRCA – INS), residuos sólidos dispuestos, series comerciales del SUI (suscriptores, consumo y facturación de la ESP y los 4 acueductos comunitarios, energía y gas), PQR de energía, e internet fijo por tecnología, proveedor, estrato/segmento, velocidad de bajada y cobertura móvil por centro poblado (MinTIC). |
| **ESP Villeta** | `/esp/` | Radiografía técnica y financiera de la Empresa de Servicios Públicos de Villeta: Índice de Agua No Contabilizada (IANC, 49,33 % en 2025), planta de tratamiento, suscriptores por estrato, estados financieros 2020–2025 y evaluación integral de la Superservicios. |
| **Seguridad y justicia** | `/seguridad/` | Comparativo de año corrido y series históricas desde 2003 para 15 delitos (SIEDCO – Policía Nacional), desglose por arma o medio empleado, dictámenes de **Medicina Legal** (violencia intrafamiliar según contexto, homicidios, suicidios, personas desaparecidas en SIRDEC y lesiones fatales recientes), siniestralidad vial por clase de vehículo (MinTransporte) y comparendos de convivencia (Ley 1801). |
| **Educación, cultura y SENA** | `/educacion/` | Cobertura neta y bruta, cobertura y deserción desagregadas por nivel educativo (transición, primaria, secundaria y media), conectividad escolar (MEN), resultados históricos de pruebas **Saber 11** frente a Cundinamarca, brecha oficial vs. privado, acceso a internet y computador en el hogar (ICFES), entregas de **Computadores para Educar** (MinTIC), aprendices certificados por el **SENA** y beneficiarios de MinCultura. |
| **Salud y epidemiología** | `/salud/` | Afiliación por régimen (MinSalud), distribución de afiliados por **EPS** y por **grupo etario** en los regímenes contributivo y subsidiado (**BDUA – ADRES**), sedes habilitadas en el REPS, notificación de eventos de interés en salud pública en **SIVIGILA** (dengue, agresiones rábicas, desnutrición, leishmaniasis) y balance histórico de **COVID-19** (INS). |
| **Población y protección social** | `/social/` | Personas categorizadas en **Sisbén IV** por grupo (`A` pobreza extrema, `B` pobreza moderada, `C` vulnerabilidad, `D` no pobre ni vulnerable) y por zona urbana vs. rural (DNP), inversión y cobertura por programa de **Prosperidad Social** (Más Familias en Acción, Colombia Mayor, Ingreso Solidario, Devolución del IVA), atención a la primera infancia y directorio de Unidades de Servicio del **ICBF** (Centro Zonal Villeta), afiliados y pensionados en **Colpensiones** y directorio de 58 **Juntas de Acción Comunal** (IDACO). |
| **Agro y tierra rural** | `/agro/` | Evaluaciones Agropecuarias Municipales (EVA 2007–2018 y 2019+) con foco en caña panelera y otros cultivos, inventario bovino (Fedegán / ICA), crédito agropecuario **FINAGRO** por cadena productiva, tamaño de productor y género (mujer rural), predios y **superficie en hectáreas** por destino económico (Agencia Catastral de Cundinamarca) e **índice de informalidad en la tenencia de la tierra rural** en la Provincia del Gualivá (UPRA). |
| **Contratación y finanzas** | `/contratacion/` | Contratos públicos en SECOP Integrado (año corrido, histórico anual, modalidades y principales contratistas personas jurídicas), proyectos del Sistema General de Regalías (SGR) y Medición del Desempeño Municipal (MDM – DNP). |
| **Víctimas y restitución** | `/victimas/` | Desplazamiento forzado anualizado (expulsión y recepción), víctimas por hecho victimizante, caracterización demográfica por ciclo vital y sexo (UARIV – RUV) y solicitudes de restitución de tierras en el **SRTDAF** (Unidad de Restitución de Tierras). |
| **Territorio, clima y ambiente** | `/territorio/` | Emergencias reportadas a la UNGRD, histórico anual y por recurso natural afectado de **quejas ambientales ante la CAR Cundinamarca** (2009–presente), serie de temperatura media anual y catálogo de **24 estaciones hidrometeorológicas del IDEAM** en Villeta, y capas geográficas oficiales de amenaza y riesgo en `datos.gov.co`. |
| **Fuentes y metodología** | `/fuentes/` | Catálogo en vivo de los más de 65 conjuntos de datos utilizados con fecha de actualización en el portal, principios metodológicos, guía para prensa y gestión pública, documentos transcritos de la ESP y el SUI, buscador en vivo de nuevos conjuntos (Discovery API) y portales complementarios. |

---

## Catálogo de fuentes oficiales conectadas en vivo (`datos.gov.co`)

| Tema | Entidad | Conjunto de datos | ID Socrata |
|---|---|---|---|
| **Turismo y movilidad** | MinCIT | Registro Nacional de Turismo – RNT | `thwd-ivmp` |
| **Turismo y movilidad** | Supertransporte | Operación de pasajeros y despacho de vehículos en terminales | `eh75-8ah6` |
| **Turismo y movilidad** | ANI | Tráfico vehicular mensual por categoría tarifaria en peajes (Peaje Caiquero) | `8yi9-t44c` |
| **Turismo y movilidad** | MinTransporte – RUNT | Vehículos eléctricos e híbridos matriculados en el RUNT | `ntxy-q9ix` |
| **Economía** | Confecámaras – RUES | Personas naturales, jurídicas y ESAL (CC Facatativá) | `c82u-588k` |
| **Economía** | Confecámaras – RUES | Establecimientos, agencias y sucursales (CC Facatativá) | `nb3d-v3n7` |
| **Economía** | Superfinanciera | Saldo de captaciones y colocaciones por municipios | `u2wk-tfe3` |
| **Economía** | Superfinanciera | Puntos de atención de canales financieros por municipio | `vkbt-desu` |
| **Economía** | Supersociedades | 10.000 empresas más grandes del país | `6cat-2gcs` |
| **Economía** | Supersolidaria | Listado de entidades del sector solidario | `kg2d-yfyg` |
| **Servicios públicos** | Superservicios | Registro Único de Prestadores de Servicios Públicos – RUPS | `4qkq-csdn` |
| **Servicios públicos** | Superservicios | Residuos generados en el área de prestación del servicio de aseo | `d7pt-p5fi` |
| **Servicios públicos** | Superservicios | Reclamaciones y quejas del servicio de energía eléctrica | `myu9-6wb7` |
| **Servicios públicos** | INS – SIVICAP | Calidad del agua para consumo humano (IRCA) | `nxt2-39c3` |
| **Servicios públicos** | MinVivienda | Proyectos de inversión en acceso a agua potable y saneamiento básico | `tcwu-r53g` |
| **Servicios públicos** | MinTIC | Internet fijo: accesos por tecnología y segmento (histórico) | `n48w-gutb` |
| **Servicios públicos** | MinTIC | Accesos fijos a internet por proveedor, municipio, tecnología y velocidad | `hwrp-3su3` |
| **Servicios públicos** | MinTIC | Cobertura móvil por tecnología, municipio y centro poblado | `9mey-c8s8` |
| **Educación y SENA** | MEN | Estadísticas en educación preescolar, básica y media por municipio | `nudc-7mev` |
| **Educación y SENA** | MEN | Directorio de establecimientos educativos de preescolar, básica y media | `cfw5-qzt5` |
| **Educación y SENA** | ICFES | Resultados únicos Saber 11 | `kgxf-xxbe` |
| **Educación y SENA** | MinTIC – CPE | Computadores para Educar: equipos entregados y docentes formados | `pyqj-s96k` |
| **Educación y SENA** | SENA | Certificación de Formación Profesional Integral por municipio | `28vu-5tx7` |
| **Educación y SENA** | MinCulturas | Beneficiarios del Ministerio de las Culturas, las Artes y los Saberes | `bq7b-e3sb` |
| **Salud** | MinSalud | Registro Especial de Prestadores y Sedes de Servicios de Salud – REPS | `c36g-9fc2` |
| **Salud** | MinSalud | Número de afiliados por departamento, municipio y régimen | `hn4i-593p` |
| **Salud** | ADRES | BDUA – Régimen Contributivo por EPS y grupo etario | `tq4m-hmg2` |
| **Salud** | ADRES | BDUA – Régimen Subsidiado por EPS y grupo etario | `d7a5-cnra` |
| **Salud** | INS – SIVIGILA | Notificación de eventos de interés en salud pública por municipio | `fhc4-jjti` |
| **Salud** | INS | Casos positivos de COVID-19 en Colombia (histórico municipal) | `gt2j-8ykr` |
| **Protección social** | DNP – Sisbén IV | Personas registradas en Sisbén IV por grupo y zona | `hq2v-5umk` |
| **Protección social** | Prosperidad Social | Ficha de inversión y cobertura municipal en programas sociales | `deuu-ikix` |
| **Protección social** | Prosperidad Social | Beneficiarios de Más Familias en Acción / Renta Ciudadana | `xfif-myr2` |
| **Protección social** | Prosperidad Social | Cupos y asignación presupuestal de Colombia Mayor | `7tfe-kjaw` |
| **Protección social** | ICBF | Beneficiarios de programas de Primera Infancia por modalidad | `5akr-u7t8` |
| **Protección social** | ICBF | Directorio de Unidades de Servicio (UDS) de Primera Infancia | `i8ww-5mcf` |
| **Protección social** | Colpensiones | Afiliados al Régimen de Prima Media por municipio y género | `xfsi-rqje` |
| **Protección social** | Colpensiones | Pensionados del Régimen de Prima Media por municipio | `hdnf-a76p` |
| **Protección social** | IDACO Cundinamarca | Directorio de Juntas de Acción Comunal y Juntas de Vivienda Comunitaria | `tjdz-uu2b` |
| **Agro y tierra rural** | MinAgricultura | Evaluaciones Agropecuarias Municipales – EVA 2007–2018 | `2pnw-mmge` |
| **Agro y tierra rural** | UPRA | Evaluaciones Agropecuarias Municipales – EVA 2019 en adelante | `uejq-wxrr` |
| **Agro y tierra rural** | FNG – Fedegán / ICA | Inventario bovino y bufalino por ciclo de vacunación | `cea5-4ctf` |
| **Agro y tierra rural** | FINAGRO | Desembolsos de crédito de fomento agropecuario | `jjvv-55ck` |
| **Agro y tierra rural** | UPRA | Índice de informalidad en la tenencia de la tierra rural por municipio | `nr49-4vwb` |
| **Agro y tierra rural** | Catastro Cundinamarca | Base catastral multipropósito del municipio de Villeta | `h9h6-gkdg` |
| **Contratación** | Colombia Compra Eficiente | SECOP Integrado (SECOP I y II) | `rpmr-utcd` |
| **Contratación** | MinHacienda | Ejecución presupuestal del Sistema General de Regalías (SGR) | `g4qj-2p2e` |
| **Contratación** | DNP | Medición del Desempeño Municipal (MDM) | `nkjx-rsq7` |
| **Víctimas** | UARIV | Cifras de víctimas por hechos – nivel municipal | `9qih-4vkc` |
| **Víctimas** | UARIV | Desplazamiento anualizado: ocurrencia y llegada – nivel municipal | `krnc-8azs` |
| **Víctimas** | URT | Solicitudes de inscripción en el Registro de Tierras Despojadas (SRTDAF) | `33hn-pgph` |
| **Seguridad y justicia** | MinDefensa – Policía | 15 conjuntos de delitos SIEDCO (hurtos, homicidio, lesiones, VIF, sexuales, extorsión, abigeato, informáticos, tránsito, ambiente, secuestro) | `4rxi-8m8d` y 14 más |
| **Seguridad y justicia** | Medicina Legal | Presuntos homicidios, violencia intrafamiliar, suicidios, desaparecidos (SIRDEC) y lesiones fatales preliminares | `vtub-3de2`, `ers2-kerr`, `f75u-mirk`, `8hqm-7fdt`, `2kpj-cktv` |
| **Seguridad y justicia** | MinTransporte | Vehículos involucrados en accidentes de tránsito | `6jmc-vaxk` |
| **Seguridad y justicia** | Policía Nacional | Medidas correctivas y comportamientos contrarios a la convivencia (Ley 1801) | `7j4w-6p73`, `xac8-4he4` |
| **Territorio y ambiente** | CAR Cundinamarca | Histórico de quejas ambientales por municipio y recurso afectado | `5ddb-j9e9` |
| **Territorio y ambiente** | IDEAM | Catálogo nacional de estaciones, precipitación y temperatura ambiente | `hp9r-jxuu`, `s54a-sgyg`, `sbwg-7ju4` |
| **Territorio y ambiente** | UNGRD | Emergencias atendidas (2019, 2020, 2023–2024 y 2025+) | `4fd8-ptcr`, `4t8v-ywmw`, `rgre-6ak4`, `2343-nuqp` |

---

## Ejecución local y mantenimiento

La aplicación está escrita en **HTML, CSS y módulos ES nativos de JavaScript**, sin empaquetadores (*bundlers*) ni pasos de compilación para servirla en desarrollo.

```bash
# 1. Servir el sitio localmente en http://localhost:8080
python -m http.server 8080
# o con Node.js:
npx serve .
```

### Scripts de mantenimiento (Node.js >= 20)

- **Regenerar las páginas de rutas limpias (`<seccion>/index.html`, `<seccion>/<subseccion>/index.html`), `404.html` y `sitemap.xml`** (obligatorio tras modificar `index.html`, `js/nav.js` o los bloques `type: 'heading'` de cualquier sección):
  ```bash
  node scripts/rutas.mjs
  ```
- **Capturar un corte mensual (*snapshot*) de los conjuntos sin serie histórica (RNT, RUPS, REPS, afiliados)**:
  ```bash
  node scripts/snapshot.mjs
  ```
  *(También se ejecuta automáticamente el día 2 de cada mes mediante `.github/workflows/snapshot.yml`).*
- **Regenerar la imagen Open Graph (`og-image.png`, 1200×630 px)**:
  ```bash
  node scripts/og/render.mjs
  ```

---

## Estructura del repositorio

```text
├── index.html                  # Plantilla principal y página de inicio
├── 404.html                    # Respaldo de rutas para GitHub Pages (generado)
├── sitemap.xml                 # Mapa del sitio con las 58 rutas canónicas (generado)
├── og-image.png                # Imagen de vista previa Open Graph 1200×630
├── css/
│   └── styles.css              # Sistema de diseño (temas oscuro/claro, responsivo e impresión PDF)
├── js/
│   ├── app.js                  # Enrutador por History API, menú lateral, filtros y tema
│   ├── nav.js                  # Definición de las 14 secciones del observatorio
│   ├── config.js               # Identificadores territoriales de Villeta (25875)
│   ├── sources.js              # Catálogo de los >65 conjuntos de datos en datos.gov.co
│   ├── soda.js                 # Cliente HTTP para la API Socrata (SODA) con caché local de 6 h
│   ├── ui.js                   # Motor de tarjetas, tablas, descarga CSV, citación e impresión
│   ├── charts.js               # Constructor de gráficos Chart.js con paleta daltónico-segura
│   ├── format.js               # Formateadores numéricos, porcentuales, monetarios y de fecha (es-CO)
│   ├── freshness.js            # Cálculo y semáforo de vigencia de cada fuente
│   ├── slug.js                 # Generador de slugs para URLs de subsecciones
│   └── sections/               # Módulos de las 14 secciones temáticas + utilidades (helpers.js, sui.js)
├── data/
│   ├── esp-villeta.json        # Cifras auditadas de la ESP Villeta (informes PDF oficiales)
│   ├── sui-comercial-villeta.json # Cubo comercial del SUI (Superservicios) para Villeta
│   ├── rnt-historico-villeta.json # Serie histórica del RNT 2005–2026 (tablero MinCIT)
│   └── snapshots.json          # Cortes mensuales acumulados por scripts/snapshot.mjs
├── scripts/
│   ├── rutas.mjs               # Generador de rutas estáticas, metadatos OG y sitemap.xml
│   ├── snapshot.mjs            # Captura mensual de registros sin histórico
│   └── og/                     # Plantilla y renderizador Playwright de og-image.png
└── docs/
    └── DOCUMENTACION.md        # Documentación técnica, metodológica y catálogo exhaustivo
```
