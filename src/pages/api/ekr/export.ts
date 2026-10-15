import type { APIRoute } from 'astro';
import { createClient } from '../../../lib/supabase';
import {
  ACCION_AUDITORIA, ESTADOS_BENEFICIARIO, ESTADOS_SOLICITUD, PRIORIDADES, TABLA_LABEL,
  diasDesde, edad, fmtDateTime, hoy, porId,
} from '../../../lib/ekr';

export const prerender = false;

type Col = { header: string; key: string; width: number; date?: boolean; datetime?: boolean; wrap?: boolean };
type Hoja = { nombre: string; cols: Col[]; rows: Record<string, any>[] };

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const HOJAS = ['beneficiarios', 'espera', 'asignaciones', 'solicitudes', 'mensajes', 'auditoria', 'todo'] as const;

/** Evita "inyección de fórmulas": Excel ejecuta celdas de texto que empiezan con = + - @ */
const safe = (v: any) => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v ?? '');
const soloFecha = (v: string | null | undefined) => (v ? new Date(`${v.slice(0, 10)}T00:00:00Z`) : null);
const lab = <T extends Record<string, { label: string }>>(m: T, k: string | null | undefined) => (k && (m as any)[k]?.label) || k || '';
const TIPOS_INSUMO_LABEL: Record<string, string> = {
  panal_abierto: 'Pañal abierto',
  panal_calzon: 'Pañal calzón',
  sabanilla: 'Sabanilla',
  toalla_humeda: 'Toalla húmeda',
  crema: 'Crema',
  ensure: 'Ensure',
  otro: 'Otro',
};

