# Vecinos que Acompañan con Compasión — Plataforma EKR

Seguimiento de usuarios del programa. Stack: Astro (SSR) + Supabase + Tailwind CSS.

## Desarrollo local

```sh
cp .env.example .env.local   # y completa URL + anon key de Supabase
npm install
npm run dev                  # http://localhost:4321
```

## Checklist de configuración en Supabase

1. **Authentication → URL Configuration**: Site URL `http://localhost:4321` y en
   Redirect URLs agregar `http://localhost:4321/api/auth/callback`
   (más adelante, el dominio de producción de Cloudflare).
2. **Authentication → Users**: la funcionaria EKR debe estar invitada con su correo.
3. **Table Editor → profiles**: su fila debe tener `linked_user` con el UUID del
   usuario de Auth (lo hace el trigger al aceptar la invitación).

## Estructura

- `src/middleware.ts` — protege todas las rutas (salvo `/login` y `/api/auth/*`); exige sesión.
- `src/lib/supabase.ts` — cliente server con manejo de cookies de sesión.
- `src/pages/api/auth/` — magic link: `login` (POST), `callback` (GET), `logout` (GET).
