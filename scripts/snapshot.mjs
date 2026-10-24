// Guarda un resumen mensual de los registros que datos.gov.co publica solo como "fotografía vigente"
// (RNT, RUPS, REPS), para poder seguir su evolución en el tiempo.
// Uso: node scripts/snapshot.mjs   (Node 18+; se ejecuta también cada mes desde GitHub Actions)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { MUNICIPIO as M, SOCRATA } from '../js/config.js';

const FILE = new URL('../data/snapshots.json', import.meta.url);

async function q(id, params) {
  const url = new URL(`${SOCRATA}/resource/${id}.json`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
  return res.json();
}

const n = v => (v == null ? 0 : Number(v));

const [rntTot, rntSub, rups, reps] = await Promise.all([
  q('thwd-ivmp', { $select: 'count(*) as n, sum(habitaciones) as h, sum(camas) as c, sum(num_emp1) as e, max(ano) as ano, max(periodo) as periodo', $where: `cod_mun='${M.dane}' and estado_rnt='ACTIVO'` }),
  q('thwd-ivmp', { $select: 'sub_categoria as s, count(*) as n, sum(camas) as c', $where: `cod_mun='${M.dane}' and estado_rnt='ACTIVO'`, $group: 's' }),
  q('4qkq-csdn', { $select: 'servicio as s, count(*) as n', $where: `upper(municipio_prestacion) like '%${M.nombre.toUpperCase()}%'`, $group: 's' }),
  q('c36g-9fc2', { $select: 'claseprestador as s, count(*) as n', $where: `upper(municipiosededesc) like '%${M.nombre.toUpperCase()}%' and upper(departamentodededesc) like '%${M.departamento.toUpperCase()}%'`, $group: 's' }),
]);

const today = new Date().toISOString().slice(0, 10);
const entry = {
  mes: today.slice(0, 7),
  fecha: today,
  rnt: {
    corte: `${rntTot[0].periodo || ''} ${rntTot[0].ano || ''}`.trim(),
    prestadores: n(rntTot[0].n), habitaciones: n(rntTot[0].h), camas: n(rntTot[0].c), empleados: n(rntTot[0].e),
    porSubcategoria: Object.fromEntries(rntSub.map(r => [r.s, { prestadores: n(r.n), camas: n(r.c) }])),
  },
  rups: Object.fromEntries(rups.map(r => [r.s, n(r.n)])),
  reps: Object.fromEntries(reps.map(r => [r.s, n(r.n)])),
};

let data = { municipio: M.nombre, dane: M.dane, snapshots: [] };
try { data = JSON.parse(await readFile(FILE, 'utf8')); } catch { /* primer corte */ }
data.snapshots = data.snapshots.filter(s => s.mes !== entry.mes).concat(entry).sort((a, b) => a.mes.localeCompare(b.mes));

await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(FILE, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Corte ${entry.mes} guardado: ${entry.rnt.prestadores} prestadores RNT, ${entry.rnt.camas} camas.`);
