(() => {
  const isSpecRoute = document.body?.dataset.view === "spec";
  const isShareSpecPage = document.body?.dataset.view === "share-spec";

  const copyText = async (value) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    if (!copied) throw new Error("Clipboard unavailable");
  };

  const setCopyState = (button, label, delay = 1600) => {
    const labelNode = button.querySelector("[data-copy-label]") || button;
    const original = button.dataset.originalLabel || labelNode.textContent || "Copy";
    button.dataset.originalLabel = original;
    labelNode.textContent = label;
    button.dataset.copyState = label === "Copied" ? "success" : "idle";
    window.setTimeout(() => {
      labelNode.textContent = original;
      button.dataset.copyState = "idle";
    }, delay);
  };

  const wireCopyButtons = (root = document) => {
    for (const button of root.querySelectorAll("[data-copy]")) {
      if (button.dataset.copyBound === "true") continue;
      button.dataset.copyBound = "true";
      button.addEventListener("click", async () => {
        const value = button.getAttribute("data-copy");
        if (!value) return;
        try {
          await copyText(value);
          setCopyState(button, "Copied");
        } catch {
          setCopyState(button, "Select manually", 2400);
        }
      });
    }
  };

  if (isSpecRoute) {
    renderSpecRoute().catch((error) => {
      const root = document.querySelector("[data-spec-route-root]");
      if (root) renderSpecError(root, null, error);
    });
    return;
  }

  if (isShareSpecPage) {
    initShareSpecPage();
    return;
  }

  wireCopyButtons();

  const setText = (selector, value) => {
    if (value === undefined || value === null || value === "") return;
    for (const node of document.querySelectorAll(selector)) node.textContent = String(value);
  };

  const setCopyValue = (selector, value) => {
    for (const node of document.querySelectorAll(selector)) {
      node.setAttribute("data-copy", value);
    }
  };

  const setAttribute = (selector, name, value) => {
    for (const node of document.querySelectorAll(selector)) {
      node.setAttribute(name, value);
    }
  };

  const updateReleaseMetadata = (release) => {
    if (!release || typeof release !== "object") return;
    const status = typeof release.publicationStatus === "string"
      ? release.publicationStatus
      : null;
    const published = status === "PUBLISHED";
    const sourceCommand = "git clone https://github.com/specport/specport.git specport";
    const sourceInstallCommand = "git clone https://github.com/specport/specport.git specport; cd specport; npm ci --ignore-scripts --no-audit --no-fund; npm run build";
    const sourceCoverageCommand = "node dist/cli.js coverage";
    const quickStartCommand = published
      ? "npx --yes @specport/specport@latest spec create notes.md --out SPEC.md"
      : `${sourceCommand}; cd specport; npm ci --ignore-scripts --no-audit --no-fund; npm run build; node dist/cli.js spec create notes.md --out SPEC.md`;
    const installCommand = published
      ? "npm install --save-dev @specport/specport"
      : sourceInstallCommand;
    const coverageCommand = published
      ? "npx --no-install specport coverage"
      : sourceCoverageCommand;
    setText("[data-release-command-context]", published ? "Published package / notes → SPEC.md" : "Current source checkout / npm publication pending");
    setAttribute("[data-release-command-box]", "aria-label", published ? "Turn notes into a SpecPort draft" : "Use the verified SpecPort source checkout to create a draft");
    setAttribute("[data-release-command-copy]", "aria-label", published ? "Copy the notes-to-spec command" : "Copy the SpecPort source checkout command");
    setAttribute("[data-release-install-copy]", "aria-label", published ? "Copy the npm install command" : "Copy the source checkout command");
    setText("[data-release-command]", quickStartCommand);
    setCopyValue("[data-release-command-copy]", quickStartCommand);
    setText("[data-release-install-command]", installCommand);
    setCopyValue("[data-release-install-copy]", installCommand);
    setText("[data-release-coverage-command]", coverageCommand);
    setCopyValue("[data-release-coverage-copy]", coverageCommand);
    setText("[data-release-install-title]", published ? "Install the published package" : "Use the current source checkout");
    setText("[data-release-qualifier]", published
      ? "Creates a deterministic draft; inspect it, add human decisions, then run the structural check."
      : "Then run the built CLI to create a draft. This source path is shown because the current package version is not published.");
    setText("[data-release-status]", status);
    setText("[data-release-version]", release.version);
    setText("[data-release-license]", release.license);
    setText("[data-release-bin]", release.bin);
    setText("[data-release-commit]", release.commit);
    if (typeof release.engine === "string") setText("[data-release-engine]", release.engine.replace(/^>=/, "\u2265"));
    if (status) {
      document.documentElement.dataset.publicationStatus = status;
      for (const node of document.querySelectorAll("[data-release-state]")) {
        node.classList.toggle("release-state-published", published);
        node.classList.toggle("release-state-warning", !published);
      }
    }
    const note = document.querySelector("[data-release-note]");
    if (note) note.textContent = status === "PUBLISHED"
      ? "Release snapshot verified from the exact npm version and tarball."
      : `Release snapshot reports ${status || "an unknown package state"}; inspect the release record before installing.`;
    document.documentElement.dataset.releaseMetadata = "loaded";
  };

  const markReleaseMetadataUnavailable = () => {
    document.documentElement.dataset.releaseMetadata = "unavailable";
    const note = document.querySelector("[data-release-note]");
    if (note) note.textContent = "Live release metadata is unavailable; showing the built-in release snapshot.";
  };

  const updateProofMetadata = (receipt) => {
    const result = receipt?.result;
    if (!result || !Array.isArray(result.actualPaths)) return;
    setText("[data-proof-status]", result.coverage);
    setText("[data-proof-final]", result.actualPaths.length);
    setText("[data-proof-reviewed]", result.reviewedPaths?.length);
    setText("[data-proof-path]", result.unreviewedPaths?.[0]);
    setText("[data-proof-action]", result.finding?.nextAction);
    document.documentElement.dataset.proofMetadata = "loaded";
  };

  fetch("./release.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("Release metadata unavailable");
      return response.json();
    })
    .then(updateReleaseMetadata)
    .catch(markReleaseMetadataUnavailable);

  fetch("./proof/coverage-gap/receipt.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("Proof metadata unavailable");
      return response.json();
    })
    .then(updateProofMetadata)
    .catch(() => {
      document.documentElement.dataset.proofMetadata = "unavailable";
    });

  function initShareSpecPage() {
    const form = document.querySelector("[data-share-form]");
    const input = document.querySelector("[data-share-input]");
    const status = document.querySelector("[data-share-status]");
    const shareLink = document.querySelector("[data-share-link]");
    const result = document.querySelector("[data-share-result]");
    if (!form || !input || !status || !shareLink || !result) return;

    const setStatus = (message, state = "idle") => {
      status.textContent = message;
      status.dataset.state = state;
    };

    const lookup = async (value) => {
      result.hidden = true;
      result.replaceChildren();
      shareLink.hidden = true;
      shareLink.replaceChildren();
      setStatus("Checking the source and looking for a root SPEC.md…", "loading");
      try {
        const { parseShareInput, parseSpecSource } = await import("/spec-model.mjs");
        const route = parseShareInput(value);
        if (!["gist", "repo"].includes(route.kind)) throw createSpecError("route_error", route.reason);
        const resolved = await resolveSpecSource(route);
        const model = parseSpecSource(resolved.sourceText, resolved.filename);
        renderShareResult(result, route, resolved, model);
        renderShareLink(shareLink, route);
        setStatus("Ready — your share link is generated.", "ready");
      } catch (error) {
        renderShareError(result, error);
        setStatus(error?.message || "The source could not be opened.", "error");
      }
    };

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      lookup(input.value);
    });
    for (const example of document.querySelectorAll("[data-share-example]")) {
      example.addEventListener("click", () => {
        const value = example.getAttribute("data-share-value") || "";
        input.value = value;
        lookup(value);
      });
    }

    const initialSource = new URLSearchParams(window.location.search).get("source");
    if (initialSource) {
      input.value = initialSource;
      lookup(initialSource);
    }
  }

  function renderShareResult(root, route, resolved, model) {
    const shareUrl = new URL(route.canonicalPath, window.location.origin).href;
    const panel = createElement("section", "share-result-panel");
    panel.append(
      createElement("p", "section-label", "Ready to share"),
      createElement("h2", "share-result-title", model.title),
      createElement("p", "share-result-summary", model.summary),
    );

    const details = createElement("div", "share-result-details");
    details.append(
      createShareDetail("SOURCE", resolved.sourceLabel),
      createShareDetail("TYPE", resolved.visibility),
      createShareDetail("SIZE", `${model.sourceLineCount} lines · ${model.wordCount} words`),
    );
    panel.append(details);

    const actions = createElement("div", "share-result-actions");
    actions.append(
      createLink("View spec", shareUrl, "button button-primary"),
      createLink("Open source", resolved.sourceUrl, "button button-secondary", true),
    );
    const agentPrompt = route.kind === "gist"
      ? createCodingAgentPrompt(shareUrl, resolved, model)
      : null;
    if (agentPrompt) {
      actions.append(createCopyButton(agentPrompt, "Copy coding-agent prompt"));
    }
    panel.append(actions);
    if (agentPrompt) panel.append(createAgentPromptPreview(agentPrompt));

    const preview = createElement("div", "share-preview");
    preview.append(createElement("p", "share-preview-label", "What the page will show"));
    const previewGrid = createElement("div", "share-preview-grid");
    previewGrid.append(
      createSharePreview("Key features", model.keyFeatures, "The strongest list-shaped signals."),
      createSharePreview("Recommended path", model.flow, "The first ordered sequence."),
    );
    preview.append(previewGrid);
    panel.append(preview, createElement("p", "share-result-note", resolved.sourceNote));
    root.hidden = false;
    root.append(panel);
    wireCopyButtons(root);
  }

  function createCodingAgentPrompt(shareUrl, resolved, model) {
    return [
      "/goal",
      "",
      "Implement the product defined by this SpecPort handoff and prove the result with evidence.",
      "",
      "SPEC ENTRY POINT",
      "SpecPort share URL: " + shareUrl,
      "Exact GitHub Gist source: " + resolved.sourceUrl,
      "Spec title: " + model.title,
      "",
      "WORKFLOW",
      "1. Install the published SpecPort CLI in the target repository:",
      "   npm install --save-dev @specport/specport@latest",
      "2. Pull and read the complete spec from the SpecPort share URL above. Preserve its source identity and provenance; do not replace requirements with a summary. If the source cannot be fetched, stop and report the exact blocker.",
      "3. Before coding, extract the outcome, non-goals, constraints, acceptance criteria, verification requirements, risks, and open decisions. Treat draft or unaccepted status as a human decision gate; do not invent approval or ship authority.",
      "4. Implement the smallest vertical slice that satisfies the accepted scope. Preserve explicit safety, privacy, accessibility, failure, and rollback boundaries. Do not broaden the product or claim guarantees that are not evidenced.",
      "5. Validate the implementation progressively:",
      "   - npx --no-install specport spec check SPEC.md --json",
      "   - run the repository's formatter, lint, typecheck, unit, integration, end-to-end, and build checks",
      "   - npx --no-install specport coverage .",
      "   - after human acceptance, create and check SPEC.lock with specport spec lock and specport spec drift",
      "   - exercise the real user flow manually and preserve screenshots, logs, fixtures, and command output",
      "6. Review for regressions, security and privacy issues, accessibility failures, stale documentation, performance problems, unsafe side effects, and incomplete failure handling. Re-run affected checks after every fix.",
      "7. Report exact files changed, every command and result, runtime or manual evidence, known gaps, unresolved decisions, and whether the work is ready for human approval. Do not claim done from compilation, a passing unit test, or an agent summary alone.",
    ].join("\n");
  }

  function createAgentPromptPreview(prompt, options = {}) {
    const details = createElement("details", options.className || "share-agent-prompt");
    details.open = options.open === true;
    details.append(createElement("summary", "share-agent-prompt-summary", "Show the coding-agent handoff"));
    const body = createElement("div", "share-agent-prompt-body");
    body.append(
      createElement("p", "share-preview-label", "COPY THIS PROMPT"),
      createElement("p", "share-agent-prompt-intro", "Installs SpecPort, pulls this Gist-backed spec, implements the contract, and reports verification evidence."),
    );
    const code = createElement("pre", "share-agent-prompt-text", prompt);
    code.tabIndex = 0;
    body.append(code);
    details.append(body);
    return details;
  }

  function renderShareLink(root, route) {
    const shareUrl = new URL(route.canonicalPath, window.location.origin).href;
    const linkInput = createElement("input", "share-quick-link-input");
    linkInput.type = "text";
    linkInput.value = shareUrl;
    linkInput.readOnly = true;
    linkInput.setAttribute("aria-label", "Generated SpecPort share link");
    const linkRow = createElement("div", "share-quick-link-row");
    linkRow.append(linkInput, createCopyButton(shareUrl, "Copy link"));
    root.append(createElement("p", "share-link-label", "Generated SpecPort link"), linkRow);
    root.hidden = false;
    wireCopyButtons(root);
  }

  function createShareDetail(label, value) {
    const detail = createElement("div", "share-result-detail");
    detail.append(createElement("span", "share-result-detail-label", label), createElement("strong", "share-result-detail-value", value));
    return detail;
  }

  function createSharePreview(title, items, fallback) {
    const preview = createElement("article", "share-preview-card");
    preview.append(createElement("h3", "share-preview-title", title));
    if (items.length) preview.append(createList(items.slice(0, 3), "share-preview-list"));
    else preview.append(createElement("p", "share-preview-fallback", fallback));
    return preview;
  }

  function renderShareError(root, error) {
    root.hidden = false;
    root.replaceChildren();
    const panel = createElement("section", "share-result-panel share-result-error");
    panel.append(
      createElement("p", "section-label", "Could not open source"),
      createElement("h2", "share-result-title", "No share link yet."),
      createElement("p", "share-result-summary", error?.message || "Check the URL and try again."),
    );
    root.append(panel);
  }

  async function renderSpecRoute() {
    const root = document.querySelector("[data-spec-route-root]");
    if (!root) throw new Error("The spec route shell is missing.");
    const { parseShareRoute, parseSpecSource } = await import("/spec-model.mjs");
    const developmentRoute = window.location.pathname.endsWith("/404.html")
      ? new URLSearchParams(window.location.search).get("route")
      : null;
    const route = parseShareRoute(developmentRoute || window.location.pathname);
    if (!["gist", "repo"].includes(route.kind)) {
      renderSpecError(root, route, new Error(route.reason || "This is not a shared spec link."));
      return;
    }
    document.title = "Loading shared spec · SpecPort";
    const resolved = await resolveSpecSource(route);
    renderSpecPage(root, route, resolved, parseSpecSource(resolved.sourceText, resolved.filename));
  }

  async function fetchGist(gistId) {
    const response = await fetchWithTimeout(`https://api.github.com/gists/${gistId}`, { headers: { Accept: "application/vnd.github+json" } });
    if (!response.ok) throw await responseError(response, "gist");
    try {
      return await response.json();
    } catch {
      throw createSpecError("parse_error", "GitHub returned an unreadable Gist response.");
    }
  }

  async function readGistFile(file) {
    if (typeof file.content === "string" && !file.truncated) return file.content;
    if (typeof file.raw_url !== "string" || !isAllowedSourceUrl(file.raw_url, ["gist.githubusercontent.com"])) throw createSpecError("unsafe_redirect", "The selected source file is not a permitted GitHub Gist file.");
    const response = await fetchWithTimeout(file.raw_url, { headers: { Accept: "text/plain" } });
    if (!response.ok) throw await responseError(response, "source");
    return response.text();
  }

  async function readSingleGistFile(route) {
    const rawUrl = `https://gist.githubusercontent.com/${encodeURIComponent(route.owner)}/${route.gistId}/raw`;
    if (!isAllowedSourceUrl(rawUrl, ["gist.githubusercontent.com"])) throw createSpecError("unsafe_redirect", "The raw Gist source is not a permitted GitHub file.");
    const response = await fetchWithTimeout(rawUrl, { headers: { Accept: "text/plain" } });
    if (!response.ok) throw await responseError(response, "gist");
    return response.text();
  }

  function selectSpecFile(files) {
    if (!files || typeof files !== "object") return null;
    const candidates = Object.values(files).filter((file) => file && typeof file === "object");
    return candidates.find((file) => file.filename === "SPEC.md" && isTextFile(file)) || candidates.find(isTextFile) || null;
  }

  function isTextFile(file) {
    const filename = typeof file.filename === "string" ? file.filename : "";
    const type = typeof file.type === "string" ? file.type : "";
    return type.startsWith("text/") || /(?:^|\.)(?:md|markdown|txt|text|rst|json|ya?ml|toml|xml|html|css|js|ts|tsx|jsx|py|sh)$/i.test(filename);
  }

  function isAllowedSourceUrl(value, allowedHosts) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && allowedHosts.includes(url.hostname);
    } catch {
      return false;
    }
  }

  async function fetchRepositorySpec(route) {
    const response = await fetchWithTimeout(
      `https://api.github.com/repos/${encodeURIComponent(route.owner)}/${encodeURIComponent(route.repository)}/contents/SPEC.md`,
      { headers: { Accept: "application/vnd.github+json" } },
    );
    if (!response.ok) throw await responseError(response, "repository");
    let file;
    try {
      file = await response.json();
    } catch {
      throw createSpecError("parse_error", "GitHub returned an unreadable repository response.");
    }
    if (!file || Array.isArray(file) || file.type !== "file" || file.name !== "SPEC.md") {
      throw createSpecError("non_text", "This repository does not expose a root SPEC.md file.");
    }
    return file;
  }

  async function readRepositoryFile(file) {
    if (typeof file.content === "string" && file.encoding === "base64") {
      try {
        return decodeBase64Utf8(file.content);
      } catch {
        throw createSpecError("parse_error", "The repository SPEC.md could not be decoded.");
      }
    }
    if (typeof file.download_url !== "string" || !isAllowedSourceUrl(file.download_url, ["raw.githubusercontent.com"])) {
      throw createSpecError("unsafe_redirect", "The repository source is not a permitted GitHub raw file.");
    }
    const response = await fetchWithTimeout(file.download_url, { headers: { Accept: "text/plain" } });
    if (!response.ok) throw await responseError(response, "source");
    return response.text();
  }

  function decodeBase64Utf8(value) {
    const binary = window.atob(String(value).replace(/\s+/g, ""));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  }

  async function resolveSpecSource(route) {
    if (route.kind === "gist") {
      let gist;
      try {
        gist = await fetchGist(route.gistId);
      } catch (error) {
        if (!["fetch_error", "network_error"].includes(error?.code)) throw error;
        return {
          sourceText: await readSingleGistFile(route),
          filename: "Gist.md",
          sourceLabel: "Gist.md",
          sourceUrl: canonicalGistUrl(null, route),
          visibility: "PUBLIC GIST",
          updatedAt: null,
          sourceNote: "GitHub did not return Gist file metadata, so the single raw Markdown file is shown as data. SpecPort does not rewrite the source or send it to a SpecPort service.",
        };
      }
      const file = selectSpecFile(gist.files);
      if (!file) throw createSpecError("non_text", "This Gist does not contain a readable text or Markdown file.");
      return {
        sourceText: await readGistFile(file),
        filename: file.filename || "SPEC.md",
        sourceLabel: file.filename || "SPEC.md",
        sourceUrl: canonicalGistUrl(gist, route),
        visibility: gist.public === false ? "SECRET GIST" : "PUBLIC GIST",
        updatedAt: gist.updated_at,
        sourceNote: file.filename === "SPEC.md"
          ? "The root SPEC.md is shown as data. SpecPort does not rewrite the source or send it to a SpecPort service."
          : "The first readable Gist file is shown as data. SpecPort does not rewrite the source or send it to a SpecPort service.",
      };
    }

    const file = await fetchRepositorySpec(route);
    return {
      sourceText: await readRepositoryFile(file),
      filename: "SPEC.md",
      sourceLabel: `${route.owner}/${route.repository}/SPEC.md`,
      sourceUrl: canonicalRepositorySpecUrl(file, route),
      visibility: "PUBLIC REPOSITORY",
      updatedAt: null,
      sourceNote: "The repository root SPEC.md is shown as data. SpecPort does not rewrite the source or send it to a SpecPort service.",
    };
  }

  async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    try {
      return await fetch(url, { ...options, credentials: "omit", cache: "no-store", redirect: "error", signal: controller.signal });
    } catch (error) {
      if (error?.name === "AbortError") throw createSpecError("timeout", "GitHub took too long to return this source.");
      throw createSpecError("network_error", "GitHub could not be reached from this browser.");
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function responseError(response, resource) {
    if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") return createSpecError("rate_limited", "GitHub is rate limiting this browser. Try again later.");
    if (response.status === 404) {
      if (resource === "gist") return createSpecError("not_found", "This Gist is not reachable from the public web. It may be private, deleted, or the link may be wrong.");
      if (resource === "repository") return createSpecError("not_found", "This repository is not reachable from the public web, or it does not contain a root SPEC.md file.");
      return createSpecError("not_found", "The source file is no longer available from GitHub.");
    }
    return createSpecError("fetch_error", `GitHub returned HTTP ${response.status} for this ${resource}.`);
  }

  function createSpecError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function renderSpecPage(root, route, resolved, model) {
    root.replaceChildren();
    document.body.classList.add("spec-page");
    const { sourceLabel, sourceUrl, visibility } = resolved;
    const shareUrl = new URL(route.canonicalPath, window.location.origin).href;
    const agentPrompt = route.kind === "gist"
      ? createCodingAgentPrompt(shareUrl, resolved, model)
      : null;
    const page = createElement("div", "spec-page-content");
    const hero = createElement("section", "spec-hero page-shell");
    const heroCopy = createElement("div", "spec-hero-copy");
    const label = createElement("p", "product-label", "Shared spec · parsed locally");
    label.prepend(createElement("span", "signal-dot"));
    label.querySelector(".signal-dot").setAttribute("aria-hidden", "true");
    heroCopy.append(label, createElement("h1", "spec-title", model.title), createElement("p", "spec-lede", model.summary));
    const meta = createElement("ul", "spec-meta");
    for (const item of [["SOURCE", sourceLabel], ["VISIBILITY", visibility], ["SIZE", `${model.sourceLineCount} lines · ${model.wordCount} words`]]) {
      const listItem = createElement("li");
      listItem.append(createElement("span", "spec-meta-label", item[0]), createElement("strong", "spec-meta-value", item[1]));
      meta.append(listItem);
    }
    heroCopy.append(meta);
    const actions = createElement("div", "spec-actions");
    actions.append(createLink("Back to SpecPort", "/", "button button-primary"), createCopyButton(shareUrl, "Copy share link"), createLink("Open source", sourceUrl, "button button-secondary", true));
    if (agentPrompt) actions.append(createCopyButton(agentPrompt, "Copy coding-agent prompt"));
    heroCopy.append(actions, createElement("p", "spec-source-note", resolved.sourceNote));
    if (agentPrompt) heroCopy.append(createAgentPromptPreview(agentPrompt, { className: "spec-agent-prompt", open: true }));
    const sourceCard = createElement("aside", "spec-source-card");
    sourceCard.append(createElement("p", "receipt-kicker", "Source map"), createElement("h2", "spec-source-card-title", "From idea to handoff."), createElement("p", "spec-source-card-copy", "A deterministic view of what the file declares—not a generated product claim."));
    hero.append(heroCopy, sourceCard);
    page.append(hero);

    const mapSection = createSection("spec-section", "spec-map-section", "Spec map", "A readable shape for the source file.");
    const map = createElement("div", "spec-map");
    const mapNodes = [["01", "SOURCE", sourceLabel, `${model.sourceLineCount} lines`], ["02", "INTENT", "The opening summary", model.summary], ["03", "SIGNALS", "Key features", `${model.keyFeatures.length} parsed list items`], ["04", "PROOF", "Acceptance / decision", `${model.acceptance.length} parsed items`]];
    for (const [number, kicker, title, copy] of mapNodes) {
      const node = createElement("article", "spec-map-node");
      node.append(createElement("span", "spec-map-number", number), createElement("p", "spec-map-kicker", kicker), createElement("h3", "spec-map-title", title), createElement("p", "spec-map-copy", copy));
      map.append(node);
    }
    mapSection.append(map);
    page.append(mapSection);

    const summarySection = createSection("spec-section", "spec-summary-section", "Key features", "The strongest list-shaped signals found in the first file.");
    const summaryGrid = createElement("div", "spec-panel-grid");
    summaryGrid.append(createListPanel("Key features", model.keyFeatures, model.featureSource || "First available list", "No feature list was declared in the source."), createListPanel("Recommended path", model.flow, model.flowSource || "First numbered list", "No ordered path was declared in the source."), createListPanel("Constraints & guardrails", model.constraints, model.constraintSource || "Declared constraints", "No constraint list was declared in the source."), createListPanel("Acceptance / decision", model.acceptance, model.acceptanceSource || "Declared acceptance", "No acceptance or decision list was declared in the source."));
    summarySection.append(summaryGrid);
    page.append(summarySection);

    if (model.supplementalSections.length) {
      const additionalSection = createSection("spec-section spec-section-muted", "spec-additional-section", "Additional source sections", "Headings and notes that do not fit the primary map are kept visible here.");
      const additionalGrid = createElement("div", "spec-additional-grid");
      for (const section of model.supplementalSections) {
        const card = createElement("article", "spec-additional-card");
        card.append(createElement("p", "spec-card-kicker", "From source"), createElement("h3", "spec-additional-title", section.heading));
        if (section.paragraph) card.append(createElement("p", "spec-additional-copy", section.paragraph));
        if (section.items.length) card.append(createList(section.items, "spec-list-compact"));
        additionalGrid.append(card);
      }
      additionalSection.append(additionalGrid);
      page.append(additionalSection);
    }

    const outlineSection = createSection("spec-section", "spec-outline-section", "Source outline", "The headings found in the first file, preserved in order.");
    const outline = createElement("ol", "spec-outline");
    if (model.outline.length) {
      for (const heading of model.outline) {
        const item = createElement("li", `spec-outline-level-${Math.min(6, heading.level)}`);
        item.append(createElement("span", "spec-outline-level", `H${heading.level}`), createElement("span", "spec-outline-text", heading.text));
        outline.append(item);
      }
    } else outline.append(createElement("li", "spec-fallback", "No Markdown headings were declared; the raw source remains below."));
    outlineSection.append(outline);
    page.append(outlineSection);

    const rawSection = createSection("spec-section", "spec-raw-section", "First source file", `${sourceLabel} · read-only text preview`);
    const rawCard = createElement("div", "spec-raw-card");
    const rawHeader = createElement("div", "spec-raw-header");
    rawHeader.append(createElement("span", "spec-raw-file", sourceLabel), createCopyButton(model.sourceText, "Copy source"));
    rawCard.append(rawHeader);
    const pre = createElement("pre", "spec-source-code");
    pre.tabIndex = 0;
    pre.append(createElement("code", "", model.sourceText));
    rawCard.append(pre);
    if (model.truncated) rawCard.append(createElement("p", "spec-truncation-note", "The source exceeded the safe display limit; showing the beginning only."));
    rawSection.append(rawCard);
    page.append(rawSection);
    page.append(createElement("p", "spec-boundary section-shell", "Parsed from the exact first text file returned by GitHub. The visualization is a reading aid, not an approval, implementation, or ship decision."));
    root.append(page);
    wireCopyButtons(root);
    updateSpecMetadata(model, route, resolved);
  }

  function renderSpecError(root, route, error) {
    root.replaceChildren();
    document.body.classList.add("spec-page");
    const code = error?.code || "route_error";
    const title = code === "not_found" ? "This shared spec is unavailable." : "We could not open this shared spec.";
    const copy = error?.message || "The link is not a valid SpecPort share link.";
    document.title = `${title} · SpecPort`;
    const section = createElement("section", "spec-error page-shell");
    const label = createElement("p", "product-label", "SpecPort · share link");
    label.prepend(createElement("span", "signal-dot"));
    label.querySelector(".signal-dot").setAttribute("aria-hidden", "true");
    section.append(label, createElement("h1", "spec-title", title), createElement("p", "spec-lede", copy));
    if (route?.canonicalPath) section.append(createElement("p", "spec-error-path", route.canonicalPath));
    const actions = createElement("div", "spec-actions");
    actions.append(createLink("Back to SpecPort", "/", "button button-primary"));
    if (route?.kind === "gist") actions.append(createLink("Open source Gist", `https://gist.github.com/${encodeURIComponent(route.owner)}/${route.gistId}`, "button button-secondary", true));
    if (route?.kind === "repo") actions.append(createLink("Open GitHub repository", `https://github.com/${encodeURIComponent(route.owner)}/${encodeURIComponent(route.repository)}`, "button button-secondary", true));
    section.append(actions, createElement("p", "spec-source-note", "Only public GitHub sources that the browser can fetch without credentials can be shared this way. Check the link and make sure the source contains a root SPEC.md."));
    root.append(section);
  }

  function updateSpecMetadata(model, route, resolved) {
    const { sourceLabel, sourceUrl, visibility, updatedAt } = resolved;
    const title = `${model.title} · SpecPort`;
    const description = `${model.summary} Shared from ${sourceLabel}.`;
    document.title = title;
    setMeta("description", description);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:url", `${window.location.origin}${route.canonicalPath}`, "property");
    setMeta("og:type", "article", "property");
    setMeta("twitter:card", "summary", "name");
    let canonical = document.querySelector("link[rel=canonical]");
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = `${window.location.origin}${route.canonicalPath}`;
    document.documentElement.dataset.specVisibility = visibility.toLowerCase().replace(/\s+/g, "-");
    document.documentElement.dataset.specSource = sourceUrl;
    document.documentElement.dataset.specKind = route.kind;
    if (updatedAt) document.documentElement.dataset.specUpdated = updatedAt;
  }

  function canonicalGistUrl(gist, route) {
    if (typeof gist?.html_url === "string") {
      try {
        const url = new URL(gist.html_url);
        if (url.protocol === "https:" && url.hostname === "gist.github.com") return url.href;
      } catch {
        // Fall through to the API owner or the validated route owner.
      }
    }
    const owner = typeof gist?.owner?.login === "string" ? gist.owner.login : route.owner;
    return `https://gist.github.com/${encodeURIComponent(owner)}/${route.gistId}`;
  }

  function canonicalRepositorySpecUrl(file, route) {
    if (typeof file?.html_url === "string") {
      try {
        const url = new URL(file.html_url);
        if (url.protocol === "https:" && url.hostname === "github.com") return url.href;
      } catch {
        // Fall through to the stable repository source path.
      }
    }
    return `https://github.com/${encodeURIComponent(route.owner)}/${encodeURIComponent(route.repository)}/blob/main/SPEC.md`;
  }

  function setMeta(key, value, attribute = "name") {
    let node = document.querySelector(`meta[${attribute}="${key}"]`);
    if (!node) {
      node = document.createElement("meta");
      node.setAttribute(attribute, key);
      document.head.append(node);
    }
    node.setAttribute("content", value);
  }

  function createSection(className, id, label, title) {
    const section = createElement("section", className);
    section.id = id;
    section.setAttribute("aria-labelledby", `${id}-title`);
    const intro = createElement("div", "spec-section-intro");
    intro.append(createElement("p", "section-label", label), createElement("h2", "spec-section-title", title));
    intro.lastChild.id = `${id}-title`;
    section.append(intro);
    return section;
  }

  function createListPanel(title, items, source, fallback) {
    const panel = createElement("article", "spec-panel");
    panel.append(createElement("p", "spec-card-kicker", source), createElement("h3", "spec-panel-title", title));
    panel.append(items.length ? createList(items) : createElement("p", "spec-fallback", fallback));
    return panel;
  }

  function createList(items, className = "spec-list") {
    const list = createElement("ul", className);
    for (const item of items) list.append(createElement("li", "", item));
    return list;
  }

  function createCopyButton(value, label) {
    const button = createElement("button", "button button-secondary");
    button.type = "button";
    button.dataset.copy = value;
    button.setAttribute("aria-label", label);
    button.append(createElement("span", "", label));
    return button;
  }

  function createLink(label, href, className, external = false) {
    const link = createElement("a", className, label);
    link.href = href;
    if (external) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    return link;
  }

  function createElement(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
})();
