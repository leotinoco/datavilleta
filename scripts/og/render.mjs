// Genera og-image.png (1200×630) a partir de scripts/og/og-image.html con Microsoft Edge o Chrome sin interfaz.
// Uso: node scripts/og/render.mjs
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = pathToFileURL(path.join(here, 'og-image.html')).href;
const out = path.resolve(here, '../../og-image.png');
const browsers = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const exe = browsers.find(existsSync);
if (!exe) throw new Error('No se encontró Edge ni Chrome para generar la imagen.');
execFileSync(exe, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1200,630', `--screenshot=${out}`, html], { stdio: 'inherit' });
console.log('Imagen generada:', out);
