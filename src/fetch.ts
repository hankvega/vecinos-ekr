import { astro, FetchState } from 'astro/fetch';
import { finalize } from '@astrojs/cloudflare/fetch';

export default {
  async fetch(request: Request, env: any, context: any) {
    const state = new FetchState(request);
    // NO llamar a cf(). Llamar directamente a astro().
    return finalize(state, await astro(state));
  },
};