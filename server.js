const express = require('express');
const cors = require('cors');
const https = require('https');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const MGP_BASE = 'appsvr.mardelplata.gob.ar';

app.use(cors());
app.use(express.static(path.join(__dirname, 'public/publicado')));

function fetchMGP(urlPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: MGP_BASE,
      path: '/cuando' + urlPath,
      method: 'GET',
      headers: { 'User-Agent': 'CuandoLlega/MGP (Android)', 'Accept': 'application/json, text/plain, */*' }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); } });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

app.get('/api/status', async (req, res) => {
  let mgpOk = false;
  const t0 = Date.now();
  try { await fetchMGP('/index.html'); mgpOk = true; } catch {}
  res.json({ ok: true, proxy: 'online', mgp: { online: mgpOk, ms: Date.now() - t0 }, ts: new Date().toISOString() });
});

app.get('/api/lineas', (req, res) => {
  const lineas = [511,512,513,514,515,516,517,521,522,523,524,525,531,532,533,541,542,551,552,561,571,572,581,591,592,593,594,595,596]
    .map(n => ({ numero: String(n), nombre: 'Línea ' + n }));
  res.json({ ok: true, lineas });
});

app.get('/api/arribo', async (req, res) => {
  const { linea, calle, inter, sentido } = req.query;
  if (!linea) return res.status(400).json({ ok: false, error: 'Falta: linea' });
  if (!calle) return res.status(400).json({ ok: false, error: 'Falta: calle' });
  if (!inter) return res.status(400).json({ ok: false, error: 'Falta: inter' });
  try {
    const urlPath = '/ArrEstim?linea=' + encodeURIComponent(linea) + '&calle='
