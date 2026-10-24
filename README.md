# Datavilleta — Villeta, Cundinamarca en datos públicos

Sitio web estático que consulta **en vivo** las APIs oficiales del Estado colombiano (principalmente la API SODA/Socrata de [datos.gov.co](https://www.datos.gov.co)) y presenta, por secciones y con gráficos de comparación año a año, toda la información pública disponible sobre Villeta (código DANE 25875).

Cada gráfico muestra al pie **la entidad responsable, el conjunto de datos (con enlace), la fecha de su última actualización en el portal y la consulta API exacta** usada para calcular la cifra. Todas las tarjetas permiten ver la tabla de datos y descargarla en CSV.

En el encabezado de cada gráfico (y en cada indicador del Resumen) aparece **el periodo del dato más reciente** —año, trimestre, mes o día, según la fuente— y su estado:

| Estado | Criterio |
|---|---|
| ✓ Actualizado | Dato anual del año actual o anterior; dato mensual/diario de hace 3 meses o menos (6 si es trimestral) |
| ◔ Con rezago | Dato anual de hace 2 años; mensual/diario de hasta 12 meses (15 si es trimestral) |
| ! Desactualizado | Más antiguo |
| ■ Serie cerrada | La fuente dejó de publicarla y continúa en otra serie |

Cuando la fuente no trae fecha propia, se muestra la fecha de publicación en el portal. Cada bloque declara su fecha en `asOf` (ver `js/freshness.js`).

## Secciones y fuentes

| Sección | Fuentes (entidad – conjunto en datos.gov.co) |
|---|---|
| Resumen | Indicadores clave de todas las secciones con variación frente al periodo anterior |
| Turismo y hotelería | MinCIT – Registro Nacional de Turismo (`thwd-ivmp`); Supertransporte – pasajeros despachados desde terminales (`eh75-8ah6`) |
| Economía y empresas | Confecámaras/RUES – Cámara de Comercio de Facatativá (`c82u-588k`, `nb3d-v3n7`); Superfinanciera – captaciones y colocaciones (`u2wk-tfe3`), puntos de atención (`vkbt-desu`); Supersociedades – 10.000 empresas (`6cat-2gcs`); Supersolidaria (`kg2d-yfyg`) |
| Servicios públicos | Superservicios – RUPS (`4qkq-csdn`), residuos (`d7pt-p5fi`), PQR energía (`myu9-6wb7`); INS – IRCA calidad del agua (`nxt2-39c3`); MinTIC – internet fijo (`n48w-gutb`, `hwrp-3su3`) |
| ESP Villeta | Índice de agua no contabilizada (IANC), cobertura, recaudo, continuidad, Indicador Único Sectorial, estados financieros 2018–2025, indicadores financieros, resultado por servicio, ejecución presupuestal y hallazgos. Fuentes: PDF oficiales de la empresa (espvilleta.gov.co) y evaluación integral de la Superservicios (agosto 2026), transcritos en `data/esp-villeta.json`; contratos en vivo desde SECOP |
| Seguridad y convivencia | MinDefensa/Policía – 15 conjuntos de delitos (hurtos, homicidio, lesiones, VIF, delitos sexuales, extorsión, informáticos, ambientales, tránsito, secuestro, abigeato) |
| Educación y cultura | MEN – estadísticas por municipio (`nudc-7mev`); ICFES – Saber 11 (`kgxf-xxbe`); MinCulturas – beneficiarios (`bq7b-e3sb`) |
| Salud | MinSalud – REPS (`c36g-9fc2`), afiliados por régimen (`hn4i-593p`) |
| Agro y ruralidad | MinAgricultura/UPRA – EVA (`2pnw-mmge`, `uejq-wxrr`); FNG – inventario bovino (`cea5-4ctf`); FINAGRO (`jjvv-55ck`); Agencia Catastral de Cundinamarca (`h9h6-gkdg`) |
| Contratación y finanzas | Colombia Compra Eficiente – SECOP Integrado (`rpmr-utcd`); MinHacienda – regalías (`g4qj-2p2e`); DNP – Medición del Desempeño Municipal (`nkjx-rsq7`) |
| Víctimas del conflicto | UARIV – víctimas por hecho (`9qih-4vkc`) y desplazamiento anual (`krnc-8azs`) |
| Territorio y riesgo | UNGRD – emergencias (4 conjuntos); capas de amenaza/riesgo y cartografía de Villeta (búsqueda en vivo en el catálogo) |
| Fuentes y metodología | Catálogo completo con fecha de actualización en vivo, conjuntos nuevos que mencionan a Villeta y fuentes sin API |

La lista completa y editable está en [`js/sources.js`](js/sources.js).

## Cómo ejecutarlo

Es HTML + JavaScript sin compilación. Necesita un servidor local (los módulos ES no funcionan con `file://`):

```bash
python -m http.server 8080
```

Luego abra <http://localhost:8080>. También se puede publicar tal cual en GitHub Pages, Netlify o cualquier hosting estático: las consultas se hacen desde el navegador (datos.gov.co permite CORS).

## Publicar en GitHub Pages

El sitio no necesita compilación y todas sus rutas son relativas, así que se publica desde la raíz de la rama `main` (el archivo `.nojekyll` evita el procesamiento de Jekyll).

1. Cree un repositorio vacío en GitHub (por ejemplo `datavilleta`) y conecte este repositorio local:

   ```bash
   git remote add origin https://github.com/<usuario>/datavilleta.git
   git push -u origin main
   ```

2. En GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. El sitio quedará en `https://<usuario>.github.io/datavilleta/`.
4. Para que el corte mensual automático pueda hacer commit: **Settings → Actions → General → Workflow permissions → Read and write permissions**. Puede ejecutarlo a mano desde la pestaña **Actions → Corte mensual de registros → Run workflow**.

## Seguimiento en el tiempo

- **Series históricas en vivo:** la mayoría de conjuntos tienen fecha, así que los gráficos muestran la serie completa y la variación frente al año anterior (en el detalle de cada barra). El año en curso aparece atenuado y con `*`.
- **Año corrido:** delitos, pasajeros y contratación comparan el mismo periodo del año actual y del anterior.
- **Registros sin histórico (RNT, RUPS, REPS):** se publican solo como fotografía vigente. `scripts/snapshot.mjs` guarda un resumen mensual en `data/snapshots.json`, y el flujo `.github/workflows/snapshot.yml` lo ejecuta cada mes y hace commit. La sección de Turismo dibuja esa evolución desde el segundo corte.

```bash
node scripts/snapshot.mjs
```

## Estructura

```
index.html            Página única (menú lateral + secciones por #/ruta)
css/styles.css        Estilos y paleta (modo claro/oscuro)
js/config.js          Municipio (nombre, códigos DANE, cámara de comercio)
js/sources.js         Catálogo de fuentes oficiales
js/soda.js            Cliente de la API SODA con caché (6 h) y límite de concurrencia
js/charts.js          Gráficos (Chart.js) con el estilo del sitio
js/ui.js              Tarjetas: gráfico/tabla, cita de fuente, CSV, enlaces API
js/sections/*.js      Una sección por tema; cada bloque declara su consulta SoQL
scripts/snapshot.mjs  Copia mensual de registros sin histórico
```

### Agregar un indicador

1. Si la fuente es nueva, regístrela en `js/sources.js` (`id` del conjunto en datos.gov.co, entidad y nombre).
2. Agregue un bloque en la sección correspondiente de `js/sections/`:

```js
{
  type: 'chart',
  title: 'Mi indicador',
  subtitle: 'Qué mide',
  async load({ q, M }) {
    const rows = await q('mi_fuente', { $select: 'anio, sum(valor) as n', $where: `cod_mpio='${M.dane}'`, $group: 'anio', $order: 'anio' });
    return { chart: { kind: 'bar', labels: rows.map(r => r.anio), series: [{ name: 'Valor', data: rows.map(r => Number(r.n)) }], yoy: true } };
  },
}
```

La cita de la fuente, la fecha de actualización, la tabla, el CSV y el enlace a la consulta API se generan solos.

## Datos de la ESP Villeta (sin API)

El IANC y los estados financieros de la Empresa de Servicios Públicos no están en datos.gov.co, y el SUI de la Superservicios no admite consultas automáticas. Por eso se transcribieron de los documentos oficiales a `data/esp-villeta.json`, con el enlace a cada PDF. La transcripción se verificó aritméticamente (cada estado de resultados y balance cuadra) y las cifras 2024–2025 coinciden con las de la Superservicios. Para actualizar, agregue el nuevo año con su documento en `documentos`.

## Notas de calidad de datos

- El RUES abierto no trae municipio: las cifras empresariales corresponden a toda la jurisdicción de la **Cámara de Comercio de Facatativá**.
- La EVA agropecuaria cambió de metodología en 2019 (panela → caña); se muestran series separadas.
- Algunos conjuntos tienen cortes antiguos (RUPS 2021, Saber 11 hasta 2022, MDM hasta 2020); cada tarjeta lo advierte.
- Se omiten correos, teléfonos y nombres de personas naturales aunque estén en las fuentes.
