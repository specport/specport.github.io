(() => {
  const isSpecRoute = document.body?.dataset.view === "spec";

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

  wireCopyButtons();

  const setText = (selector, value) => {
    if (value === undefined || value === null || value === "") return;
    for (const node of document.querySelectorAll(selector)) node.textContent = String(value);
  };

  const updateReleaseMetadata = (release) => {
    if (!release || typeof release !== "object") return;
    const status = typeof release.publicationStatus === "string" ? release.publicationStatus : null;
    setText("[data-release-status]", status);
    setText("[data-release-version]", release.version);
    setText("[data-release-license]", release.license);
    setText("[data-release-bin]", release.bin);
    setText("[data-release-commit]", release.commit);
    if (typeof release.engine === "string") setText("[data-release-engine]", release.engine.replace(/^>=/, "\u2265"));
    if (status) {
      document.documentElement.dataset.publicationStatus = status;
      for (const node of document.querySelectorAll("[data-release-state]")) {
        node.classList.toggle("release-state-published", status === "PUBLISHED");
        node.classList.toggle("release-state-warning", status !== "PUBLISHED");
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

  async function renderSpecRoute() {
    const root = document.querySelector("[data-spec-route-root]");
    if (!root) throw new Error("The spec route shell is missing.");
    const { parseGistRoute, parseSpecSource } = await import("/spec-model.mjs");
    const developmentRoute = window.location.pathname.endsWith("/404.html")
      ? new URLSearchParams(window.location.search).get("route")
      : null;
    const route = parseGistRoute(developmentRoute || window.location.pathname);
    if (route.kind !== "gist") {
      renderSpecError(root, route, new Error(route.reason || "This is not a shared spec link."));
      return;
    }
    document.title = "Loading shared spec · SpecPort";
    const gist = await fetchGist(route.gistId);
    const file = selectSpecFile(gist.files);
    if (!file) throw createSpecError("non_text", "This Gist does not contain a readable text or Markdown file.");
    const source = await readGistFile(file);
    renderSpecPage(root, route, gist, file, parseSpecSource(source, file.filename || "SPEC.md"));
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
    if (typeof file.raw_url !== "string" || !isAllowedRawUrl(file.raw_url)) throw createSpecError("unsafe_redirect", "The selected source file is not a permitted GitHub Gist file.");
    const response = await fetchWithTimeout(file.raw_url, { headers: { Accept: "text/plain" } });
    if (!response.ok) throw await responseError(response, "source");
    return response.text();
  }

  function selectSpecFile(files) {
    if (!files || typeof files !== "object") return null;
    return Object.values(files).filter((file) => file && typeof file === "object").find(isTextFile) || null;
  }

  function isTextFile(file) {
    const filename = typeof file.filename === "string" ? file.filename : "";
    const type = typeof file.type === "string" ? file.type : "";
    return type.startsWith("text/") || /(?:^|\.)(?:md|markdown|txt|text|rst|json|ya?ml|toml|xml|html|css|js|ts|tsx|jsx|py|sh)$/i.test(filename);
  }

  function isAllowedRawUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && (url.hostname === "gist.githubusercontent.com" || url.hostname.endsWith(".gist.githubusercontent.com"));
    } catch {
      return false;
    }
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
    if (response.status === 404) return createSpecError("not_found", resource === "gist" ? "This Gist is not reachable from the public web. It may be private, deleted, or the link may be wrong." : "The first source file is no longer available from GitHub.");
    return createSpecError("fetch_error", `GitHub returned HTTP ${response.status} for this ${resource}.`);
  }

  function createSpecError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function renderSpecPage(root, route, gist, file, model) {
    root.replaceChildren();
    document.body.classList.add("spec-page");
    const visibility = gist.public === false ? "SECRET GIST" : "PUBLIC GIST";
    const gistUrl = canonicalGistUrl(gist, route);
    const sourceLabel = file.filename || "SPEC.md";
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
    actions.append(createLink("Back to SpecPort", "/", "button button-primary"), createCopyButton(window.location.href, "Copy share link"), createLink("Open source Gist", gistUrl, "button button-secondary", true));
    heroCopy.append(actions, createElement("p", "spec-source-note", "The first readable file is shown as data. SpecPort does not rewrite the source or send it to a SpecPort service."));
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
    updateSpecMetadata(model, route, gist, sourceLabel, gistUrl, visibility);
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
    section.append(actions, createElement("p", "spec-source-note", "Only a GitHub Gist that the browser can fetch without credentials can be shared this way. Check the owner, id, and Gist visibility."));
    root.append(section);
  }

  function updateSpecMetadata(model, route, gist, sourceLabel, gistUrl, visibility) {
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
    document.documentElement.dataset.specSource = gistUrl;
    if (gist.updated_at) document.documentElement.dataset.specUpdated = gist.updated_at;
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
