import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    session: false, // Evita el binding KV que causaba el error 1101
  }),
  vite: {
    plugins: [tailwindcss()],
  },
  env: {
    schema: {
      SUPABASE_URL: envField.string({ 
        context: 'server', 
        access: 'secret',
      }),
      SUPABASE_ANON_KEY: envField.string({ 
        context: 'server', 
        access: 'secret',
        optional: true 
      }),
    },
  },
});