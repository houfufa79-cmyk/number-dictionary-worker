/**
 * Number Dictionary — Cloudflare Worker
 *
 * Runs locally:   npm run dev     → http://localhost:8787/
 * Deploys with:    npm run deploy
 *
 * Routes:
 *   GET  /            → the Number Dictionary web page
 *   POST /api/decode  → { "input": "6901234567892" } → decoded result as JSON
 *   GET  /api/decode?input=123456 → decoded result as JSON
 */
import { PAGE_HTML } from './page.js';
import { decodeNumber } from './decode.js';

const HTML_HEADERS = { 'Content-Type': 'text/html; charset=utf-8' };
const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), { status, headers: JSON_HEADERS });
}

async function readInput(request, url) {
  if (request.method === 'GET') return url.searchParams.get('input') || '';
  try {
    const body = await request.json();
    return body.input ?? body.number ?? '';
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env, ctx) {
    // You can view your logs in the Observability dashboard
    console.info({ message: 'Number Dictionary Worker received a request!' });

    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (url.pathname === '/api/decode') {
      const input = await readInput(request, url);
      if (input === null) return json({ ok: false, error: 'Invalid JSON body.' }, 400);
      return json(decodeNumber(input));
    }

    if (url.pathname === '/api' || url.pathname === '/health') {
      return json({
        ok: true,
        service: 'Number Dictionary',
        endpoints: ['GET /', 'GET|POST /api/decode'],
      });
    }

    return new Response(PAGE_HTML, { headers: HTML_HEADERS });
  },
};
