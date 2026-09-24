import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import * as esbuild from 'esbuild';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const dist = path.join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const bundle = await esbuild.build({
  entryPoints: [path.join(root, 'src/host.ts')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  minify: true,
  legalComments: 'none',
  write: false,
});
const script = bundle.outputFiles[0].text;
const template = await readFile(path.join(root, 'src/index.template.html'), 'utf8');
const styles = await readFile(path.join(root, 'src/styles.css'), 'utf8');
const indexHtml = template.replace('/*__STYLES__*/', styles);
const manifest = await readFile(path.join(root, 'manifest.json'), 'utf8');
const icon = await readFile(path.join(root, 'icon.svg'), 'utf8');
const indexSize = Buffer.byteLength(indexHtml);
const codeSize = Buffer.byteLength(script);
if (indexSize > 100 * 1024) {
  throw new Error(`index.html is ${indexSize} bytes; Super Productivity allows at most 102400 bytes`);
}
if (codeSize > 5 * 1024 * 1024) {
  throw new Error(`plugin.js is ${codeSize} bytes; Super Productivity allows at most 5242880 bytes`);
}
await writeFile(path.join(dist, 'index.html'), indexHtml);
await writeFile(path.join(dist, 'plugin.js'), script);
await writeFile(path.join(dist, 'manifest.json'), manifest);
await writeFile(path.join(dist, 'icon.svg'), icon);

const zip = new JSZip();
zip.file('index.html', indexHtml);
zip.file('manifest.json', manifest);
zip.file('icon.svg', icon);
zip.file('plugin.js', script);
const archive = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
await writeFile(path.join(dist, 'sp-journal-markdown-1.0.0.zip'), archive);
console.log(`Built ${Math.ceil(indexSize / 1024)} KiB iframe, ${Math.ceil(codeSize / 1024)} KiB plugin.js and distribution ZIP`);
