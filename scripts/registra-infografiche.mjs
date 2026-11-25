// Registra le tavole di modulo-2-infografiche/ in video MP4 1920×1080 per Keynote, fotogramma per fotogramma:
// il tempo delle animazioni CSS viene fermato e spostato a mano, quindi il video è fluido anche su una macchina lenta.
// Uso: node scripts/registra-infografiche.mjs            → tutte le tavole
//      node scripts/registra-infografiche.mjs 2 4        → solo le tavole 2 e 4
//      node scripts/registra-infografiche.mjs --fermo    → solo l'ultimo fotogramma di ogni tavola, in PNG
// Servono Playwright (con Chromium) e ffmpeg.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const page_url = pathToFileURL(resolve(root, 'modulo-2-infografiche/index.html')).href;
const out = resolve(root, 'modulo-2-infografiche/video');
const FPS = 30;
// durata di ogni tavola in secondi, compreso il fermo finale
const DUR = { 1: 12, 2: 13, 3: 11, 4: 13, 5: 13, 6: 13 };
const NOMI = { 1: 'flusso', 2: 'quattro-coppie', 3: 'differenze', 4: 'core-spakb', 5: 'chi-sei-dopo', 6: 'lo-spazio' };

const args = process.argv.slice(2);
const fermo = args.includes('--fermo');
const scelte = args.filter(a => /^\d$/.test(a)).map(Number);
const tavole = scelte.length ? scelte : [1, 2, 3, 4, 5, 6];
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
for (const t of tavole) {
  await page.goto(`${page_url}?t=${t}&rec`);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.__start());
  const nome = `koineme-m2-${t}-${NOMI[t]}`;
  if (fermo) {
    await page.evaluate(ms => window.__seek(ms), DUR[t] * 1000 - 100);
    await page.screenshot({ path: resolve(out, `${nome}.png`) });
    console.log('fermo', nome);
    continue;
  }
  const dir = resolve(tmpdir(), `koineme-frames-${t}`);
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir);
  const n = DUR[t] * FPS;
  for (let f = 0; f < n; f++) {
    await page.evaluate(ms => window.__seek(ms), f * 1000 / FPS);
    await page.screenshot({ path: resolve(dir, `${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 94 });
  }
  const mp4 = resolve(out, `${nome}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', resolve(dir, '%05d.jpg'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
  // l'ultimo fotogramma anche come immagine fissa
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', resolve(dir, `${String(n - 1).padStart(5, '0')}.jpg`), resolve(out, `${nome}.png`)]);
  rmSync(dir, { recursive: true, force: true });
  console.log('video', nome, existsSync(mp4) ? 'ok' : 'MANCA');
}
await browser.close();
