// Menú del sitio: orden, nombre corto, descripción e ícono (trazos SVG 24×24) de cada sección.
export const NAV = [
  { id: 'inicio', label: 'Resumen', desc: 'Indicadores clave con variación anual', icon: '<path d="M3 11 12 3l9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>' },
  { id: 'turismo', label: 'Turismo y hotelería', desc: 'RNT: prestadores, camas y empleo · llegada de pasajeros', icon: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>' },
  { id: 'economia', label: 'Economía y empresas', desc: 'Cámara de Comercio de Facatativá · Superfinanciera · Supersociedades', icon: '<path d="M3 20h18M6 20v-6M11 20V9M16 20v-9M21 4l-6 5-4-3-6 5"/>' },
  { id: 'servicios', label: 'Servicios públicos', desc: 'Superservicios · calidad del agua (IRCA) · internet', icon: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>' },
  { id: 'esp', label: 'ESP Villeta', desc: 'Agua no contabilizada (IANC), suscriptores, estados financieros y evaluación de Superservicios', icon: '<path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z"/><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5"/>' },
  { id: 'seguridad', label: 'Seguridad y convivencia', desc: '15 delitos: año corrido y series históricas', icon: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>' },
  { id: 'educacion', label: 'Educación y cultura', desc: 'Cobertura, deserción, Saber 11 vs Cundinamarca', icon: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6"/>' },
  { id: 'salud', label: 'Salud', desc: 'Prestadores (REPS) y afiliación por régimen', icon: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>' },
  { id: 'agro', label: 'Agro y ruralidad', desc: 'Caña panelera, cultivos, bovinos, FINAGRO, catastro', icon: '<path d="M5 19C5 10 11 5 20 4c0 9-5 15-14 15z"/><path d="M5 19l8-8"/>' },
  { id: 'contratacion', label: 'Contratación y finanzas', desc: 'SECOP, regalías y desempeño municipal (DNP)', icon: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9zM9 11h6M9 15h4"/>' },
  { id: 'victimas', label: 'Víctimas del conflicto', desc: 'Registro Único de Víctimas y desplazamiento', icon: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.6c2.9.4 5 2.5 5 5.4"/>' },
  { id: 'territorio', label: 'Territorio y riesgo', desc: 'Emergencias UNGRD y capas de amenaza y riesgo', icon: '<path d="M3 20 9 9l4 7 3-4 5 8z"/><circle cx="16" cy="6" r="2"/>' },
  { id: 'fuentes', label: 'Fuentes y metodología', desc: 'Catálogo de datos, fechas de actualización y método', icon: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>' },
];
