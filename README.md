# Vecinos que Acompañan con Compasión — Plataforma EKR

Plataforma de seguimiento del programa de acompañamiento de la Fundación Elisabeth Kübler-Ross Chile.

## Stack

- **Astro 7** (SSR, `output: 'server'`)
- **Supabase** (PostgreSQL + Auth + RLS)
- **Tailwind CSS v4** (vía `@tailwindcss/vite`)
- **ExcelJS** (exportación a `.xlsx`)

## Desarrollo local

```bash
cp .env.example .env.local
npm install
npm run dev