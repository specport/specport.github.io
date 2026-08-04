import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(
  process.env.SPECPORT_SOURCE_DIR ?? join(siteRoot, '..', 'specport'),
);
const fixtureRoot = join(siteRoot, 'proof', 'coverage-gap');
const inputPath = join(fixtureRoot, 'input.json');
const outputPath = join(fixtureRoot, 'receipt.json');
const coveragePath = join(sourceRoot, 'dist', 'core', 'coverage.js');
const versionPath = join(sourceRoot, 'dist', 'version.js');

let compareCoverage;
let version;
try {
  ({ compareCoverage } = await import(pathToFileURL(coveragePath).href));
  ({ VERSION: version } = await import(pathToFileURL(versionPath).href));
} catch (error) {
  throw new Error(
    `SpecPort must be built before generating the proof fixture. Missing built modules under ${sourceRoot}.`,
    { cause: error },
  );
}

if (typeof compareCoverage !== 'function' || typeof version !== 'string') {
  throw new Error('The built SpecPort modules do not expose the expected API.');
}

const input = JSON.parse(await readFile(inputPath, 'utf8'));
if (
  input.actual?.repositoryId !== input.receiver?.repositoryId ||
  input.actual?.baseCommit !== input.receiver?.baseCommit
) {
  throw new Error('Coverage fixture repository or base identity does not match.');
}
if (
  !input.actual?.patchFingerprint ||
  !input.receiver?.sourceFingerprint ||
  input.actual.patchFingerprint === input.receiver.sourceFingerprint
) {
  throw new Error('Coverage fixture must represent a final patch that changed after review.');
}
const result = compareCoverage(input);
const expectedPath = 'src/retry-policy.ts';

if (result.coverage !== 'partial') {
  throw new Error(`Expected partial coverage, received ${result.coverage}.`);
}
if (
  result.actualPaths.length !== 8 ||
  result.reviewedPaths.length !== 7 ||
  result.unreviewedPaths.length !== 1 ||
  result.unreviewedPaths[0] !== expectedPath
) {
  throw new Error('Coverage fixture path counts or uncovered path changed.');
}
if (result.finding?.nextActionCode !== 'review-receiver-paths') {
  throw new Error('Coverage fixture no longer returns the expected next action.');
}

const receipt = {
  artifactKind: 'specport-coverage-example',
  schemaVersion: '0.1.0',
  generatedBy: {
    package: '@specport/specport',
    version,
    entrypoint: 'compareCoverage',
  },
  fixture: {
    name: 'late-file-after-review',
    synthetic: true,
    input: './input.json',
  },
  result,
};

await mkdir(fixtureRoot, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(
  `Wrote ${outputPath} (${result.coverage}, ${result.unreviewedPaths.join(', ')}).`,
);
