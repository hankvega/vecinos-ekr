import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createClient } from './supabase';

/* ───────────── Tipos ───────────── */

export type Rol = 'admin' | 'coordinador' | 'voluntario';

export interface Profile {
  id: string;
  linked_user: string | null;
  nombre: string;
  email: string | null;
  telefono: string | null;
  rol: Rol;
  activo: boolean;
}

export interface EkrCtx {
  supabase: SupabaseClient;
  user: User;
  profile: Profile;
  isAdmin: boolean;
  badges: { solicitudes: number; urgencias: number };
}

export const ROL_LABEL: Record<Rol, string> = {
  admin: 'Administración',
  coordinador: 'Coordinación',
  voluntario: 'Voluntariado',
};

/* ───────────── Catálogos (las clases van completas para que Tailwind las detecte) ───────────── */

export type Tone = 'slate' | 'rose' | 'taupe' | 'salmon' | 'green';

export const TONE_CLASS: Record<Tone, string> = {
  slate: 'bg-blue-slate/10 text-blue-slate',
  rose: 'bg-dusty-rose/15 text-rose-deep',
  taupe: 'bg-rosy-taupe/25 text-rose-deep',
  salmon: 'bg-salmon/15 text-salmon-deep',
  green: 'bg-emerald-600/10 text-emerald-800',
};

export const TONE_DOT: Record<Tone, string> = {
  slate: 'bg-blue-slate',
  rose: 'bg-dusty-rose',
  taupe: 'bg-rosy-taupe',
  salmon: 'bg-salmon',
  green: 'bg-emerald-600',
};

export const TONE_ICON: Record<Tone, string> = {
  slate: 'bg-blue-slate/10 text-blue-slate',
  rose: 'bg-dusty-rose/15 text-rose-deep',
  taupe: 'bg-rosy-taupe/25 text-rose-deep',
  salmon: 'bg-salmon/15 text-salmon-deep',
  green: 'bg-emerald-600/10 text-emerald-700',
};


export const ESTADOS_BENEFICIARIO = {
  activo: { label: 'Activo', tone: 'green' as Tone, color: '#059669' },
  lista_espera: { label: 'Lista de espera', tone: 'taupe' as Tone, color: '#C19D94' },
  egresado: { label: 'Egresado', tone: 'slate' as Tone, color: '#5E686F' },
  fallecido: { label: 'Fallecido', tone: 'rose' as Tone, color: '#AC7E81' },
} as const;
export type EstadoBeneficiario = keyof typeof ESTADOS_BENEFICIARIO;
export const ESTADOS_BENEFICIARIO_KEYS = Object.keys(ESTADOS_BENEFICIARIO) as EstadoBeneficiario[];

export const PRIORIDADES = {
  alta: { label: 'Alta', tone: 'salmon' as Tone, orden: 0 },
  media: { label: 'Media', tone: 'taupe' as Tone, orden: 1 },
  baja: { label: 'Baja', tone: 'slate' as Tone, orden: 2 },
} as const;
export type Prioridad = keyof typeof PRIORIDADES;

export const ESTADOS_SOLICITUD = {
  solicitado: { label: 'Solicitado', tone: 'salmon' as Tone },
  aprobado:   { label: 'Aprobado',   tone: 'taupe' as Tone },
  entregado:  { label: 'Entregado',  tone: 'green' as Tone },
  rechazado:  { label: 'Rechazado',  tone: 'slate' as Tone },
} as const;
export type EstadoSolicitud = keyof typeof ESTADOS_SOLICITUD;

export const ACCION_AUDITORIA: Record<string, { label: string; tone: Tone }> = {
  INSERT: { label: 'Creó', tone: 'green' },
  UPDATE: { label: 'Modificó', tone: 'taupe' },
  DELETE: { label: 'Eliminó', tone: 'salmon' },
  EXPORT: { label: 'Exportó', tone: 'slate' },
};

export const TABLA_LABEL: Record<string, string> = {
  beneficiarios: 'Beneficiarios',
  asignaciones: 'Asignaciones',
  insumo_solicitudes: 'Solicitudes de insumos',
  mensajes: 'Mensajes',
  profiles: 'Voluntarios/equipo',
  visitas: 'Visitas',
  cuidadores: 'Cuidadores',
  acciones: 'Bitácora',
  adjuntos: 'Adjuntos',
  export: 'Exportaciones',        // ← agrega esta
  todo: 'Exportación completa',   // ← y esta
};

/* ───────────── Contexto y autorización ───────────── */

interface AstroLike {
  request: Request;
  cookies: any;
  locals: App.Locals;
  redirect: (path: string) => Response;
}

