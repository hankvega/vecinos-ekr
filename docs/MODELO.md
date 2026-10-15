# Modelo de datos — Vecinos que Acompañan

Documentación técnica del esquema de Supabase. Referencia para desarrollo.

## Diagrama de relaciones
┌─────────────┐
│ profiles │ (voluntarias, coordinadoras, admin)
└──────┬──────┘
│
┌──────────────────┼──────────────────┐
│ │ │
│ │ │
┌────▼─────┐ ┌─────▼──────┐ ┌─────▼──────┐
│ visitas │ │asignaciones│ │ mensajes │
└────┬─────┘ └─────┬──────┘ └─────┬──────┘
│ │ │
│ │ │
│ ┌─────▼──────┐ │
└───────────►│beneficiarios│◄──────────┘
└─────┬──────┘
│
┌──────────────────┼──────────────────┐
│ │ │
┌────▼─────┐ ┌─────▼──────┐ ┌─────▼──────┐
│cuidadores│ │ acciones │ │ insumo_ │
│ │ │ (bitácora) │ │solicitudes │
└──────────┘ └────────────┘ └─────┬──────┘
│
┌─────▼──────┐
│insumo_items│
└────────────┘


---

## `profiles`

Personas del sistema: voluntarias, coordinadoras, administración.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `nombre` | text | |
| `telefono` | text | |
| `email` | text UNIQUE | |
| `rol` | text | `admin` / `coordinador` / `voluntario` |
| `activo` | boolean | default `true` |
| `linked_user` | uuid | FK a `auth.users.id` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Nota**: `linked_user` apunta a **`auth.users.id`**, no a `profiles.id`. Esto es importante para el mapeo en auditoría.

---

## `beneficiarios`

Personas acompañadas por el programa.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `rut` | text | UNIQUE |
| `nombre` | text | NOT NULL |
| `genero` | text | |
| `fecha_nacimiento` | date | |
| `direccion` | text | |
| `telefono` | text | |
| `comuna` | text | |
| `programa_hospitalario` | text | "Dependencia Severa", "Cuidados Paliativos", "Demencia", etc. |
| `usa_pañal` | boolean | |
| `talla_pañal` | text | G, M, XG, etc. |
| `tipo_pañal` | text | "Abierto", "Calzón" |
| `apoyo_nutricion` | text | Ensure, etc. |
| `observaciones_derivador` | text | |
| `observaciones_voluntaria` | text | |
| `estado` | text | `lista_espera` / `activo` / `egresado` / `fallecido` |
| `prioridad` | text | `alta` / `media` / `baja` |
| `derivado_por` | text | |
| `fecha_derivacion` | date | |
| `fecha_egreso` | date | |
| `fecha_fallecimiento` | date | |
| `gestion_ekr` | text | |
| `fecha_gestion_ekr` | date | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

## `cuidadores`

Familiares o responsables del cuidado. Un beneficiario puede tener varios.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `beneficiario_id` | integer FK | ON DELETE CASCADE |
| `nombre` | text | |
| `rut` | text | |
| `vinculo` | text | "hija", "esposo", "amiga", etc. |
| `genero` | text | |
| `telefono` | text | |
| `created_at` | timestamptz | |

---

## `asignaciones`

Vínculo voluntaria ↔ beneficiario.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `beneficiario_id` | integer FK | |
| `voluntaria_id` | uuid FK | → `profiles.id` |
| `fecha_inicio` | date | |
| `fecha_fin` | date | null = vigente |
| `activa` | boolean | **GENERATED**: `fecha_fin is null` |
| `notas` | text | |
| `created_at` | timestamptz | |

**Nota**: `activa` es una **columna generada**, no se puede escribir manualmente. Para cerrar una asignación, escribe `fecha_fin`.

---

## `acciones` (bitácora)

Registro cronológico de eventos por beneficiario.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `voluntaria_id` | uuid FK | Quien reporta |
| `beneficiario_id` | integer FK | |
| `tipo` | text | `seguimiento` / `visita` / `llamada` / `nota` / `gestion` / `otro` |
| `descripcion` | text | |
| `fecha` | date | |
| `registrado_por` | uuid FK | Quien ingresó el registro (normalmente coordinación) |
| `created_at` | timestamptz | |

**Uso**: la coordinadora ingresa el reporte mensual que le comunica la voluntaria.

---

## `visitas`

Registro de visitas presenciales (llenado por la app externa de voluntarias).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `beneficiario_id` | integer FK | |
| `voluntaria_id` | uuid FK | |
| `fecha_hora` | timestamptz | |
| `duracion_min` | integer | |
| `observaciones` | text | |
| `sincronizado_offline` | boolean | |
| `created_at` | timestamptz | |

---

## `insumo_solicitudes` / `insumo_items`

Pedidos de insumos (pañales, cremas, etc.).

### `insumo_solicitudes` (cabecera)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `beneficiario_id` | integer FK | |
| `voluntaria_id` | uuid FK | |
| `estado` | text | `solicitado` / `aprobado` / `entregado` / `rechazado` |
| `urgencia` | text | `alta` / `media` / `baja` |
| `fecha_solicitud` | date | |
| `fecha_aprobacion` | date | |
| `fecha_entrega` | date | |
| `notas` | text | |
| `respuesta` | text | Motivo de rechazo o nota de entrega |
| `resuelto_por` | uuid FK | |
| `resuelto_at` | timestamptz | |
| `created_at` | timestamptz | |

### `insumo_items` (líneas)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `solicitud_id` | integer FK | ON DELETE CASCADE |
| `tipo` | text | `panal_abierto` / `panal_calzon` / `sabanilla` / `toalla_humeda` / `crema` / `ensure` / `otro` |
| `talla` | text | |
| `cantidad` | integer | |

---

## `mensajes`

Comunicaciones internas y urgencias.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `autor_id` | uuid FK | → `profiles.id` |
| `beneficiario_id` | integer FK | Opcional |
| `tipo` | text | `mensaje` / `urgencia` |
| `texto` | text | |
| `leido` | boolean | |
| `created_at` | timestamptz | |

---

## `adjuntos`

Archivos subidos (fotos, documentos).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `entidad` | text | `visita` / `beneficiario` / `mensaje` |
| `entidad_id` | integer | |
| `file_path` | text | Ruta en Supabase Storage |
| `subido_por` | uuid FK | |
| `created_at` | timestamptz | |

---

## `auditoria`

Log de cambios. Alimentado por triggers.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `usuario_id` | uuid | → `auth.users.id` (no `profiles.id`) |
| `entidad` | text | Nombre de la tabla modificada |
| `entidad_id` | text | ID del registro modificado |
| `accion` | text | `INSERT` / `UPDATE` / `DELETE` / `EXPORT` |
| `diff` | jsonb | `{old: {...}, new: {...}}` |
| `created_at` | timestamptz | |

**Nota**: `usuario_id` es el UUID de `auth.users`, no de `profiles`. Para obtener el nombre, se hace join con `profiles.linked_user`.

---

## Funciones de autorización

### `es_ekr()`
```sql
select exists (
  select 1 from profiles
  where linked_user = auth.uid()
    and rol in ('admin','coordinador')
    and activo = true
);