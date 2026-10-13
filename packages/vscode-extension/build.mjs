// Bundles the extension host and the engine into one file, so the packaged extension needs no node_modules.
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [path.join(here, 'src/extension.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: ['vscode'],
  sourcemap: true,
  outfile: path.join(here, 'dist/extension.js'),
  logLevel: 'warning',
});
console.log('Extension built into packages/vscode-extension/dist');