const STAFF: Rol[] = ['admin', 'coordinador'];

/**
 * Devuelve el contexto del panel o una redirección (login / sin acceso).
 * Uso:  const ctx = await getEkrContext(Astro); if (ctx instanceof Response) return ctx;
 */
export async function getEkrContext(
  Astro: AstroLike,
  opts: { adminOnly?: boolean } = {},
): Promise<EkrCtx | Response> {
  const supabase = createClient(Astro);
  const user = Astro.locals.user ?? (await supabase.auth.getUser()).data.user;
  if (!user) return Astro.redirect('/login');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('linked_user', user.id)
    .maybeSingle();
  if (error) console.error('[ekr] No se pudo leer el perfil:', error.message);

  if (!profile || profile.activo === false || !STAFF.includes(profile.rol)) {
    return Astro.redirect('/ekr/sin-acceso');
  }
  const isAdmin = profile.rol === 'admin';
  if (opts.adminOnly && !isAdmin) return Astro.redirect('/ekr?error=' + encodeURIComponent('Solo administración puede ver esa sección'));

  const [sol, urg] = await Promise.all([
  supabase.from('insumo_solicitudes').select('id', { count: 'exact', head: true }).eq('estado', 'solicitado'),
  supabase.from('mensajes').select('id', { count: 'exact', head: true }).eq('tipo', 'urgencia').eq('leido', false),
]);

  return {
    supabase,
    user,
    profile: profile as Profile,
    isAdmin,
    badges: { solicitudes: sol.count ?? 0, urgencias: urg.count ?? 0 },
  };
}

/** Redirección con mensaje (se muestra con <Flash />). */
export function back(path: string, kind: 'ok' | 'error', msg: string): Response {
  const sep = path.includes('?') ? '&' : '?';
  return new Response(null, {
    status: 303,
    headers: { Location: `${path}${sep}${kind}=${encodeURIComponent(msg)}` },
  });
}

/* ───────────── Formularios ───────────── */

export function str(form: FormData, key: string): string | null {
  const v = form.get(key);
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
}

