const express = require('express');
const cors    = require('cors');
const fetch   = (...args) => import('node-fetch').then(m => m.default(...args));

const app  = express();
const PORT = process.env.PORT || 3001;

const MGP_BASE = 'https://appsvr.mardelplata.gob.ar/cuando';
const MGP_HEADERS = {
  'User-Agent': 'CuandoLlega/MGP (Android)',
  'Accept':     'application/json, text/plain, */*',
  'Referer':    'https://appsvr.mardelplata.gob.ar/cuando/index.html',
  'Origin':     'https://appsvr.mardelplata.gob.ar',
};

app.use(cors());

async function fetchMGP(path, params = {}) {
  const url = new URL(MGP_BASE + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), {
    headers: MGP_HEADERS,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`MGP respondió HTTP ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('json')) return await res.json();
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

app.get('/api/status', async (req, res) => {
  let mgpOk = false, mgpMs = null;
  const t0 = Date.now();
  try {
    const r = await fetch(MGP_BASE + '/index.html', { headers: MGP_HEADERS, signal: AbortSignal.timeout(5000) });
    mgpOk = r.ok; mgpMs = Date.now() - t0;
  } catch {}
  res.json({ ok: true, proxy: 'online', mgp: { online: mgpOk, ms: mgpMs }, ts: new Date().toISOString() });
});

app.get('/api/lineas', async (req, res) => {
  const estaticas = [511,512,513,514,515,516,517,521,522,523,524,525,531,532,533,541,542,551,552,561,571,572,581,591,592,593,594,595,596]
    .map(n => ({ numero: String(n), nombre: `Línea ${n}` }));
  try {
    const data = await fetchMGP('/LineasXml');
    if (Array.isArray(data)) return res.json({ ok: true, lineas: data });
    throw new Error('formato inesperado');
  } catch {
    return res.json({ ok: true, source: 'static', lineas: estaticas });
  }
});

app.get('/api/arribo', async (req, res) => {
  const { linea, calle, inter, sentido } = req.query;
  if (!linea) return res.status(400).json({ ok: false, error: 'Falta: linea' });
  if (!calle) return res.status(400).json({ ok: false, error: 'Falta: calle' });
  if (!inter) return res.status(400).json({ ok: false, error: 'Falta: inter' });
  try {
    const data = await fetchMGP('/ArrEstim', {
      linea: linea.trim(), calle: calle.trim().toUpperCase(),
      inter: inter.trim().toUpperCase(), sentido: sentido || '0',
    });
    let arri​​​​​​​​​​​​​​​​
