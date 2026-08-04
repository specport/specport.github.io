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
      release.publicationStatus = 'VERSION-MISMATCH';
    }
  }
} catch {
  // A failed registry check is deliberately fail-closed as NOT-PUBLISHED.
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(release, null, 2)}\n`, 'utf8');
console.log(`Wrote ${outputPath} (${release.publicationStatus}, ${release.version}).`);
