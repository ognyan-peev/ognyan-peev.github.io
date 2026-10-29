(() => {
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const line = 90;
  const marker = p => (p.textContent || '').slice(0, 160);

  function capture(text) {
    const nodes = Array.from(text.children);
    if (!nodes.length) return null;
    let index = nodes.findIndex(p => p.getBoundingClientRect().bottom > line);
    if (index < 0) index = nodes.length - 1;
    const rect = nodes[index].getBoundingClientRect();
    return { paragraph: index, text: marker(nodes[index]), fraction: clamp((line - rect.top) / Math.max(1, rect.height), 0, 1) };
  }

  function target(text, anchor) {
    if (!anchor || !Number.isInteger(anchor.paragraph)) return null;
    const nodes = Array.from(text.children);
    let index = clamp(anchor.paragraph, 0, nodes.length - 1);
    if (!nodes.length) return null;
    if (anchor.text && marker(nodes[index]) !== anchor.text) {
      const matches = nodes.map((p, i) => marker(p) === anchor.text ? i : -1).filter(i => i >= 0);
      if (!matches.length) return null;
      index = matches.reduce((best, i) => Math.abs(i - index) < Math.abs(best - index) ? i : best, matches[0]);
    }
    const rect = nodes[index].getBoundingClientRect();
    const fraction = clamp(Number(anchor.fraction) || 0, 0, 1);
    return Math.max(0, window.scrollY + rect.top + rect.height * fraction - line);
  }

  async function migrate(work, data, section, saved, text) {
    if (work !== 'svetite-zemi' || section !== 5 || saved.revision === data.revision || saved.ratio <= .015) return saved.anchor || null;
    // Only the revision published before 21 October used percentage-only state.
    if (saved.revision) return saved.anchor || null;
    if (!window.WORK_PREVIOUS) {
      try {
        window.WORK_PREVIOUS = await window.readerGetMigration();
      } catch (_) { return null; }
    }
    const old = window.WORK_PREVIOUS;
    if (!old || old.revision !== data.revision) return null;
    await Promise.resolve(document.fonts?.ready);
    const copy = document.createElement('section');
    copy.className = text.className;
    copy.setAttribute('aria-hidden', 'true');
    Object.assign(copy.style, { position: 'absolute', top: '0', left: '0', visibility: 'hidden', pointerEvents: 'none', width: `${text.getBoundingClientRect().width}px` });
    old.paragraphs.forEach(value => {
      const p = document.createElement('p');
      p.textContent = value;
      copy.appendChild(p);
    });
    text.parentElement.appendChild(copy);
    try {
      const root = copy.getBoundingClientRect();
      const point = Math.max(0, root.height - window.innerHeight + 170) * clamp(saved.ratio, 0, 1);
      const children = Array.from(copy.children);
      let index = children.findIndex(p => p.getBoundingClientRect().bottom - root.top > point);
      if (index < 0) index = children.length - 1;
      const rect = children[index].getBoundingClientRect();
      const mapped = old.map[index];
      if (!mapped || !data.sections[section].paragraphs[mapped.paragraph]) return null;
      return {
        paragraph: mapped.paragraph,
        text: data.sections[section].paragraphs[mapped.paragraph].slice(0, 160),
        fraction: mapped.same ? clamp((point - (rect.top - root.top)) / Math.max(1, rect.height), 0, 1) : 0
      };
    } finally { copy.remove(); }
  }

  window.ReadingPosition = { capture, target, migrate };
})();

