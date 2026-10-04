import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

// Run after validation/build, before publishing only the generated out/ tree.
async function markHTML(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) await markHTML(file);
    else if (entry.name.endsWith('.html')) {
      const html = await readFile(file, 'utf8');
      await writeFile(file, html.replace(/<head>/i, '<head><meta name="robots" content="noindex, nofollow">'));
    }
  }
}
await markHTML(resolve('out'));
await writeFile(resolve('out/robots.txt'), 'User-agent: *\nDisallow: /\n');
await writeFile(resolve('out/deployment.json'), JSON.stringify({
  branch: execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim(),
  sha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
}, null, 2) + '\n');
