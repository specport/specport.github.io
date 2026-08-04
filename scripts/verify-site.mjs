import { access, readFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseGistRoute, parseRepoRoute, parseShareInput, parseShareRoute, parseSpecSource } from '../spec-model.mjs';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requiredFiles = [
  'index.html',
  'share-spec.html',
  '404.html',
  'styles.css',
  'spec.css',
  'share-spec.css',
  'app.js',
  'spec-model.mjs',
  'logo.svg',
  'favicon.svg',
  'og-image.svg',
  'release.json',
  'proof/coverage-gap/input.json',
  'proof/coverage-gap/receipt.json',
  'proof/coverage-gap/README.md',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const path of requiredFiles) {
  await access(join(siteRoot, path));
}

const [html, shareHtml, notFound, css, specCss, shareCss, script, modelScript, workflow, releaseText, proofText, inputText] =
  await Promise.all([
    readFile(join(siteRoot, 'index.html'), 'utf8'),
    readFile(join(siteRoot, 'share-spec.html'), 'utf8'),
    readFile(join(siteRoot, '404.html'), 'utf8'),
    readFile(join(siteRoot, 'styles.css'), 'utf8'),
    readFile(join(siteRoot, 'spec.css'), 'utf8'),
    readFile(join(siteRoot, 'share-spec.css'), 'utf8'),
    readFile(join(siteRoot, 'app.js'), 'utf8'),
    readFile(join(siteRoot, 'spec-model.mjs'), 'utf8'),
    readFile(join(siteRoot, '.github', 'workflows', 'pages.yml'), 'utf8'),
    readFile(join(siteRoot, 'release.json'), 'utf8'),
    readFile(join(siteRoot, 'proof', 'coverage-gap', 'receipt.json'), 'utf8'),
    readFile(join(siteRoot, 'proof', 'coverage-gap', 'input.json'), 'utf8'),
  ]);

const release = JSON.parse(releaseText);
const proof = JSON.parse(proofText);
const input = JSON.parse(inputText);

assert(release.name === '@specport/specport', 'Release package name is wrong.');
assert(
  release.repository === 'https://github.com/specport/specport',
  'Release metadata must point to the public canonical repository.',
);
assert(release.publicationStatus === 'PUBLISHED', 'Release is not proven published.');
assert(release.registryVersion === release.version, 'Registry version differs from package version.');
assert(
  typeof release.registryTarball === 'string' &&
    release.registryTarball.includes(`specport-${release.version}.tgz`),
  'Exact registry tarball is missing.',
);

const result = proof.result;
assert(proof.artifactKind === 'specport-coverage-example', 'Proof artifact kind is wrong.');
assert(proof.fixture?.synthetic === true, 'Proof must remain labeled synthetic.');
assert(proof.generatedBy?.version === release.version, 'Proof and release versions differ.');
assert(result?.coverage === 'partial', 'Proof must report partial coverage.');
assert(result.actualPaths?.length === 8, 'Proof must contain eight final paths.');
assert(result.reviewedPaths?.length === 7, 'Proof must contain seven reviewed paths.');
assert(
  result.unreviewedPaths?.length === 1 &&
    result.unreviewedPaths[0] === 'src/retry-policy.ts',
  'Proof uncovered path changed.',
);
assert(
  result.finding?.nextActionCode === 'review-receiver-paths',
  'Proof next action changed.',
);
assert(input.actual?.entries?.length === 8, 'Proof input must contain eight final entries.');
assert(input.receiver?.entries?.length === 7, 'Proof input must contain seven reviewed entries.');
assert(
  input.actual?.repositoryId === input.receiver?.repositoryId &&
    input.actual?.baseCommit === input.receiver?.baseCommit,
  'Proof input repository or base identity differs.',
);
assert(
  input.actual?.patchFingerprint &&
    input.receiver?.sourceFingerprint &&
    input.actual.patchFingerprint !== input.receiver.sourceFingerprint,
  'Proof input does not represent a patch that changed after review.',
);

const requiredHtml = [
  'Your coding agent says it’s done. Check the final tree.',
  'npx --yes @specport/specport@latest coverage',
  'Starts as a final-tree inventory',
  './proof/coverage-gap/receipt.json',
  './proof/coverage-gap/input.json',
  'src/retry-policy.ts',
  'Probably redundant when',
  'data-release-status>PUBLISHED',
  'https://github.com/specport/specport',
  '#specs-that-are-evidence-contracts-and-taste',
  '#guard-one-candidate-before-merge',
  '#cover-remix-and-build-handoffs',
  '/tree/main/skills',
  'SECURITY.md',
  'CONTRIBUTING.md',
  'id="privacy"',
  'href="./share-spec.html"',
];
for (const text of requiredHtml) {
  assert(html.includes(text), `index.html is missing required content: ${text}`);
}