export function oneOf<T extends string>(v: string | null, allowed: readonly T[]): T | null {
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

/* ───────────── RUT chileno ───────────── */

export function limpiarRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

export function validarRut(rut: string): boolean {
  const r = limpiarRut(rut);
  if (r.length < 2) return false;
  const cuerpo = r.slice(0, -1);
  const dv = r.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;
  let suma = 0;
  let mult = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const res = 11 - (suma % 11);
  const esperado = res === 11 ? '0' : res === 10 ? 'K' : String(res);
  return esperado === dv;
}

export function formatRut(rut: string | null | undefined): string {
  if (!rut) return '';
  const r = limpiarRut(rut);
  if (r.length < 2) return rut;
  const cuerpo = r.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpo}-${r.slice(-1)}`;
}

/* ───────────── Fechas ───────────── */

const TZ = 'America/Santiago';
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function fmtDate(v: string | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: DATE_ONLY.test(v) ? 'UTC' : TZ,
  }).format(d);
}

export function fmtDateTime(v: string | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ,
  }).format(d);
}

export function hoy(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); // yyyy-mm-dd
}

export function diasDesde(v: string | null | undefined): number {
  if (!v) return 0;
  const t = new Date(v).getTime();
  if (isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

export function edad(fecha: string | null | undefined): number | null {
  if (!fecha) return null;
  const n = new Date(fecha);
  if (isNaN(n.getTime())) return null;
  const h = new Date();
  let e = h.getUTCFullYear() - n.getUTCFullYear();
  const m = h.getUTCMonth() - n.getUTCMonth();
  if (m < 0 || (m === 0 && h.getUTCDate() < n.getUTCDate())) e--;
  return e;
}

export function hace(v: string | null | undefined): string {
  if (!v) return '—';
  const t = new Date(v).getTime();
  if (isNaN(t)) return '—';
  const min = Math.floor((Date.now() - t) / 60_000);
  if (min < 1) return 'justo ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
  return fmtDate(v);
}

export function saludo(): string {
  const h = Number(new Intl.DateTimeFormat('es-CL', { hour: 'numeric', hour12: false, timeZone: TZ }).format(new Date()));
  return h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
}

export function iniciales(nombre: string | null | undefined): string {
  if (!nombre) return '?';
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
}

/** Agrupa y cuenta: contar(lista, x => x.comuna) → [['Pudahuel', 4], ...] ordenado desc */
export function contar<T>(lista: T[], clave: (x: T) => string | null | undefined): [string, number][] {
  const m = new Map<string, number>();
  for (const x of lista) {
    const k = clave(x) || 'Sin dato';
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export function porId<T extends { id: string }>(lista: T[]): Map<string, T> {
  return new Map(lista.map((x) => [x.id, x]));
}

/* ───────────── Utilidades de vista ───────────── */

/** Primer error de un conjunto de consultas Supabase (para mostrar un aviso útil). */
export function firstError(...results: Array<{ error?: { message: string } | null }>): string | null {
  for (const r of results) if (r?.error) return r.error.message;
  return null;
}

/** Valor de gradiente cónico para un gráfico de dona simple. */
export function donutGradient(segments: { value: number; color: string }[]): string {
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total === 0) return 'conic-gradient(#ECE5E2 0 100%)';
  let acc = 0;
  const parts = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const from = (acc / total) * 100;
      acc += s.value;
      const to = (acc / total) * 100;
      return `${s.color} ${from.toFixed(2)}% ${to.toFixed(2)}%`;
    });
  return `conic-gradient(${parts.join(', ')})`;
}

export function pct(n: number, total: number): string {
  return total === 0 ? '0%' : `${Math.round((n / total) * 100)}%`;
}

export function promedio(nums: number[]): number {
  return nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function truncar(s: string | null | undefined, n = 90): string {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

/* ───────────── Validación de beneficiarios ───────────── */

export function leerBeneficiario(form: FormData): { data?: Record<string, any>; error?: string } {
  const nombre = str(form, 'nombre');
  if (!nombre) return { error: 'El nombre es obligatorio.' };
  if (nombre.length > 160) return { error: 'El nombre es demasiado largo.' };

  const estado = oneOf(str(form, 'estado'), ESTADOS_BENEFICIARIO_KEYS);
  if (!estado) return { error: 'Elige un estado válido.' };

  const rutRaw = str(form, 'rut');
  if (rutRaw && !validarRut(rutRaw)) return { error: 'El RUT no es válido. Revisa el dígito verificador.' };

  const fechaOk = (v: string | null) => v === null || (DATE_ONLY.test(v) && !isNaN(new Date(v).getTime()));
  const nacimiento = str(form, 'fecha_nacimiento');
  const derivacion = str(form, 'fecha_derivacion');
  if (!fechaOk(nacimiento) || !fechaOk(derivacion)) return { error: 'Una de las fechas no es válida.' };
  if (nacimiento && nacimiento > hoy()) return { error: 'La fecha de nacimiento no puede ser futura.' };

  return {
    data: {
      nombre,
      rut: rutRaw ? formatRut(rutRaw) : null,
      fecha_nacimiento: nacimiento,
      genero: oneOf(str(form, 'genero'), ['Mujer', 'Hombre', 'Otro'] as const),
      telefono: str(form, 'telefono'),
      direccion: str(form, 'direccion'),
      comuna: str(form, 'comuna'),
      estado,
      fecha_derivacion: derivacion,
      programa_hospitalario: str(form, 'programa_hospitalario'),
      derivado_por: str(form, 'derivado_por'),
      usa_pañal: form.get('usa_pañal') === 'on',
      talla_pañal: str(form, 'talla_pañal'),
      tipo_pañal: str(form, 'tipo_pañal'),
      apoyo_nutricion: str(form, 'apoyo_nutricion'),
      observaciones_derivador: str(form, 'observaciones_derivador'),
      observaciones_voluntaria: str(form, 'observaciones_voluntaria'),
    },
  };
}

/** Al egresar o fallecer, se cierran las asignaciones vigentes. */
export async function cerrarAsignaciones(supabase: SupabaseClient, beneficiarioId: string) {
  return supabase
    .from('asignaciones')
    .update({ fecha_fin: hoy() })
    .eq('beneficiario_id', beneficiarioId)
    .eq('activa', true);
}

export const TIPOS_BITACORA = {
  seguimiento: { label: 'Seguimiento', tone: 'rose' as Tone },
  visita:      { label: 'Visita',      tone: 'salmon' as Tone },
  llamada:     { label: 'Llamada',     tone: 'taupe' as Tone },
  gestion:     { label: 'Gestión',     tone: 'green' as Tone },
  nota:        { label: 'Nota',        tone: 'slate' as Tone },
  otro:        { label: 'Otro',        tone: 'slate' as Tone },
} as const;
export type TipoBitacora = keyof typeof TIPOS_BITACORA;
export const TIPOS_BITACORA_KEYS = Object.keys(TIPOS_BITACORA) as TipoBitacora[];