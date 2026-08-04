const MAX_SOURCE_CHARACTERS = 240_000;
const MAX_DISPLAY_ITEMS = 8;
const MAX_ITEM_CHARACTERS = 220;
const MAX_SUMMARY_CHARACTERS = 320;

const FEATURE_PATTERNS = [/feature/, /capabilit/, /best choice/, /best overall/, /benefit/, /option/, /minimum/, /why/];
const FLOW_PATTERNS = [/flow/, /workflow/, /path/, /process/, /sequence/, /decision/, /step/];
const CONSTRAINT_PATTERNS = [/constraint/, /guard/, /avoid/, /safety/, /privacy/, /license/, /guidance/, /boundary/, /must not/, /do not/];
const ACCEPTANCE_PATTERNS = [/accept/, /success/, /criteria/, /verif/, /test/, /listen/, /decision rule/];

export function parseGistRoute(pathname) {
  const rawPath = typeof pathname === 'string' ? pathname.split(/[?#]/, 1)[0] : '/';
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPath || '/');
  } catch {
    return { kind: 'invalid', reason: 'The share link contains invalid URL encoding.' };
  }
  const segments = decodedPath.split('/').filter(Boolean);
  if (segments.length === 0) return { kind: 'home' };
  if (segments.length !== 2) return { kind: 'invalid', reason: 'A shared spec link must look like /owner/gist-id.' };
  const [owner, gistId] = segments;
  const validOwner = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(owner);
  const validGistId = /^[a-f0-9]{32}$/i.test(gistId);
  if (!validOwner || !validGistId) return { kind: 'invalid', reason: 'The share link needs a GitHub owner and a 32-character Gist id.' };
  return { kind: 'gist', owner, gistId: gistId.toLowerCase(), canonicalPath: `/${owner}/${gistId.toLowerCase()}` };
}

export function parseSpecSource(source, filename = 'SPEC.md') {
  const originalText = typeof source === 'string' ? source : String(source ?? '');
  const truncated = originalText.length > MAX_SOURCE_CHARACTERS;
  const text = truncated ? originalText.slice(0, MAX_SOURCE_CHARACTERS) : originalText;
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const headings = lines.map((line, index) => {
    const match = /^\s{0,3}(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!match) return null;
    return { level: match[1].length, text: cleanInline(match[2].replace(/\s+#+\s*$/, '')), index };
  }).filter((heading) => heading !== null);
  const titleHeading = headings.find((heading) => heading.level === 1);
  const firstHeading = headings[0];
  const title = titleHeading?.text || firstHeading?.text || filenameTitle(filename);
  const sections = headings.filter((heading) => heading.level > 1).map((heading) => {
    const nextHeading = headings.find((candidate) => candidate.index > heading.index && candidate.level <= heading.level);
    const sectionLines = lines.slice(heading.index + 1, nextHeading?.index ?? lines.length);
    const lists = extractLists(sectionLines);
    return { heading: heading.text, level: heading.level, startIndex: heading.index, endIndex: nextHeading?.index ?? lines.length, paragraph: firstParagraph(sectionLines), items: lists.items, numberedItems: lists.numberedItems, bulletItems: lists.bulletItems };
  });
  const featureSection = findSection(sections, FEATURE_PATTERNS);
  const flowSection = findSection(sections, FLOW_PATTERNS);
  const constraintSection = findSection(sections, CONSTRAINT_PATTERNS);
  const acceptanceSection = findSection(sections, ACCEPTANCE_PATTERNS);
  const fallbackItems = sections.flatMap((section) => section.items);
  const fallbackNumberedItems = sections.flatMap((section) => section.numberedItems);
  const keyFeatures = takeItems(featureSection?.items.length ? featureSection.items : fallbackItems);
  const flow = takeItems(flowSection?.numberedItems.length ? flowSection.numberedItems : flowSection?.items.length ? flowSection.items : fallbackNumberedItems);
  const constraints = takeItems(constraintSection?.items.length ? constraintSection.items : []);
  const acceptance = takeItems(acceptanceSection?.items.length ? acceptanceSection.items : []);
  const selectedSections = new Set([featureSection, flowSection, constraintSection, acceptanceSection].filter(Boolean));
  const selectedRanges = [...selectedSections];
  const supplementalSections = sections.filter((section) => !selectedSections.has(section)).filter((section) => !selectedRanges.some((parent) => section.startIndex > parent.startIndex && section.startIndex < parent.endIndex)).filter((section) => section.paragraph || section.items.length).slice(0, 10).map((section) => ({ heading: section.heading, paragraph: truncateText(section.paragraph, MAX_SUMMARY_CHARACTERS), items: takeItems(section.items, 5) }));
  const summary = firstParagraph(lines.slice(titleHeading?.index ?? -1 + 1));
  const headingsForOutline = headings.filter((heading) => heading.level > 1).slice(0, 30).map((heading) => ({ level: heading.level, text: heading.text }));
  const wordCount = text.trim() ? text.trim().split(/\s+/u).length : 0;
  const listCount = sections.reduce((count, section) => count + section.items.length, 0);
  return {
    title,
    summary: truncateText(summary || 'No summary paragraph was declared in the source.', MAX_SUMMARY_CHARACTERS),
    filename: filename || 'SPEC.md',
    sourceText: text,
    sourceLineCount: lines.length,
    wordCount,
    headingCount: headings.length,
    listCount,
    truncated,
    keyFeatures,
    featureSource: featureSection?.heading || 'First available list',
    flow,
    flowSource: flowSection?.heading || 'First numbered list',
    constraints,
    constraintSource: constraintSection?.heading || 'Declared constraints',
    acceptance,
    acceptanceSource: acceptanceSection?.heading || 'Declared acceptance',
    supplementalSections,
    outline: headingsForOutline,
  };
}

function findSection(sections, patterns) {
  return sections.find((section) => patterns.some((pattern) => pattern.test(normalizeHeading(section.heading))));
}

function extractLists(lines) {
  const items = [];
  const numberedItems = [];
  const bulletItems = [];
  for (const line of lines) {
    const match = /^\s*(?:(\d+)[.)]|[-*+])\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const item = truncateText(cleanInline(match[2]), MAX_ITEM_CHARACTERS);
    if (!item) continue;
    items.push(item);
    if (match[1]) numberedItems.push(item);
    else bulletItems.push(item);
  }
  return { items, numberedItems, bulletItems };
}

function firstParagraph(lines) {
  const paragraph = [];
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      if (paragraph.length) break;
      continue;
    }
    if (inFence || /^\s{0,3}#{1,6}\s+/.test(line) || /^\s*(?:\d+[.)]|[-*+])\s+/.test(line)) {
      if (paragraph.length) break;
      continue;
    }
    if (!line.trim()) {
      if (paragraph.length) break;
      continue;
    }
    paragraph.push(cleanInline(line));
  }
  return truncateText(paragraph.join(' '), MAX_SUMMARY_CHARACTERS);
}

function takeItems(items, limit = MAX_DISPLAY_ITEMS) {
  return items.filter(Boolean).slice(0, limit);
}

function normalizeHeading(value) {
  return cleanInline(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function cleanInline(value) {
  return String(value ?? '').replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/(\*\*|__)(.*?)\1/g, '$2').replace(/[*_~]/g, '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function truncateText(value, limit) {
  const text = String(value ?? '').trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

function filenameTitle(filename) {
  const base = String(filename || 'SPEC.md').replace(/\.[^.]+$/, '');
  const readable = base.replace(/[-_]+/g, ' ').trim();
  return readable ? readable.replace(/\b\w/g, (character) => character.toUpperCase()) : 'Untitled spec';
}
