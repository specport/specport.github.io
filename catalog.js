(() => {
  const results = document.querySelector('[data-catalog-results]');
  if (!results) return;

  const controls = document.querySelector('[data-catalog-controls]');
  const summary = document.querySelector('[data-catalog-summary]');
  const countNode = document.querySelector('[data-catalog-count]');
  const statusNode = document.querySelector('[data-catalog-status-text]');
  const statusBar = document.querySelector('[data-catalog-status]');
  const empty = document.querySelector('[data-catalog-empty]');
  const emptyMessage = document.querySelector('[data-catalog-empty-message]');
  const detail = document.querySelector('[data-catalog-detail]');
  const search = document.querySelector('#catalog-search');
  const reset = document.querySelector('[data-catalog-reset]');
  const emptyReset = document.querySelector('[data-catalog-empty-reset]');
  const filterNodes = new Map(
    [...document.querySelectorAll('[data-catalog-filter]')].map((node) => [node.dataset.catalogFilter, node]),
  );

  const CATALOG_SITE = 'https://specport.github.io/specs/';
  const CATEGORY_LABELS = new Map([
    ['business-ops', 'Business ops'],
    ['creator-tools', 'Creator tools'],
    ['developer-tools', 'Developer tools'],
    ['health-tools', 'Health tools'],
    ['personal-ai', 'Personal AI'],
    ['productivity', 'Productivity'],
    ['github-discovery', 'GitHub discovery'],
  ]);
  const state = {
    catalog: null,
    records: [],
    query: '',
    category: 'all',
    implementation: 'all',
    tag: 'all',
    stack: 'all',
    agent: 'all',
    effort: 'all',
    license: 'all',
    decision: 'all',
    freshness: 'all',
    sort: 'featured',
  };

  const list = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : []);

  const safeUrl = (value) => {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value, window.location.href);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
      return url.href;
    } catch {
      return null;
    }
  };

  const text = (value, fallback = '') => {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed || fallback;
  };

  const labelForCategory = (value) => CATEGORY_LABELS.get(value) || value.replaceAll('-', ' ');

  const labelForDecision = (value) => ({
    catalogable: 'Catalogable',
    published: 'Published pack',
    'source-only': 'Source only',
    'needs-review': 'Needs review',
    stale: 'Stale snapshot',
  }[value] || value.replaceAll('-', ' '));

  const labelForImplementation = (value) => ({
    reference: 'Working reference',
    starter: 'Blueprint only',
    unknown: 'Implementation unknown',
  }[value] || value.replaceAll('-', ' '));

  const factValue = (facts, key, fallback = null) => {
    const fact = facts?.[key];
    return fact && fact.provenance !== 'unknown' ? fact.value : fallback;
  };

  const discoveryRecord = (candidate) => {
    const normalized = candidate && typeof candidate.normalized === 'object' ? candidate.normalized : {};
    const source = candidate && typeof candidate.source === 'object' ? candidate.source : {};
    const urls = source.urls && typeof source.urls === 'object' ? source.urls : {};
    const repository = text(source.repository || factValue(normalized, 'repository'), 'Unknown GitHub repository');
    const path = text(source.path || factValue(normalized, 'path'), 'SPEC.md');
    const commit = text(source.commitSha || factValue(normalized, 'commit'), 'unknown');
    const decision = text(candidate?.state, 'needs-review').toLowerCase();
    const license = source.license && typeof source.license === 'object' ? source.license : {};
    const reasonCodes = list(candidate?.reasonCodes);
    const sourceUrl = safeUrl(urls.file || urls.repository);
    const rawUrl = safeUrl(urls.raw);
    const sourceOnly = decision !== 'catalogable' || license.snapshotAllowed !== true;
    const pullCommand = text(
      source.pullCommand,
      repository !== 'Unknown GitHub repository' && /^[a-f0-9]{40}$/u.test(commit) && path !== 'SPEC.md'
        ? `npx --yes @specport/specport@latest pull ${repository}@${commit}:${path} --out SPEC.md`
        : '',
    );
    return {
      id: text(candidate?.id),
      name: `${repository} / ${path}`,
      tagline: `GitHub discovery | ${labelForDecision(decision)}`,
      summary: 'A public SPEC.md candidate retained with immutable source and policy evidence.',
      outcome: sourceOnly
        ? 'Inspect the exact source record before considering redistribution or adoption.'
        : 'Read the exact committed source and decide whether it fits your own product context.',
      category: 'github-discovery',
      tags: ['github', 'discovered', ...reasonCodes.slice(0, 4)],
      audience: {
        primary: 'Builders evaluating public GitHub product specs',
        job: 'Find a source-backed SPEC.md candidate and inspect its evidence before pulling it.',
      },
      implementation: {
        state: 'unknown',
        boundary: 'Discovery is not approval, implementation evidence, or a ship recommendation.',
      },
      catalog: { decision, sourceOnly },
      license: {
        spdx: text(license.spdx, 'unknown'),
        state: license.snapshotAllowed === true ? 'declared' : 'unknown',
        attributionRequired: license.snapshotAllowed === true,
      },
      verification: {
        state: text(candidate?.sync?.state, 'not declared'),
        evidence: reasonCodes.map((reason) => `Policy signal: ${reason}`),
      },
      effort: { size: 'unknown' },
      updatedAt: text(candidate?.indexedAt || candidate?.lastSeen || candidate?.observedAt, 'unknown'),
      featured: false,
      source: {
        repository,
        path,
        ref: commit,
        commit,
        specUrl: sourceUrl,
        contentUrl: sourceUrl,
        downloadUrl: sourceOnly ? '' : rawUrl,
        pullCommand,
      },
      assets: {},
      downloadUrl: sourceOnly ? sourceUrl : rawUrl,
      sourceOnly,
      searchFields: [repository, path, commit, ...reasonCodes],
    };
  };

  const normalize = (record) => {
    const source = record && typeof record.source === 'object' ? record.source : {};
    const catalog = record && typeof record.catalog === 'object' ? record.catalog : {};
    const implementation = record && typeof record.implementation === 'object' ? record.implementation : {};
    const audience = record && typeof record.audience === 'object' ? record.audience : {};
    const compatibility = record && typeof record.compatibility === 'object' ? record.compatibility : {};
    const license = record && typeof record.license === 'object' ? record.license : {};
    const verification = record && typeof record.verification === 'object' ? record.verification : {};
    const assets = record && typeof record.assets === 'object' ? record.assets : {};
    const lineage = record && typeof record.lineage === 'object' ? record.lineage : {};
    const id = text(record?.id);
    const decision = text(
      record?.catalogStatus || record?.catalogDecision || catalog.decision || record?.decision,
      record?.status === 'published' ? 'published' : 'catalogable',
    ).toLowerCase();
    const licenseState = text(
      record?.licenseState || license.state,
      license.spdx || license.key ? 'declared' : 'unknown',
    ).toLowerCase();
    const sourceOnly = record?.sourceOnly === true || catalog.sourceOnly === true || decision === 'source-only' || licenseState === 'unknown';
    const implementationState = text(implementation.state || record?.implementationState, 'unknown').toLowerCase();
    const sourceRepository = text(source.repository || record?.sourceRepository);
    const sourcePath = text(source.path || record?.sourcePath);
    const sourceRef = text(source.ref || record?.sourceRef);
    const sourceUrl = safeUrl(source.specUrl || source.contentUrl || source.url || record?.sourceUrl);
    const fallbackSourceUrl = sourceRepository && sourcePath && sourceRef
      ? safeUrl(`https://github.com/${sourceRepository}/blob/${sourceRef}/${sourcePath}`)
      : null;
    const downloadUrl = safeUrl(
      record?.downloadUrl || source.downloadUrl || (
        assets.spec && sourceRepository === 'specport/specs'
          ? `${CATALOG_SITE}${String(assets.spec).replace(/^\/+/, '')}`
          : ''
      ),
    );
    const tags = list(record?.tags);
    const agents = list(compatibility.agents || record?.agents);
    const stacks = list(compatibility.stacks || record?.stacks);
    const evidence = list(verification.evidence || record?.evidence);
    const searchFields = list(record?.searchFields || record?.search);
    const searchable = [
      record?.name,
      record?.tagline,
      record?.summary,
      record?.outcome,
      audience.primary,
      audience.job,
      record?.category,
      ...tags,
      ...agents,
      ...stacks,
      ...searchFields,
      sourceRepository,
      sourcePath,
      sourceUrl,
    ].filter(Boolean).join(' ').toLocaleLowerCase();

    return {
      raw: record,
      id,
      name: text(record?.name, id || 'Untitled spec'),
      tagline: text(record?.tagline, 'A portable spec from the maintained catalog.'),
      summary: text(record?.summary, 'The source record does not declare a summary.'),
      outcome: text(record?.outcome, 'Inspect the source before adopting this workflow.'),
      category: text(record?.category, 'uncategorized'),
      tags,
      agents,
      stacks,
      audience: {
        primary: text(audience.primary, 'Audience not declared'),
        job: text(audience.job, 'The source does not declare a user job.'),
      },
      implementationState,
      implementationBoundary: text(implementation.boundary || record?.implementationBoundary, 'Implementation boundary not declared.'),
      decision,
      decisionReason: text(record?.catalogReason || catalog.reason || record?.reason, 'Included from the maintained catalog source.'),
      license: text(license.spdx || license.name || record?.licenseName, licenseState),
      licenseState,
      attribution: license.attributionRequired === true || record?.attributionRequired === true,
      verificationState: text(verification.state || record?.verificationState, 'not declared'),
      evidence,
      effort: text(record?.effort?.size || record?.effort, 'unknown').toLowerCase(),
      lineage: list(lineage.parents),
      updatedAt: text(record?.updatedAt || record?.indexedAt || record?.lastSeen, 'unknown'),
      featured: record?.featured === true,
      sourceRepository,
      sourcePath,
      sourceRef,
      commit: text(source.commit || record?.commit || record?.sourceCommit, sourceRef),
      sourceUrl: sourceUrl || fallbackSourceUrl,
      downloadUrl,
      pullCommand: text(source.pullCommand || record?.pullCommand),
      sourceOnly,
      searchable,
    };
  };

  const create = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = String(value);
    return node;
  };

  const option = (select, value, label, selected = false) => {
    const node = create('option', '', label);
    node.value = value;
    node.selected = selected;
    select.append(node);
  };

  const formatDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}(?:T|$)/u.test(value)) return value;
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
  };

  const setStatus = (message, tone = 'ready') => {
    statusNode.textContent = message;
    statusBar.dataset.statusTone = tone;
  };

  const setLink = (label, href, className = 'catalog-link', external = true) => {
    const safe = safeUrl(href);
    if (!safe) return null;
    const link = create('a', className, label);
    link.href = safe;
    if (external) {
      link.target = '_blank';
      link.rel = 'noreferrer';
    }
    return link;
  };

  const copy = async (value) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const input = create('textarea');
    input.value = value;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.append(input);
    input.select();
    const copied = document.execCommand('copy');
    input.remove();
    if (!copied) throw new Error('Clipboard unavailable');
  };

  const showDetail = (record, push = true) => {
    detail.replaceChildren();
    const back = create('button', 'catalog-detail-back', '← Back to catalog');
    back.type = 'button';
    back.addEventListener('click', () => closeDetail(true));
    detail.append(back);

    const heading = create('div', 'catalog-detail-heading');
    const kicker = create('p', 'catalog-detail-kicker', `${labelForCategory(record.category)} / ${labelForDecision(record.decision)}`);
    const title = create('h3', '', record.name);
    const tagline = create('p', 'catalog-detail-tagline', record.tagline);
    heading.append(kicker, title, tagline);
    detail.append(heading);

    const grid = create('div', 'catalog-detail-grid');
    const main = create('div', 'catalog-detail-main');
    const compatibility = [...record.agents, ...record.stacks];
    main.append(
      create('p', 'catalog-detail-label', 'What this spec is for'),
      create('p', '', record.audience.job),
      create('p', 'catalog-detail-label', 'Outcome'),
      create('p', '', record.outcome),
      create('p', 'catalog-detail-label', 'Honest boundary'),
      create('p', '', record.implementationBoundary),
      create('p', 'catalog-detail-label', 'Catalog decision'),
      create('p', '', record.decisionReason),
      create('p', 'catalog-detail-label', 'Compatibility'),
      create('p', '', compatibility.length ? compatibility.join(' / ') : 'Compatibility is not declared.'),
      create('p', 'catalog-detail-label', 'Lineage'),
      create('p', '', record.lineage.length ? record.lineage.join(' / ') : 'No parent records are declared.'),
    );
    if (record.evidence.length) {
      main.append(create('p', 'catalog-detail-label', 'Evidence'));
      const evidence = create('ul', 'catalog-detail-list');
      record.evidence.forEach((item) => evidence.append(create('li', '', item)));
      main.append(evidence);
    }

    const aside = create('aside', 'catalog-detail-aside');
    const facts = create('dl', 'catalog-detail-facts');
    const factsToShow = [
      ['Catalog state', labelForDecision(record.decision)],
      ['Implementation', labelForImplementation(record.implementationState)],
      ['License', `${record.license}${record.attribution ? ' / attribution required' : ''}`],
      ['Verification', record.verificationState.replaceAll('-', ' ')],
      ['Effort', record.effort],
      ['Updated', formatDate(record.updatedAt)],
      ['Source repository', record.sourceRepository || 'not declared'],
      ['Exact path', record.sourcePath || 'not declared'],
      ['Source commit', record.commit || record.sourceRef || 'not pinned'],
    ];
    factsToShow.forEach(([label, value]) => {
      const row = create('div');
      row.append(create('dt', '', label), create('dd', '', value));
      facts.append(row);
    });
    aside.append(facts);

    const actions = create('div', 'catalog-detail-actions');
    const sourceLink = setLink('Open exact source', record.sourceUrl, 'button button-secondary');
    if (sourceLink) actions.append(sourceLink);
    const downloadLink = setLink(record.sourceOnly ? 'Open original file' : 'Read / download SPEC.md', record.downloadUrl, 'button button-secondary');
    if (downloadLink) {
      if (!record.sourceOnly && record.downloadUrl?.startsWith(window.location.origin)) downloadLink.download = '';
      actions.append(downloadLink);
    }
    const staticDetail = setLink(
      'Open no-script detail',
      `${CATALOG_SITE}specs/${encodeURIComponent(record.id)}/`,
      'button button-secondary',
    );
    if (staticDetail) actions.append(staticDetail);
    aside.append(actions);

    if (record.pullCommand) {
      const pull = create('div', 'catalog-pull-box');
      pull.append(create('span', 'catalog-detail-label', 'Pull exact source'), create('code', '', record.pullCommand));
      const button = create('button', 'catalog-copy', 'Copy command');
      button.type = 'button';
      button.addEventListener('click', async () => {
        try {
          await copy(record.pullCommand);
          button.textContent = 'Copied';
          window.setTimeout(() => { button.textContent = 'Copy command'; }, 1500);
        } catch {
          button.textContent = 'Select command';
        }
      });
      pull.append(button);
      aside.append(pull);
    }

    const tags = create('div', 'catalog-detail-tags');
    record.tags.forEach((tag) => tags.append(create('span', '', tag)));
    aside.append(tags);
    grid.append(main, aside);
    detail.append(grid);
    results.hidden = true;
    empty.hidden = true;
    summary.hidden = true;
    controls.hidden = true;
    detail.hidden = false;
    if (push) {
      const url = new URL(window.location.href);
      url.searchParams.set('spec', record.id);
      window.history.pushState({ spec: record.id }, '', `${url.pathname}${url.search}#catalog`);
    }
    detail.focus({ preventScroll: true });
    window.scrollTo({ top: document.querySelector('#catalog').offsetTop - 72, behavior: 'smooth' });
  };

  const closeDetail = (push = false) => {
    detail.hidden = true;
    results.hidden = false;
    summary.hidden = false;
    controls.hidden = false;
    if (push) {
      const url = new URL(window.location.href);
      url.searchParams.delete('spec');
      window.history.pushState({}, '', `${url.pathname}${url.search}#catalog`);
    }
    window.scrollTo({ top: document.querySelector('#catalog').offsetTop - 72, behavior: 'smooth' });
  };

  const currentRecords = () => {
    const query = state.query.trim().toLocaleLowerCase();
    const records = state.records.filter((record) => {
      if (state.category !== 'all' && record.category !== state.category) return false;
      if (state.implementation !== 'all' && record.implementationState !== state.implementation) return false;
      if (state.tag !== 'all' && !record.tags.includes(state.tag)) return false;
      if (state.stack !== 'all' && !record.stacks.includes(state.stack)) return false;
      if (state.agent !== 'all' && !record.agents.includes(state.agent)) return false;
      if (state.effort !== 'all' && record.effort !== state.effort) return false;
      if (state.license !== 'all' && record.licenseState !== state.license) return false;
      if (state.decision !== 'all' && record.decision !== state.decision) return false;
      if (state.freshness !== 'all') {
        const updated = Date.parse(record.updatedAt);
        const cutoff = Date.now() - Number(state.freshness) * 24 * 60 * 60 * 1000;
        if (!Number.isFinite(updated) || updated < cutoff) return false;
      }
      return !query || record.searchable.includes(query);
    });
    return records.sort((left, right) => {
      if (state.sort === 'name') return left.name.localeCompare(right.name);
      if (state.sort === 'updated') return right.updatedAt.localeCompare(left.updatedAt);
      if (state.sort === 'reference') return Number(right.implementationState === 'reference') - Number(left.implementationState === 'reference') || left.name.localeCompare(right.name);
      return Number(right.featured) - Number(left.featured) || left.name.localeCompare(right.name);
    });
  };

  const renderCard = (record) => {
    const card = create('article', 'catalog-market-card');
    const link = create('a', 'catalog-card-link');
    link.href = `?spec=${encodeURIComponent(record.id)}#catalog`;
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      showDetail(record);
    });
    const top = create('div', 'catalog-card-top');
    top.append(create('span', 'catalog-card-category', labelForCategory(record.category)), create('span', `catalog-card-decision decision-${record.decision}`, labelForDecision(record.decision)));
    const title = create('h3', '', record.name);
    const tagline = create('p', 'catalog-card-tagline', record.tagline);
    const outcome = create('p', 'catalog-card-outcome');
    outcome.append(create('strong', '', 'Outcome'), document.createTextNode(record.outcome));
    const boundary = create('p', 'catalog-card-boundary');
    boundary.append(create('strong', '', 'Boundary'), document.createTextNode(record.implementationBoundary));
    const tags = create('div', 'catalog-card-tags');
    record.tags.slice(0, 5).forEach((tag) => tags.append(create('span', '', tag)));
    const footer = create('div', 'catalog-card-footer');
    footer.append(create('span', '', `${record.implementationState === 'reference' ? 'Reference' : 'Blueprint'} | ${record.license} | ${formatDate(record.updatedAt)}`), create('span', 'catalog-card-arrow', '↗'));
    link.append(top, title, tagline, outcome, boundary, tags, footer);
    card.append(link);
    return card;
  };

  const render = () => {
    const visible = currentRecords();
    results.replaceChildren();
    results.setAttribute('aria-busy', 'false');
    countNode.textContent = `${visible.length} ${visible.length === 1 ? 'spec' : 'specs'} in view`;
    empty.hidden = visible.length !== 0;
    const activeFilters = [
      state.query ? `search “${state.query.trim()}”` : '',
      state.category !== 'all' ? labelForCategory(state.category) : '',
      state.implementation !== 'all' ? labelForImplementation(state.implementation) : '',
      state.tag !== 'all' ? `tag ${state.tag}` : '',
      state.stack !== 'all' ? `stack ${state.stack}` : '',
      state.agent !== 'all' ? `agent ${state.agent}` : '',
      state.effort !== 'all' ? `effort ${state.effort}` : '',
      state.license !== 'all' ? `license ${state.license}` : '',
      state.decision !== 'all' ? labelForDecision(state.decision) : '',
      state.freshness !== 'all' ? `updated in the last ${state.freshness} days` : '',
    ].filter(Boolean);
    emptyMessage.textContent = activeFilters.length
      ? `No records match ${activeFilters.join(', ')}. Clear a filter or search a broader job.`
      : 'The catalog only shows records backed by a committed source snapshot.';
    reset.hidden = !state.query && [state.category, state.implementation, state.tag, state.stack, state.agent, state.effort, state.license, state.decision, state.freshness].every((value) => value === 'all');
    visible.forEach((record) => results.append(renderCard(record)));
  };

  const populateFilters = () => {
    const valuesFor = (selector) => [...new Set(state.records.flatMap((record) => selector(record)))].sort((left, right) => left.localeCompare(right));
    const fill = (key, label, values, labeler = (value) => value) => {
      const select = filterNodes.get(key);
      select.replaceChildren();
      option(select, 'all', label, true);
      values.forEach((value) => option(select, value, labeler(value)));
    };
    fill('category', 'All categories', valuesFor((record) => [record.category]), labelForCategory);
    fill('implementation', 'All build states', valuesFor((record) => [record.implementationState]), labelForImplementation);
    fill('tag', 'All tags', valuesFor((record) => record.tags));
    fill('stack', 'All stacks / runtimes', valuesFor((record) => record.stacks));
    fill('agent', 'All agents', valuesFor((record) => record.agents));
    fill('effort', 'All effort sizes', valuesFor((record) => [record.effort]), (value) => value === 'unknown' ? 'Unknown effort' : value);
    fill('license', 'All license states', valuesFor((record) => [record.licenseState]), (value) => value === 'declared' ? 'Declared license' : value);
    fill('decision', 'All catalog states', valuesFor((record) => [record.decision]), labelForDecision);
  };

  const resetFilters = () => {
    state.query = '';
    state.category = 'all';
    state.implementation = 'all';
    state.tag = 'all';
    state.stack = 'all';
    state.agent = 'all';
    state.effort = 'all';
    state.license = 'all';
    state.decision = 'all';
    state.freshness = 'all';
    state.sort = 'featured';
    search.value = '';
    filterNodes.get('category').value = 'all';
    filterNodes.get('implementation').value = 'all';
    filterNodes.get('tag').value = 'all';
    filterNodes.get('stack').value = 'all';
    filterNodes.get('agent').value = 'all';
    filterNodes.get('effort').value = 'all';
    filterNodes.get('license').value = 'all';
    filterNodes.get('decision').value = 'all';
    filterNodes.get('freshness').value = 'all';
    filterNodes.get('sort').value = 'featured';
    render();
  };

  const openRequestedDetail = () => {
    const id = new URLSearchParams(window.location.search).get('spec');
    const record = state.records.find((candidate) => candidate.id === id);
    if (record) showDetail(record, false);
  };

  search.addEventListener('input', () => {
    state.query = search.value;
    render();
  });
  filterNodes.get('category').addEventListener('change', (event) => { state.category = event.target.value; render(); });
  filterNodes.get('implementation').addEventListener('change', (event) => { state.implementation = event.target.value; render(); });
  filterNodes.get('tag').addEventListener('change', (event) => { state.tag = event.target.value; render(); });
  filterNodes.get('stack').addEventListener('change', (event) => { state.stack = event.target.value; render(); });
  filterNodes.get('agent').addEventListener('change', (event) => { state.agent = event.target.value; render(); });
  filterNodes.get('effort').addEventListener('change', (event) => { state.effort = event.target.value; render(); });
  filterNodes.get('license').addEventListener('change', (event) => { state.license = event.target.value; render(); });
  filterNodes.get('decision').addEventListener('change', (event) => { state.decision = event.target.value; render(); });
  filterNodes.get('freshness').addEventListener('change', (event) => { state.freshness = event.target.value; render(); });
  filterNodes.get('sort').addEventListener('change', (event) => { state.sort = event.target.value; render(); });
  reset.addEventListener('click', resetFilters);
  emptyReset.addEventListener('click', resetFilters);

  document.addEventListener('keydown', (event) => {
    const target = event.target;
    const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable;
    if (event.key === '/' && !typing && !detail.hidden) return;
    if (event.key === '/' && !typing) {
      event.preventDefault();
      search.focus();
    }
    if (event.key === 'Escape' && !detail.hidden) closeDetail(true);
  });
  window.addEventListener('popstate', () => {
    const id = new URLSearchParams(window.location.search).get('spec');
    const record = state.records.find((candidate) => candidate.id === id);
    if (record) showDetail(record, false);
    else closeDetail(false);
  });

  fetch('./catalog.json', { headers: { Accept: 'application/json' }, cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`Catalog request failed with HTTP ${response.status}.`);
      return response.json();
    })
    .then((catalog) => {
      const rawRecords = [
        ...(Array.isArray(catalog?.packs) ? catalog.packs : []),
        ...(Array.isArray(catalog?.records) ? catalog.records : []),
        ...(Array.isArray(catalog?.githubDiscovery?.candidates)
          ? catalog.githubDiscovery.candidates.map(discoveryRecord)
          : []),
      ];
      if (!rawRecords.length) throw new Error('Catalog contains no public records.');
      state.catalog = catalog;
      const searchIndex = new Map(
        (Array.isArray(catalog?.searchIndex) ? catalog.searchIndex : [])
          .filter((entry) => entry && typeof entry.id === 'string' && typeof entry.text === 'string')
          .map((entry) => [entry.id, entry.text]),
      );
      state.records = rawRecords
        .map(normalize)
        .map((record) => ({
          ...record,
          searchable: `${record.searchable} ${searchIndex.get(record.id) || ''}`.trim(),
        }))
        .filter((record) => record.id && record.decision !== 'rejected');
      populateFilters();
      controls.hidden = false;
      summary.hidden = false;
      setStatus(`${state.records.length} specs · source ${text(catalog?.source?.ref, 'snapshot')} · search and filter locally`, 'ready');
      render();
      openRequestedDetail();
    })
    .catch((error) => {
      results.setAttribute('aria-busy', 'false');
      setStatus('Catalog unavailable · the source page remains available', 'error');
      const link = setLink('Open the catalog source', 'https://specport.github.io/specs/', 'catalog-error-link');
      const message = create('p', 'catalog-load-error', error instanceof Error ? error.message : 'The catalog could not be loaded.');
      if (link) message.append(document.createTextNode(' '), link);
      results.append(message);
    });
})();
