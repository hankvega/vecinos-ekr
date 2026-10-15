/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  

declare namespace App {
  interface Locals {
    user?: import('@supabase/supabase-js').User;
  }
}