const forbiddenHtml = [
  'NOT-PUBLISHED',
  'Keep the decisions close to the code',
  'A small contract loop. A clearer handoff.',
  'ONE PORTABLE ARTIFACT',
  'href="#roadmap"',
  'SHIPPING</span>',
  'github.com/stancsz/specport',
];
for (const text of forbiddenHtml) {
  assert(!html.includes(text), `index.html still contains retired content: ${text}`);
}

assert((html.match(/<h1\b/g) ?? []).length === 1, 'Page must contain exactly one h1.');
assert(html.includes('class="skip-link"'), 'Page is missing a skip link.');
assert(css.includes(':focus-visible'), 'CSS is missing a visible focus treatment.');
assert(css.includes('prefers-reduced-motion'), 'CSS is missing reduced-motion handling.');
assert(css.includes('@media (max-width: 760px)'), 'CSS is missing the primary mobile layout.');
assert(shareHtml.includes('data-view="share-spec"'), 'Share spec page is missing its view marker.');
assert(shareHtml.includes('data-share-form'), 'Share spec page is missing its source form.');
assert(shareHtml.includes('data-share-input'), 'Share spec page is missing its source input.');
assert(shareHtml.includes('data-share-result'), 'Share spec page is missing its result root.');
assert(shareCss.includes('.share-hero') && shareCss.includes('.share-result-panel'), 'Share spec stylesheet is missing core page treatments.');
assert(!script.includes('.innerHTML'), 'JavaScript must not assign fetched data with innerHTML.');
assert(!script.includes('document.write'), 'JavaScript must not write fetched content into the document stream.');
assert(!script.includes('insertAdjacentHTML'), 'JavaScript must not inject fetched content as HTML.');
assert(script.includes('https://api.github.com/gists/'), 'JavaScript is missing the GitHub Gist route fetch.');
assert(script.includes('https://api.github.com/repos/'), 'JavaScript is missing the GitHub repository SPEC.md fetch.');
assert(script.includes('parseShareInput'), 'JavaScript is missing Share spec input detection.');
assert(script.includes('root SPEC.md'), 'JavaScript must explain the repository root SPEC.md contract.');
assert(script.includes('credentials: "omit"'), 'Gist fetches must omit browser credentials.');
assert(script.includes('import("/spec-model.mjs")'), 'Deep-link route must load the parser from the site root.');
assert(script.includes('canonicalGistUrl'), 'Rendered source links must use the Gist API canonical URL.');
assert(!script.includes('eval('), 'JavaScript must not evaluate source content.');
assert(modelScript.includes('export function parseGistRoute'), 'Spec model is missing route parsing.');
assert(modelScript.includes('export function parseRepoRoute'), 'Spec model is missing repository route parsing.');
assert(modelScript.includes('export function parseShareRoute'), 'Spec model is missing shared route parsing.');
assert(modelScript.includes('export function parseShareInput'), 'Spec model is missing source input parsing.');
assert(modelScript.includes('export function parseSpecSource'), 'Spec model is missing deterministic parsing.');
assert(!modelScript.includes('.innerHTML'), 'Spec model must not render HTML from source text.');
assert(notFound.includes('data-view="spec"'), '404 fallback is missing the spec route marker.');
assert(notFound.includes('href="/styles.css"'), '404 fallback must use root-relative styles.');
assert(notFound.includes('href="/spec.css"'), '404 fallback is missing spec styles.');
assert(notFound.includes('src="/app.js"'), '404 fallback must load the route app from the site root.');
assert(notFound.includes('data-spec-route-root'), '404 fallback is missing the spec render root.');
assert(specCss.includes('.spec-map') && specCss.includes('.spec-source-code'), 'Spec stylesheet is missing core visualization styles.');
const validRoute = parseGistRoute('/stancsz/61a2777a086ae76b94106745bda85102/');
assert(validRoute.kind === 'gist' && validRoute.gistId === '61a2777a086ae76b94106745bda85102', 'Gist route parser changed.');
assert(parseGistRoute('/not-a-gist')?.kind === 'invalid', 'Invalid share routes must fail closed.');
const validRepoRoute = parseShareRoute('/repo/specport/specport/');
assert(validRepoRoute.kind === 'repo' && validRepoRoute.owner === 'specport' && validRepoRoute.repository === 'specport', 'Repository route parser changed.');
assert(parseRepoRoute('/repo/specport/specport')?.kind === 'repo', 'Repository parser failed.');
assert(parseShareRoute('/repo/61a2777a086ae76b94106745bda85102')?.kind === 'gist', 'Gist owners named repo must remain addressable.');
assert(parseShareInput('https://github.com/specport/specport')?.kind === 'repo', 'Repository URL input parser failed.');
assert(parseShareInput('specport/specport')?.kind === 'repo', 'Bare repository input parser failed.');
assert(parseShareInput('https://gist.github.com/stancsz/61a2777a086ae76b94106745bda85102')?.kind === 'gist', 'Gist URL input parser failed.');
const parsedFixture = parseSpecSource('# Demo\n\nA short idea.\n\n## Features\n\n- One thing\n\n## User flow\n\n1. Start\n');
assert(parsedFixture.title === 'Demo' && parsedFixture.keyFeatures[0] === 'One thing', 'Spec parser fixture failed.');
assert(parsedFixture.flow[0] === 'Start', 'Spec parser did not preserve ordered steps.');
assert(script.includes('data-release-note'), 'JavaScript is missing release fallback handling.');
assert(script.includes('data-proof-status'), 'JavaScript is missing proof metadata enhancement.');
assert(
  !script.includes('release.registryTarball'),
  'JavaScript must not replace npm package-page links with a tarball download.',
);

