(() => {
  const copyButtons = document.querySelectorAll("[data-copy]");

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

  for (const button of copyButtons) {
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

  const setText = (selector, value) => {
    if (value === undefined || value === null || value === "") return;
    for (const node of document.querySelectorAll(selector)) {
      node.textContent = String(value);
    }
  };

  const updateReleaseMetadata = (release) => {
    if (!release || typeof release !== "object") return;

    const status = typeof release.publicationStatus === "string"
      ? release.publicationStatus
      : null;
    setText("[data-release-status]", status);
    setText("[data-release-version]", release.version);
    setText("[data-release-license]", release.license);
    setText("[data-release-bin]", release.bin);
    setText("[data-release-commit]", release.commit);

    if (typeof release.engine === "string") {
      setText("[data-release-engine]", release.engine.replace(/^>=/, "\u2265"));
    }

    if (status) {
      document.documentElement.dataset.publicationStatus = status;
      for (const node of document.querySelectorAll("[data-release-state]")) {
        node.classList.toggle("release-state-published", status === "PUBLISHED");
        node.classList.toggle("release-state-warning", status !== "PUBLISHED");
      }
    }

    const note = document.querySelector("[data-release-note]");
    if (note) {
      note.textContent = status === "PUBLISHED"
        ? "Release snapshot verified from the exact npm version and tarball."
        : `Release snapshot reports ${status || "an unknown package state"}; inspect the release record before installing.`;
    }

    document.documentElement.dataset.releaseMetadata = "loaded";
  };

  const markReleaseMetadataUnavailable = () => {
    document.documentElement.dataset.releaseMetadata = "unavailable";
    const note = document.querySelector("[data-release-note]");
    if (note) {
      note.textContent = "Live release metadata is unavailable; showing the built-in release snapshot.";
    }
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
})();