export const GET: APIRoute = async (context) => {
  const json = (status: number, error: string) =>
    new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });

  const hoja = context.url.searchParams.get('hoja') ?? '';
  if (!(HOJAS as readonly string[]).includes(hoja)) return json(400, 'Hoja no válida.');

  const supabase = createClient(context);
  const user = context.locals.user ?? (await supabase.auth.getUser()).data.user;
  if (!user) return json(401, 'Inicia sesión.');

  const { data: perfil } = await supabase.from('profiles').select('*').eq('linked_user', user.id).maybeSingle();
  if (!perfil || perfil.activo === false || !['admin', 'coordinador'].includes(perfil.rol)) return json(403, 'Sin permiso.');
  const isAdmin = perfil.rol === 'admin';
  if (hoja === 'auditoria' && !isAdmin) return json(403, 'Solo administración puede exportar la auditoría.');

  const quiere = (h: string) => hoja === 'todo' ? (h !== 'auditoria' || isAdmin) : hoja === h;

  const [ben, prof, asig, sol, men, items, aud] = await Promise.all([
    supabase.from('beneficiarios').select('*').order('nombre'),
    supabase.from('profiles').select('id,nombre,email,linked_user'),
    supabase.from('asignaciones').select('*').order('fecha_inicio', { ascending: false }),
    supabase.from('insumo_solicitudes').select('*').order('created_at', { ascending: false }),
    supabase.from('mensajes').select('*').order('created_at', { ascending: false }),
    supabase.from('insumo_items').select('*'),
    quiere('auditoria')
      ? supabase.from('auditoria').select('*').order('created_at', { ascending: false }).limit(5000)
      : Promise.resolve({ data: [] as any[], error: null }),
  ]);
  const fallo = [ben, prof, asig, sol, men, items, aud].find((r: any) => r.error);
  if (fallo) return json(500, 'No se pudieron leer los datos: ' + (fallo as any).error.message);

  const beneficiarios = ben.data ?? [];
  const benById = porId<any>(beneficiarios);
  const profById = porId<any>(prof.data ?? []);
  const profByLinkedUser = new Map<string, any>(
    (prof.data ?? []).filter((p: any) => p.linked_user).map((p: any) => [p.linked_user, p]),
  );
  const nom = (m: Map<string, any>, id: string | null | undefined) => (id ? m.get(id)?.nombre ?? '' : '');

  const itemsPorSolicitud = new Map<number, any[]>();
  for (const it of items.data ?? []) {
    const arr = itemsPorSolicitud.get(it.solicitud_id) ?? [];
    arr.push(it);
    itemsPorSolicitud.set(it.solicitud_id, arr);
  }

  const vigentes = (asig.data ?? []).filter((a: any) => a.activa);
  const acompanantes = (benId: number) =>
    vigentes.filter((a: any) => a.beneficiario_id === benId).map((a: any) => nom(profById, a.voluntaria_id)).filter(Boolean).join(', ');

  const hojas: Hoja[] = [];

  if (quiere('beneficiarios')) hojas.push({
    nombre: 'Beneficiarios',
    cols: [
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'RUT', key: 'rut', width: 14 },
      { header: 'Edad', key: 'edad', width: 7 },
      { header: 'Fecha de nacimiento', key: 'nac', width: 16, date: true },
      { header: 'Teléfono', key: 'tel', width: 16 },
      { header: 'Dirección', key: 'dir', width: 30 },
      { header: 'Comuna', key: 'comuna', width: 16 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Programa', key: 'programa', width: 24 },
      { header: 'Fecha de derivación', key: 'derivacion', width: 16, date: true },
      { header: 'Acompañante(s)', key: 'acomp', width: 28 },
      { header: 'Usa pañal', key: 'panal', width: 10 },
      { header: 'Talla', key: 'talla', width: 8 },
      { header: 'Apoyo nutrición', key: 'nutricion', width: 16 },
      { header: 'Prioridad', key: 'prio', width: 11 },
    ],
    rows: beneficiarios.map((b: any) => ({
      nombre: b.nombre, rut: b.rut, edad: edad(b.fecha_nacimiento) ?? '',
      nac: soloFecha(b.fecha_nacimiento), tel: b.telefono, dir: b.direccion, comuna: b.comuna,
      estado: lab(ESTADOS_BENEFICIARIO, b.estado), programa: b.programa_hospitalario,
      derivacion: soloFecha(b.fecha_derivacion), acomp: acompanantes(b.id),
      panal: b.usa_pañal ? 'Sí' : 'No', talla: b.talla_pañal, nutricion: b.apoyo_nutricion,
      prio: lab(PRIORIDADES, b.prioridad),
    })),
  });

  if (quiere('espera')) {
    const espera = beneficiarios
      .filter((b: any) => b.estado === 'lista_espera')
      .sort((a: any, b: any) => (a.fecha_derivacion ?? '').localeCompare(b.fecha_derivacion ?? ''));
    hojas.push({
      nombre: 'Lista de espera',
      cols: [
        { header: 'Posición', key: 'pos', width: 10 },
        { header: 'Nombre', key: 'nombre', width: 30 },
        { header: 'Comuna', key: 'comuna', width: 16 },
        { header: 'Teléfono', key: 'tel', width: 16 },
        { header: 'Fecha de derivación', key: 'derivacion', width: 16, date: true },
        { header: 'Días en espera', key: 'dias', width: 14 },
        { header: 'Observaciones', key: 'obs', width: 50, wrap: true },
      ],
      rows: espera.map((b: any, i: number) => ({
        pos: i + 1, nombre: b.nombre, comuna: b.comuna, tel: b.telefono,
        derivacion: soloFecha(b.fecha_derivacion), dias: diasDesde(b.fecha_derivacion),
        obs: b.observaciones_voluntaria ?? b.observaciones_derivador,
      })),
    });
  }

  if (quiere('asignaciones')) hojas.push({
    nombre: 'Asignaciones',
    cols: [
      { header: 'Persona acompañada', key: 'ben', width: 30 },
      { header: 'Voluntario/a', key: 'vol', width: 26 },
      { header: 'Inicio', key: 'ini', width: 13, date: true },
      { header: 'Fin', key: 'fin', width: 13, date: true },
      { header: 'Estado', key: 'estado', width: 12 },
      { header: 'Notas', key: 'notas', width: 40, wrap: true },
    ],
    rows: (asig.data ?? []).map((a: any) => ({
      ben: nom(benById, a.beneficiario_id),
      vol: nom(profById, a.voluntaria_id),
      ini: soloFecha(a.fecha_inicio),
      fin: soloFecha(a.fecha_fin),
      estado: a.activa ? 'Vigente' : 'Finalizada',
      notas: a.notas,
    })),
  });

  if (quiere('solicitudes')) hojas.push({
    nombre: 'Solicitudes de insumos',
    cols: [
      { header: 'Fecha', key: 'fecha', width: 17, datetime: true },
      { header: 'Insumos', key: 'insumo', width: 40 },
      { header: 'Cantidad total', key: 'cant', width: 14 },
      { header: 'Urgencia', key: 'urg', width: 10 },
      { header: 'Estado', key: 'estado', width: 12 },
      { header: 'Persona', key: 'ben', width: 28 },
      { header: 'Solicitado por', key: 'por', width: 24 },
      { header: 'Notas', key: 'notas', width: 36, wrap: true },
      { header: 'Respuesta', key: 'resp', width: 36, wrap: true },
      { header: 'Resuelto por', key: 'res', width: 24 },
      { header: 'Fecha resolución', key: 'resAt', width: 17, datetime: true },
    ],
    rows: (sol.data ?? []).map((s: any) => {
      const its = itemsPorSolicitud.get(s.id) ?? [];
      const insumo = its.map((i: any) => `${TIPOS_INSUMO_LABEL[i.tipo] ?? i.tipo}${i.talla ? ` ${i.talla}` : ''} × ${i.cantidad}`).join(', '); 
      const cant = its.reduce((acc: number, i: any) => acc + (i.cantidad ?? 0), 0);
      return {
        fecha: fmtDateTime(s.created_at),
        insumo: insumo || 'Sin ítems',
        cant: cant || '',
        urg: lab(PRIORIDADES, s.urgencia),
        estado: lab(ESTADOS_SOLICITUD, s.estado),
        ben: nom(benById, s.beneficiario_id) || 'Uso general',
        por: nom(profById, s.voluntaria_id),
        notas: s.notas,
        resp: s.respuesta,
        res: nom(profById, s.resuelto_por),
        resAt: s.resuelto_at ? fmtDateTime(s.resuelto_at) : '',
      };
    }),
  });

  if (quiere('mensajes')) hojas.push({
    nombre: 'Mensajes y urgencias',
    cols: [
      { header: 'Fecha', key: 'fecha', width: 17, datetime: true },
      { header: 'Tipo', key: 'tipo', width: 12 },
      { header: 'Leído', key: 'leido', width: 8 },
      { header: 'Persona', key: 'ben', width: 28 },
      { header: 'Autor/a', key: 'autor', width: 24 },
      { header: 'Texto', key: 'texto', width: 60, wrap: true },
    ],
    rows: (men.data ?? []).map((m: any) => ({
      fecha: fmtDateTime(m.created_at),
      tipo: m.tipo === 'urgencia' ? 'Urgencia' : 'Mensaje',
      leido: m.leido ? 'Sí' : 'No',
      ben: nom(benById, m.beneficiario_id),
      autor: nom(profById, m.autor_id),
      texto: m.texto,
    })),
  });

  if (quiere('auditoria')) hojas.push({
    nombre: 'Auditoría',
    cols: [
      { header: 'Fecha', key: 'fecha', width: 17, datetime: true },
      { header: 'Usuario', key: 'user', width: 30 },
      { header: 'Acción', key: 'acc', width: 11 },
      { header: 'Sección', key: 'seccion', width: 24 },
      { header: 'Registro', key: 'reg', width: 38 },
      { header: 'Detalle', key: 'det', width: 80, wrap: true },
    ],
    rows: (aud.data ?? []).map((a: any) => ({
      fecha: fmtDateTime(a.created_at),
      user: (a.usuario_id ? profByLinkedUser.get(a.usuario_id)?.nombre : null) || 'sistema',
      acc: ACCION_AUDITORIA[a.accion]?.label ?? a.accion,
      seccion: TABLA_LABEL[a.entidad] ?? a.entidad ?? '',
      reg: a.entidad_id ?? '',
      det: a.diff ? JSON.stringify(a.diff).slice(0, 200) : '',
    })),
  });

  let ExcelJS: any;
  try {
    ExcelJS = (await import('exceljs')).default;
  } catch {
    return json(500, 'Falta la librería de Excel. Ejecuta: npm install exceljs');
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Vecinos que Acompañan';
  wb.created = new Date();
  for (const h of hojas) {
    const ws = wb.addWorksheet(h.nombre, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = h.cols.map((c) => ({
  header: c.header, key: c.key, width: c.width,
  style: { alignment: { vertical: 'top', wrapText: !!c.wrap } },
}));
for (const r of h.rows) {
  const row = ws.addRow(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, safe(v)])));
  row.eachCell((cell: any, colNumber: number) => {
    const col = h.cols[colNumber - 1];
    if (col?.date) cell.numFmt = 'dd-mm-yyyy';
    if (col?.datetime) cell.numFmt = 'dd-mm-yyyy hh:mm';
  });
}
    const head = ws.getRow(1);
    head.height = 22;
    head.eachCell((cell: any) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5E686F' } };
      cell.alignment = { vertical: 'middle', wrapText: true };
    });
    if (h.rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: h.cols.length } };
  }

  // Quedan registradas las exportaciones (datos personales)
  await supabase.from('auditoria').insert({
    usuario_id: user.id,
    entidad: 'export',
    entidad_id: hoja,
    accion: 'EXPORT',
    diff: { hoja, formato: 'xlsx' },
  });

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf, {
    headers: {
      'Content-Type': XLSX_MIME,
      'Content-Disposition': `attachment; filename="vecinos-ekr_${hoja}_${hoy()}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
};