// Dev : serveur Vite + bundle Electron + lancement d'Electron pointé sur le serveur Vite.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const electronBinary = require('electron'); // chemin de l'exécutable

const server = await createServer({ server: { port: 3000, strictPort: true } });
await server.listen();
const url = server.resolvedUrls?.local?.[0] ?? 'http://localhost:3000/';

await build({
  entryPoints: { main: 'src/main/index.ts', preload: 'src/preload/index.ts' },
  outdir: 'dist-electron',
  outExtension: { '.js': '.cjs' },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  external: ['electron'],
  sourcemap: true,
});

const child = spawn(electronBinary, ['.'], {
  stdio: 'inherit',
  env: { ...process.env, BOUTICA_DEV_SERVER_URL: url },
});
child.on('exit', async (code) => {
  await server.close();
  process.exit(code ?? 0);
});
