import type { APIRoute } from 'astro';
import { createClient } from '../../../lib/supabase';
import {
  ACCION_AUDITORIA, ESTADOS_BENEFICIARIO, ESTADOS_SOLICITUD, PRIORIDADES, TABLA_LABEL,
  diasDesde, edad, fmtDateTime, hoy, porId,
} from '../../../lib/ekr';

export const prerender = false;

type Col = { header: string; key: string; width: number; date?: boolean; wrap?: boolean };
type Hoja = { nombre: string; cols: Col[]; rows: Record<string, any>[] };

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const HOJAS = ['beneficiarios', 'espera', 'asignaciones', 'solicitudes', 'mensajes', 'auditoria', 'todo'] as const;

/** Evita "inyección de fórmulas": Excel ejecuta celdas de texto que empiezan con = + - @ */
const safe = (v: any) => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v ?? '');
const soloFecha = (v: string | null | undefined) => (v ? new Date(`${v.slice(0, 10)}T00:00:00Z`) : null);
const lab = <T extends Record<string, { label: string }>>(m: T, k: string | null | undefined) => (k && (m as any)[k]?.label) || k || '';

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

  const [ben, prof, asig, sol, men, aud] = await Promise.all([
    supabase.from('beneficiarios').select('*').order('nombre'),
    supabase.from('profiles').select('*'),
    supabase.from('asignaciones').select('*').order('fecha_inicio', { ascending: false }),
    supabase.from('insumo_solicitudes').select('*').order('created_at', { ascending: false }),
    supabase.from('mensajes').select('*').order('created_at', { ascending: false }),
    quiere('auditoria')
      ? supabase.from('auditoria').select('*').order('created_at', { ascending: false }).limit(5000)
      : Promise.resolve({ data: [] as any[], error: null }),
  ]);
  const fallo = [ben, prof, asig, sol, men, aud].find((r: any) => r.error);
  if (fallo) return json(500, 'No se pudieron leer los datos: ' + (fallo as any).error.message);

  const beneficiarios = ben.data ?? [];
  const benById = porId<any>(beneficiarios);
  const profById = porId<any>(prof.data ?? []);
  const nom = (m: Map<string, any>, id: string | null) => (id ? m.get(id)?.nombre ?? '' : '');

  const vigentes = (asig.data ?? []).filter((a: any) => a.activa);
  const acompanantes = (benId: string) => vigentes.filter((a: any) => a.beneficiario_id === benId).map((a: any) => nom(profById, a.voluntario_id)).join(', ');

  const hojas: Hoja[] = [];

  if (quiere('beneficiarios')) hojas.push({
    nombre: 'Beneficiarios',
    cols: [
      { header: 'Nombre', key: 'nombre', width: 30 }, { header: 'RUT', key: 'rut', width: 14 },
      { header: 'Edad', key: 'edad', width: 7 }, { header: 'Fecha de nacimiento', key: 'nac', width: 16, date: true },
      { header: 'Teléfono', key: 'tel', width: 16 }, { header: 'Dirección', key: 'dir', width: 30 }, { header: 'Comuna', key: 'comuna', width: 16 },
      { header: 'Estado', key: 'estado', width: 15 }, { header: 'Prioridad', key: 'prio', width: 11 },
      { header: 'Fecha de ingreso', key: 'ingreso', width: 15, date: true }, { header: 'Acompañante(s)', key: 'acomp', width: 28 },
      { header: 'Contacto de emergencia', key: 'cont', width: 26 }, { header: 'Teléfono contacto', key: 'contTel', width: 16 },
      { header: 'Notas', key: 'notas', width: 50, wrap: true },
    ],
    rows: beneficiarios.map((b: any) => ({
      nombre: b.nombre, rut: b.rut, edad: edad(b.fecha_nacimiento) ?? '', nac: soloFecha(b.fecha_nacimiento), tel: b.telefono, dir: b.direccion,
      comuna: b.comuna, estado: lab(ESTADOS_BENEFICIARIO, b.estado), prio: lab(PRIORIDADES, b.prioridad), ingreso: soloFecha(b.fecha_ingreso),
      acomp: acompanantes(b.id), cont: b.contacto_nombre, contTel: b.contacto_telefono, notas: b.notas,
    })),
  });

  if (quiere('espera')) {
    const espera = beneficiarios.filter((b: any) => b.estado === 'lista_espera').sort((a: any, b: any) =>
      (PRIORIDADES[a.prioridad as keyof typeof PRIORIDADES]?.orden ?? 1) - (PRIORIDADES[b.prioridad as keyof typeof PRIORIDADES]?.orden ?? 1)
      || (a.fecha_ingreso ?? '').localeCompare(b.fecha_ingreso ?? ''));
    hojas.push({
      nombre: 'Lista de espera',
      cols: [
        { header: 'Posición', key: 'pos', width: 10 }, { header: 'Nombre', key: 'nombre', width: 30 }, { header: 'Prioridad', key: 'prio', width: 11 },
        { header: 'Comuna', key: 'comuna', width: 16 }, { header: 'Teléfono', key: 'tel', width: 16 },
        { header: 'Fecha de ingreso', key: 'ingreso', width: 15, date: true }, { header: 'Días en espera', key: 'dias', width: 14 },
        { header: 'Notas', key: 'notas', width: 50, wrap: true },
      ],
      rows: espera.map((b: any, i: number) => ({ pos: i + 1, nombre: b.nombre, prio: lab(PRIORIDADES, b.prioridad), comuna: b.comuna, tel: b.telefono, ingreso: soloFecha(b.fecha_ingreso), dias: diasDesde(b.fecha_ingreso), notas: b.notas })),
    });
  }

  if (quiere('asignaciones')) hojas.push({
    nombre: 'Asignaciones',
    cols: [
      { header: 'Persona acompañada', key: 'ben', width: 30 }, { header: 'Voluntario/a', key: 'vol', width: 26 },
      { header: 'Inicio', key: 'ini', width: 13, date: true }, { header: 'Fin', key: 'fin', width: 13, date: true },
      { header: 'Estado', key: 'estado', width: 12 }, { header: 'Notas', key: 'notas', width: 40, wrap: true },
    ],
    rows: (asig.data ?? []).map((a: any) => ({ ben: nom(benById, a.beneficiario_id), vol: nom(profById, a.voluntario_id), ini: soloFecha(a.fecha_inicio), fin: soloFecha(a.fecha_fin), estado: a.activa ? 'Vigente' : 'Finalizada', notas: a.notas })),
  });

  if (quiere('solicitudes')) hojas.push({
    nombre: 'Solicitudes de insumos',
    cols: [
      { header: 'Fecha', key: 'fecha', width: 17 }, { header: 'Insumo', key: 'insumo', width: 30 }, { header: 'Cantidad', key: 'cant', width: 10 },
      { header: 'Urgencia', key: 'urg', width: 10 }, { header: 'Estado', key: 'estado', width: 12 }, { header: 'Persona', key: 'ben', width: 28 },
      { header: 'Solicitado por', key: 'por', width: 24 }, { header: 'Notas', key: 'notas', width: 36, wrap: true },
      { header: 'Respuesta', key: 'resp', width: 36, wrap: true }, { header: 'Resuelto por', key: 'res', width: 24 }, { header: 'Fecha de resolución', key: 'resAt', width: 17 },
    ],
    rows: (sol.data ?? []).map((s: any) => ({
      fecha: fmtDateTime(s.created_at), insumo: s.insumo, cant: s.cantidad, urg: lab(PRIORIDADES, s.urgencia), estado: lab(ESTADOS_SOLICITUD, s.estado),
      ben: nom(benById, s.beneficiario_id) || 'Uso general', por: nom(profById, s.solicitado_por), notas: s.notas, resp: s.respuesta,
      res: nom(profById, s.resuelto_por), resAt: s.resuelto_at ? fmtDateTime(s.resuelto_at) : '',
    })),
  });

  if (quiere('mensajes')) hojas.push({
    nombre: 'Mensajes y urgencias',
    cols: [
      { header: 'Fecha', key: 'fecha', width: 17 }, { header: 'Asunto', key: 'asunto', width: 34 }, { header: 'Urgente', key: 'urg', width: 9 },
      { header: 'Estado', key: 'estado', width: 11 }, { header: 'Persona', key: 'ben', width: 28 }, { header: 'Autor/a', key: 'autor', width: 24 },
      { header: 'Detalle', key: 'cuerpo', width: 60, wrap: true }, { header: 'Atendido por', key: 'aPor', width: 24 }, { header: 'Fecha de atención', key: 'aAt', width: 17 },
    ],
    rows: (men.data ?? []).map((m: any) => ({
      fecha: fmtDateTime(m.created_at), asunto: m.asunto, urg: m.urgente ? 'Sí' : 'No', estado: m.estado === 'atendido' ? 'Atendido' : 'Abierto',
      ben: nom(benById, m.beneficiario_id), autor: nom(profById, m.autor_id), cuerpo: m.cuerpo, aPor: nom(profById, m.atendido_por), aAt: m.atendido_at ? fmtDateTime(m.atendido_at) : '',
    })),
  });

  if (quiere('auditoria')) hojas.push({
    nombre: 'Auditoría',
    cols: [
      { header: 'Fecha', key: 'fecha', width: 17 }, { header: 'Usuario', key: 'user', width: 30 }, { header: 'Acción', key: 'acc', width: 11 },
      { header: 'Sección', key: 'tabla', width: 24 }, { header: 'Registro', key: 'reg', width: 38 }, { header: 'Detalle', key: 'det', width: 80, wrap: true },
    ],
    rows: (aud.data ?? []).map((a: any) => ({
      fecha: fmtDateTime(a.created_at), user: a.user_email ?? 'sistema', acc: ACCION_AUDITORIA[a.accion]?.label ?? a.accion,
      tabla: TABLA_LABEL[a.tabla] ?? a.tabla, reg: a.registro_id ?? '', det: a.detalle ? JSON.stringify(a.detalle) : '',
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
    ws.columns = h.cols.map((c) => ({ header: c.header, key: c.key, width: c.width, style: { alignment: { vertical: 'top', wrapText: !!c.wrap }, ...(c.date ? { numFmt: 'dd-mm-yyyy' } : {}) } }));
    for (const r of h.rows) ws.addRow(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, safe(v)])));
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
    user_id: user.id, user_email: user.email ?? null, accion: 'EXPORT', tabla: hoja === 'todo' ? 'todo' : hoja, detalle: { hoja },
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
