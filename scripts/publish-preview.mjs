import { execFileSync } from 'node:child_process';
import { mkdtemp, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const branch = 'preview/akv-project-page';
const repository = 'https://github.com/thuee-lizhihao/thinking_yard_project_preview.git';
const site = 'https://thuee-lizhihao.github.io/thinking_yard_project_preview/';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
if (git('branch', '--show-current') !== branch) throw new Error(`Publish from ${branch} only.`);
if (git('status', '--porcelain')) throw new Error('Commit all source changes before publishing a preview.');
const sha = git('rev-parse', 'HEAD');
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Use npm run publish:preview.');
const env = {
  ...process.env, GITHUB_PAGES: 'true',
  SITE_BASE_PATH: '/thinking_yard_project_preview', SITE_ORIGIN: 'https://thuee-lizhihao.github.io',
};
for (const command of ['check', 'build']) {
  execFileSync(process.execPath, [npm, 'run', command], { env, stdio: 'inherit' });
}
execFileSync(process.execPath, ['scripts/prepare-preview.mjs'], { env, stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/validate.mjs', 'out'], { env, stdio: 'inherit' });

// Only out/ is staged in an independent temporary bare repository. No source
// repository commits, .git directories, credentials or node_modules are copied.
const output = resolve('out');
async function inspect(directory) {
  let bytes = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || ['.git', '.github', 'node_modules'].includes(entry.name) || entry.name.startsWith('.env')) {
      throw new Error(`Unexpected publish entry: ${entry.name}`);
    }
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) bytes += await inspect(file);
    else {
      const length = (await stat(file)).size;
      if (length > 100 * 1024 * 1024) throw new Error(`GitHub file limit exceeded: ${file}`);
      bytes += length;
    }
  }
  return bytes;
}
if (await inspect(output) > 900 * 1024 * 1024) throw new Error('Preview exceeds Pages size budget.');
if (git('status', '--porcelain') || git('rev-parse', 'HEAD') !== sha) throw new Error('Source changed during the build; commit and retry.');
execFileSync('git', ['push', 'origin', branch], { stdio: 'inherit' });
const temporary = await mkdtemp(resolve(tmpdir(), 'thinking-yard-preview-'));
const bare = resolve(temporary, 'publish.git');
execFileSync('git', ['clone', '--bare', repository, bare], { stdio: 'inherit' });
const args = [`--git-dir=${bare}`, `--work-tree=${output}`];
const publishGit = (...command) => execFileSync('git', [...args, ...command], { cwd: output, stdio: 'inherit' });
publishGit('symbolic-ref', 'HEAD', `refs/heads/${branch}`);
// Start with an empty index so obsolete generated assets disappear on updates.
publishGit('read-tree', '--empty');
publishGit('add', '--all', '--', '.');
publishGit('-c', `user.name=${git('config', 'user.name')}`, '-c', `user.email=${git('config', 'user.email')}`,
  'commit', '--quiet', '--allow-empty', '-m', `Preview ${sha}`);
publishGit('push', 'origin', `HEAD:refs/heads/${branch}`);
console.log(`Uploaded generated preview for ${sha}. Pages will publish at ${site}`);
