// node render.js preview <slug> 2,10,18   |   LAYER=plate|overlay PORT=8781 node render.js full <slug> <outfile> <start> <end>
const { chromium } = require('playwright'); const { spawn } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path');
const root = __dirname, PORT = +(process.env.PORT || 8765), mode = process.argv[2], slug = process.argv[3], dir = path.join(root, 'videos', slug);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }).listen(PORT);
(async () => {
 const L = process.env.LAYER;
 const b = await chromium.launch({ headless: !process.env.HEADFUL, args: process.env.SWIFTSHADER ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--ignore-gpu-blocklist', '--enable-gpu'] });
 const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
 p.on('pageerror', e => console.log('PAGEERR', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('PAGE', m.text()); });
 await p.goto(`http://localhost:${PORT}/index.html?v=${slug}` + (L ? `&layer=${L}` : ''));
 await p.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
 console.log('GL', await p.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const d = g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : '?'; }));
 if (mode === 'preview') {
  fs.mkdirSync(path.join(dir, 'prev'), { recursive: true });
  for (const t of process.argv[4].split(',').map(Number)) { await p.evaluate(t => window.renderAt(t), t); await p.screenshot({ path: path.join(dir, 'prev', `f_${t.toFixed(2)}.jpg`), type: 'jpeg', quality: 85 }); console.log('t', t); }
 } else {
  const out = path.join(dir, process.argv[4]), fps = 30, s = +process.argv[5], e = +process.argv[6];
  const enc = L === 'overlay' ? ['-c:v', 'png', '-i', '-', '-c:v', 'qtrle'] : ['-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '15', '-pix_fmt', 'yuv420p'];
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), ...enc, out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n0 = Math.round(s * fps), n1 = Math.round(e * fps), T0 = Date.now();
  for (let i = n0; i < n1; i++) {
   let buf;
   if (L === 'plate') { const d = await p.evaluate(t => { window.renderAt(t); return window.grab(); }, i / fps); buf = Buffer.from(d.split(',')[1], 'base64'); }
   else if (L === 'overlay') { await p.evaluate(t => window.renderAt(t), i / fps); buf = await p.screenshot({ type: 'png', omitBackground: true }); }
   else { await p.evaluate(t => window.renderAt(t), i / fps); buf = await p.screenshot({ type: 'jpeg', quality: 93 }); }
   if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
   if (i % 60 === 0) console.log('frame', i, ((Date.now() - T0) / (i - n0 + 1)).toFixed(0), 'ms/f');
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); console.log('DONE');
 }
 await b.close(); srv.close();
})();
