/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  /** Solo en desarrollo: EKR_DEMO=true muestra el panel con datos de ejemplo, sin Supabase. */
  readonly EKR_DEMO?: string;
}

declare namespace App {
  interface Locals {
    user?: import('@supabase/supabase-js').User;
  }
}