const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
assert(ids.size === (html.match(/\sid="[^"]+"/g) ?? []).length, 'Duplicate HTML ids found.');

const hrefs = [...html.matchAll(/\shref="([^"]+)"/g)].map((match) => match[1]);
let localLinkCount = 0;
for (const href of hrefs) {
  if (href.startsWith('#')) {
    const id = decodeURIComponent(href.slice(1));
    assert(ids.has(id), `Missing in-page link target: ${href}`);
    localLinkCount += 1;
    continue;
  }
  if (/^(?:https?:|mailto:|tel:)/.test(href)) continue;

  const pathOnly = href.split(/[?#]/, 1)[0];
  const candidate = normalize(join(siteRoot, pathOnly));
  assert(candidate.startsWith(siteRoot), `Local link escapes the site root: ${href}`);
  await access(candidate);
  localLinkCount += 1;
}

for (const src of [...html.matchAll(/\ssrc="([^"]+)"/g)].map((match) => match[1])) {
  if (/^(?:https?:|data:)/.test(src)) continue;
  const pathOnly = src.split(/[?#]/, 1)[0];
  const candidate = normalize(join(siteRoot, pathOnly));
  assert(candidate.startsWith(siteRoot), `Local source escapes the site root: ${src}`);
  await access(candidate);
}

assert(workflow.includes('npm run build'), 'Pages workflow must build the package source.');
assert(
  workflow.includes('repository: specport/specport') &&
    !workflow.includes('repository: stancsz/specport'),
  'Pages workflow must check out the public canonical package repository.',
);
assert(
  workflow.includes('Smoke exact published package') &&
    workflow.includes('@specport/specport@$VERSION') &&
    workflow.includes('specport coverage source --json'),
  'Pages workflow must smoke the exact published package.',
);
assert(
  workflow.includes('node scripts/generate-coverage-proof.mjs'),
  'Pages workflow must regenerate the coverage proof.',
);
assert(
  workflow.includes('404.html') &&
    workflow.includes('spec.css') &&
    workflow.includes('spec-model.mjs') &&
    workflow.includes('share-spec.html') &&
    workflow.includes('share-spec.css'),
  'Pages artifact must include the spec route and Share spec page files.',
);
assert(
  workflow.includes('node scripts/verify-site.mjs'),
  'Pages workflow must run the site verifier.',
);
assert(workflow.includes('proof'), 'Pages artifact must include the proof directory.');
assert(
  workflow.includes('Verify deployed page and evidence') &&
    workflow.includes('deployed-release.json') &&
    workflow.includes('deployed-proof.json'),
  'Pages workflow must fetch and verify the deployed page and evidence.',
);

console.log(
  `site_verify_ok files=${requiredFiles.length} localLinks=${localLinkCount} version=${release.version} proof=${result.coverage} deep_links=ready share_page=ready`,
);
