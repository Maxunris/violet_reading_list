import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const baseFiles = [
  'assets',
  'popup.html',
  'options.html',
  'styles',
  'scripts'
];

async function loadManifest() {
  const raw = await readFile(path.join(rootDir, 'manifest.json'), 'utf8');
  return JSON.parse(raw);
}

async function copyBase(targetDir) {
  await mkdir(targetDir, { recursive: true });
  await Promise.all(baseFiles.map(item => cp(path.join(rootDir, item), path.join(targetDir, item), { recursive: true })));
}

async function writeManifest(targetDir, manifest) {
  await writeFile(path.join(targetDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

async function zipDirectory(sourceDir, outputFile) {
  await rm(outputFile, { force: true });
  await execFileAsync('zip', ['-rq', outputFile, '.'], { cwd: sourceDir });
}

async function build() {
  const manifest = await loadManifest();
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  const chromiumDir = path.join(distDir, 'chromium');
  const firefoxDir = path.join(distDir, 'firefox');

  await copyBase(chromiumDir);
  await copyBase(firefoxDir);

  const chromiumManifest = structuredClone(manifest);
  delete chromiumManifest.browser_specific_settings;
  await writeManifest(chromiumDir, chromiumManifest);

  const firefoxManifest = structuredClone(manifest);
  firefoxManifest.background = {
    ...firefoxManifest.background,
    scripts: ['scripts/background.js']
  };
  await writeManifest(firefoxDir, firefoxManifest);

  await zipDirectory(chromiumDir, path.join(distDir, 'violet-reading-list-chromium.zip'));
  await zipDirectory(firefoxDir, path.join(distDir, 'violet-reading-list-firefox.zip'));

  console.log('Built release artifacts:');
  console.log(`- ${path.relative(rootDir, chromiumDir)}`);
  console.log(`- ${path.relative(rootDir, firefoxDir)}`);
  console.log(`- ${path.relative(rootDir, path.join(distDir, 'violet-reading-list-chromium.zip'))}`);
  console.log(`- ${path.relative(rootDir, path.join(distDir, 'violet-reading-list-firefox.zip'))}`);
}

build().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
