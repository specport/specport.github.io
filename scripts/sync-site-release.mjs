import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(
  process.env.SPECPORT_SOURCE_DIR ?? join(siteRoot, '..', 'specport'),
);
const packagePath = join(sourceRoot, 'package.json');
const outputPath = join(siteRoot, 'release.json');
const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
const canonicalRepository = 'https://github.com/specport/specport';
const bin = typeof packageJson.bin === 'string'
  ? packageJson.name.split('/').at(-1)
  : Object.keys(packageJson.bin ?? {})[0] ?? null;

const registryUrl = `https://registry.npmjs.org/${encodeURIComponent(packageJson.name)}`;
const release = {
  name: packageJson.name,
  version: packageJson.version,
  license: packageJson.license,
  engine: packageJson.engines?.node ?? null,
  bin,
  repository: canonicalRepository,
  homepage: packageJson.homepage ?? null,
  publicationStatus: 'NOT-PUBLISHED',
  registryVersion: null,
  registryTarball: null,
  deploymentStatus: process.env.SPECPORT_PAGES_STATUS ?? 'SOURCE / VERIFY AFTER DEPLOY',
  commit: process.env.GITHUB_SHA ? process.env.GITHUB_SHA.slice(0, 12) : 'local checkout',
  source: 'canonical public repository + package.json + registry.npmjs.org',
};

try {
  const response = await fetch(registryUrl, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  });

  if (response.ok) {
    const registry = await response.json();
    const registryVersion = registry['dist-tags']?.latest ?? null;
    const versionRecord = registry.versions?.[packageJson.version];
    release.registryVersion = registryVersion;
    release.registryTarball = versionRecord?.dist?.tarball ?? null;
    if (registryVersion === packageJson.version && release.registryTarball) {
      release.publicationStatus = 'PUBLISHED';
    } else if (registryVersion !== packageJson.version) {
      release.publicationStatus = 'NOT-PUBLISHED';
      release.publicationReason = 'registry-version-mismatch';
    }
  }
} catch {
  // A failed registry check is deliberately fail-closed as NOT-PUBLISHED.
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(release, null, 2)}\n`, 'utf8');
await syncStaticReleaseFallback(release);
console.log(`Wrote ${outputPath} (${release.publicationStatus}, ${release.version}).`);

async function syncStaticReleaseFallback(metadata) {
  const htmlPath = join(siteRoot, 'index.html');
  const html = await readFile(htmlPath, 'utf8');
  const published = metadata.publicationStatus === 'PUBLISHED';
  const stateClass = metadata.publicationStatus === 'PUBLISHED'
    ? 'release-state-published'
    : 'release-state-warning';
  const sourceCommand = 'git clone https://github.com/specport/specport.git specport';
  const sourceInstallCommand = 'git clone https://github.com/specport/specport.git specport; cd specport; npm ci --ignore-scripts --no-audit --no-fund; npm run build';
  const sourceCoverageCommand = 'node dist/cli.js coverage';
  const quickStartCommand = published ? 'npx --yes @specport/specport@latest coverage' : sourceCommand;
  const installCommand = published ? 'npm install --save-dev @specport/specport' : sourceInstallCommand;
  const coverageCommand = published ? 'npx --no-install specport coverage' : sourceCoverageCommand;
  const commandContext = published ? 'Published package / exact npm version' : 'Current source checkout / npm publication pending';
  const commandBoxAria = published ? 'Run the published SpecPort package' : 'Use the verified SpecPort source checkout';
  const commandCopyAria = published ? 'Copy the published SpecPort command' : 'Copy the SpecPort source checkout command';
  const installCopyAria = published ? 'Copy the npm install command' : 'Copy the source checkout command';
  const qualifier = published
    ? 'Starts as a final-tree inventory. Add an approved scope or pinned review for a fail-closed coverage verdict.'
    : `Then run <code>${sourceCoverageCommand}</code>. This source path is shown because the current package version is not published.`;
  const note = published
    ? 'Release snapshot verified from the exact npm version and tarball.'
    : `Release snapshot reports ${metadata.publicationStatus}; use the verified source checkout until this version is published.`;
  const next = html
    .replace(/class="release-state (?:release-state-published|release-state-warning)" data-release-state/gu, `class="release-state ${stateClass}" data-release-state`)
    .replace(/(data-release-command-box[^>]*aria-label=")[^"]*(")/u, `$1${commandBoxAria}$2`)
    .replace(/(data-release-command-context>)[^<]*(<\/div>)/u, `$1${commandContext}$2`)
    .replace(/(data-release-command-copy\s+aria-label=")[^"]*(")/gu, `$1${commandCopyAria}$2`)
    .replace(/(data-release-install-copy\s+aria-label=")[^"]*(")/gu, `$1${installCopyAria}$2`)
    .replace(/(data-release-command>)[^<]*(<\/span>)/gu, `$1${quickStartCommand}$2`)
    .replace(/(data-copy=")[^"]*("(?=\s*data-release-command-copy))/gu, `$1${quickStartCommand}$2`)
    .replace(/(data-release-qualifier>)[\s\S]*?(<\/p>)/u, `$1${qualifier}$2`)
    .replace(/(data-release-install-title>)[^<]*(<\/p>)/gu, `$1${published ? 'Install the published package' : 'Use the current source checkout'}$2`)
    .replace(/(data-release-install-command>)[^<]*(<\/code>)/gu, `$1${installCommand}$2`)
    .replace(/(data-copy=")[^"]*("(?=\s*data-release-install-copy))/gu, `$1${installCommand}$2`)
    .replace(/(data-release-coverage-command>)[^<]*(<\/code>)/gu, `$1${coverageCommand}$2`)
    .replace(/(data-copy=")[^"]*("(?=\s*data-release-coverage-copy))/gu, `$1${coverageCommand}$2`)
    .replace(/(data-release-status>)[^<]*(<\/span>)/gu, `$1${metadata.publicationStatus}$2`)
    .replace(/(data-release-version>)[^<]*(<\/span>)/gu, `$1${metadata.version}$2`)
    .replace(/(data-release-engine>)[^<]*(<\/span>)/gu, `$1${String(metadata.engine ?? '').replace(/^>=/u, '≥')}$2`)
    .replace(/(data-release-license>)[^<]*(<\/span>)/gu, `$1${metadata.license ?? ''}$2`)
    .replace(/(data-release-bin>)[^<]*(<\/span>)/gu, `$1${metadata.bin ?? ''}$2`)
    .replace(/(data-release-commit>)[^<]*(<\/span>)/gu, `$1${metadata.commit ?? ''}$2`)
    .replace(/(data-release-note>)[^<]*(<\/p>)/u, `$1${note}$2`);
  if (next === html) return;
  await writeFile(htmlPath, next, 'utf8');
}
