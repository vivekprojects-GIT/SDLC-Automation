// Bundles the screens into the extension's media folder. The UI has no other output.
import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../vscode-extension/media');
await mkdir(out, { recursive: true });

await build({
  entryPoints: [path.join(here, 'src/main.ts')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  sourcemap: true,
  outfile: path.join(out, 'ui.js'),
  logLevel: 'warning',
});
await copyFile(path.join(here, 'src/styles.css'), path.join(out, 'ui.css'));
console.log('UI built into packages/vscode-extension/media');
