var express = require('express');
var cors = require('cors');
var https = require('https');
var path = require('path');
var app = express();
var PORT = process.env.PORT || 3001;
app.use(cors());
app.use(express.static(path.join(__dirname, 'public/publicado')));
app.get('/api/status', function(req, res) {
  res.json({ ok: true, proxy: 'online', mgp: { online: true, ms: 0 }, ts: new Date().toISOString() });
});
app.get('/api/lineas', function(req, res) {
  var nums = [511,512,513,514,515,516,517,521,522,523,524,525,531,532,533,541,542,551,552,561,571,572,581,591,592,593,594,595,596];
  res.json({ ok: true, lineas: nums.map(function(n) { return { numero: String(n), nombre: 'Linea ' + n }; }) });
});
app.get('/api/arribo', function(req, res) {
  var linea = req.query.linea;
  var calle = req.query.calle;
  var inter = req.query.inter;
  var sentido = req.query.sentido || '0';
  if (!linea || !calle || !inter) return res.status(400).json({ ok: false, error: 'Faltan parametros' });
  var options = {
    hostname: 'appsvr.mardelplata.gob.ar',
    path: '/cuando/ArrEstim?linea=' + encodeURIComponent(linea) + '&calle=' + encodeURIComponent(calle.toUpperCase()) + '&inter=' + encodeURIComponent(inter.toUpperCase()) + '&sentido=' + sentido,
    headers: { 'User-Agent': 'CuandoLlega/MGP' }
  };
  var r = https.request(options, function(response) {
    var data = '';
    response.on('data', function(c) { data += c; });
    response.on('end', function() {
      try {
        var json = JSON.parse(data);
        var arr = Array.isArray(json) ? json : (json.arrivals || json.arrivos || []);
        arr = arr.map(function(a, i) { return { orden: i+1, minutos: parseInt(a.minutos || a.tiempo || 0), interno: a.interno || '-' }; });
        res.json({ ok: true, parada: { linea: linea, calle: calle.toUpperCase(), inter: inter.toUpperCase(), sentido: sentido }, arrivals: arr, timestamp: new Date().toISOString() });
      } catch(e) { res.status(502).json({ ok: false, error: 'Parse error' }); }
    });
  });
  r.on('error', function(e) { res.status(502).json({ ok: false, error: e.message }); });
  r.setTimeout(8000, function() { r.destroy(); });
  r.end();
});
app.listen(PORT, function() { console.log('Proxy en puerto ' + PORT); });
