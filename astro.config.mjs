import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
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