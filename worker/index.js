// Cloudflare Workers: serve the React build and route /api/* to the existing API.
// Reuse the Pages Function handler without duplicating auth, CRUD or D1 logic.
import { onRequest } from '../functions/api/[[path]].js';
import { scheduledGarmin } from './garmin.js';

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (path === '/api' || path.startsWith('/api/')) {
      return onRequest({ request, env, ...ctx });
    }
    return env.ASSETS.fetch(request);
  },
  async scheduled(controller,env,ctx) {
    await scheduledGarmin(env);
  },
};
