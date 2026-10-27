import { mkdir, readdir, copyFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { cmsConfig } from './cms-config.mjs';
const require = createRequire(import.meta.url);
const source = join(dirname(require.resolve('decap-cms/package.json')), 'dist');
await mkdir('public/admin/vendor', { recursive: true });
for (const name of await readdir(source)) {
  if (name.endsWith('.decap-cms.js') || name === 'decap-cms.js' || name.endsWith('.wasm') || name === 'cms.css' || name === 'decap-cms.js.LICENSE.txt') {
    await copyFile(join(source, name), join('public/admin/vendor', name));
  }
}
await writeFile('public/admin/config.json', JSON.stringify(cmsConfig, null, 2) + '\n');
console.log('Prepared local CMS assets and content configuration.');
