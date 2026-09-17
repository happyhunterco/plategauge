// Bundles every function the way Netlify does (esbuild) to catch import problems before deploy.
import { build } from 'esbuild';
import { readdirSync } from 'node:fs';
const fns = readdirSync('netlify/functions').filter((f) => f.endsWith('.ts'));
for (const f of fns) {
  await build({ entryPoints: [`netlify/functions/${f}`], bundle: true, platform: 'node', target: 'node20', format: 'esm', outdir: '/tmp/pg-fn-check', external: ['@netlify/functions'], logLevel: 'error' });
  console.log('bundled', f);
}
