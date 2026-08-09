(() => {
  const params = new URLSearchParams(location.search);
  const work = params.get("work") || "blue-eyes";
  const explicitSection = params.has("section");
  const stateKey = `reader_state_${work}`;
  const legacyKey = `progress_${work}`;
  let data = null;
  let section = 0;
  let size = parseInt(localStorage.getItem("reader_size") || "20", 10);
  let pendingRestoreRatio = 0;
  let scrollSaveTimer = null;
  let restoring = false;

  const $ = id => document.getElementById(id);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const notify = msg => {
    $("notice").textContent = msg;
    $("notice").classList.add("show");
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => $("notice").classList.remove("show"), 2400);
  };

  function readSavedState() {
    try {
      const raw = localStorage.getItem(stateKey);
      if (raw) {
        const saved = JSON.parse(raw);
        return {
          section: Number.isFinite(Number(saved.section)) ? Number(saved.section) : 0,
          ratio: Number.isFinite(Number(saved.ratio)) ? clamp(Number(saved.ratio), 0, 1) : 0
        };
      }
    } catch (e) {}
    return {
      section: Math.max(0, parseInt(localStorage.getItem(legacyKey) || "0", 10) || 0),
      ratio: 0
    };
  }

  function textScrollRatio() {
    const text = $("readerText");
    if (!text || !data) return 0;
    const start = text.getBoundingClientRect().top + window.scrollY - 90;
    const end = text.getBoundingClientRect().bottom + window.scrollY - window.innerHeight + 80;
    if (end <= start) return window.scrollY > start ? 1 : 0;
    return clamp((window.scrollY - start) / (end - start), 0, 1);
  }

  function saveState() {
    if (!data || restoring) return;
    const ratio = textScrollRatio();
    const payload = { section, ratio, updatedAt: Date.now() };
    localStorage.setItem(stateKey, JSON.stringify(payload));
    localStorage.setItem(legacyKey, String(section));
    updateProgressUI(ratio);
  }

  function updateProgressUI(ratio = textScrollRatio()) {
    if (!data) return;
    const chapterNumber = section + 1;
    const total = data.sections.length;
    const chapterPercent = Math.round(clamp(ratio, 0, 1) * 100);
    const totalRatio = clamp((section + ratio) / total, 0, 1);
    $("readingProgressBar").style.width = `${Math.max(1.5, totalRatio * 100)}%`;
    $("readingProgressText").textContent = `Раздел ${chapterNumber} от ${total} • ${chapterPercent}%`;
  }

  function restoreScroll(ratio) {
    const r = clamp(Number(ratio) || 0, 0, 1);
    if (r <= 0.015) {
      window.scrollTo({ top: 0, behavior: "auto" });
      updateProgressUI(0);
      return;
    }
    restoring = true;
    const doRestore = () => {
      const text = $("readerText");
      const start = text.getBoundingClientRect().top + window.scrollY - 90;
      const end = text.getBoundingClientRect().bottom + window.scrollY - window.innerHeight + 80;
      const target = end > start ? start + (end - start) * r : start;
      window.scrollTo({ top: Math.max(0, target), behavior: "auto" });
      updateProgressUI(r);
      restoring = false;
      if (!explicitSection) notify("Продължавате от запазеното място.");
    };
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(doRestore, 60)));
  }

  function chapterLabel(s, i) {
    const fallback = `Част ${i + 1}`;
    return (s.title || "").trim() || fallback;
  }

  function setSection(index, options = {}) {
    if (!data) return;
    const { push = true, restoreRatio = 0, smooth = true } = options;
    section = clamp(index, 0, data.sections.length - 1);
    const s = data.sections[section];
    $("chapterTitle").textContent = s.title || "";
    $("chapterSubtitle").textContent = s.subtitle || "";
    $("chapterSubtitle").style.display = s.subtitle ? "block" : "none";

    const frag = document.createDocumentFragment();
    s.paragraphs.forEach(text => {
      const p = document.createElement("p");
      p.textContent = text;
      frag.appendChild(p);
    });
    $("readerText").replaceChildren(frag);

    $("prevBtn").disabled = section === 0;
    $("nextBtn").disabled = section === data.sections.length - 1;
    $("chapterSelect").value = String(section);
    $("chapterCounter").textContent = `Раздел ${section + 1} от ${data.sections.length}`;

    const nextSection = data.sections[section + 1];
    $("nextBtn").textContent = nextSection ? `Следваща: ${chapterLabel(nextSection, section + 1)} →` : "Край";
    const prevSection = data.sections[section - 1];
    $("prevBtn").textContent = prevSection ? `← ${chapterLabel(prevSection, section - 1)}` : "← Предишна";

    localStorage.setItem(legacyKey, String(section));
    localStorage.setItem(stateKey, JSON.stringify({ section, ratio: restoreRatio || 0, updatedAt: Date.now() }));

    if (push) {
      const u = new URL(location.href);
      u.searchParams.set("section", section);
      history.replaceState({}, "", u);
    }

    window.siteAnalytics?.event('view_section', {
      work,
      section_number: section + 1,
      section_title: s.title || ''
    });

    if (restoreRatio > 0) {
      restoreScroll(restoreRatio);
    } else {
      updateProgressUI(0);
      window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
    }
  }

  function initialize() {
    data = window.WORK_DATA;
    if (!data || !Array.isArray(data.sections) || !data.sections.length) {
      $("readerText").textContent = "Произведението не можа да бъде заредено.";
      return;
    }

    document.title = data.title + " | Огнян Пеев";
    $("toolbarTitle").textContent = data.title;
    $("workTitle").textContent = data.title;
    $("workType").textContent = data.type;
    $("workAuthor").textContent = data.author;

    const saved = readSavedState();
    if (explicitSection) {
      section = clamp(parseInt(params.get("section") || "0", 10) || 0, 0, data.sections.length - 1);
      pendingRestoreRatio = saved.section === section ? saved.ratio : 0;
    } else {
      section = clamp(saved.section, 0, data.sections.length - 1);
      pendingRestoreRatio = saved.ratio;
    }

    const toc = $("tocList");
    const select = $("chapterSelect");
    data.sections.forEach((s, i) => {
      const label = s.subtitle ? `${chapterLabel(s, i)} — ${s.subtitle}` : chapterLabel(s, i);

      const b = document.createElement("button");
      b.textContent = label;
      b.addEventListener("click", () => { setSection(i); closeToc(); });
      toc.appendChild(b);

      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `${i + 1}. ${label}`;
      select.appendChild(opt);
    });

    setSection(section, { push: false, restoreRatio: pendingRestoreRatio, smooth: false });

    // Отчита читател само след общо 5 минути активно време на видима страница.
    let activeSeconds = 0;
    let sentFiveMinutes = false;
    setInterval(() => {
      if (sentFiveMinutes || document.hidden || !document.hasFocus()) return;
      activeSeconds += 1;
      if (activeSeconds >= 300) {
        sentFiveMinutes = true;
        window.siteAnalytics?.event('active_reader_5_minutes', {
          work,
          work_title: data.title,
          section_number: section + 1
        });
      }
    }, 1000);
  }

  const script = document.createElement("script");
  script.src = `assets/data/${work}.js`;
  script.onload = initialize;
  script.onerror = () => { $("readerText").textContent = "Произведението не можа да бъде заредено."; };
  document.head.appendChild(script);

  $("prevBtn").addEventListener("click", () => setSection(section - 1));
  $("nextBtn").addEventListener("click", () => setSection(section + 1));
  $("chapterSelect").addEventListener("change", e => setSection(parseInt(e.target.value, 10) || 0));

  const openToc = () => $("tocPanel").classList.add("open");
  const closeToc = () => $("tocPanel").classList.remove("open");
  $("tocBtn").addEventListener("click", openToc);
  $("tocBtn2").addEventListener("click", openToc);
  $("closeToc").addEventListener("click", closeToc);
  $("tocPanel").addEventListener("click", e => { if (e.target === $("tocPanel")) closeToc(); });

  const applySize = () => {
    size = clamp(size, 17, 28);
    document.documentElement.style.setProperty("--reader-size", size + "px");
    localStorage.setItem("reader_size", String(size));
    $("fontSizeLabel").textContent = `${size}`;
    if (data) setTimeout(saveState, 80);
  };
  applySize();
  $("fontDown").addEventListener("click", () => { size--; applySize(); });
  $("fontReset").addEventListener("click", () => { size = 20; applySize(); });
  $("fontUp").addEventListener("click", () => { size++; applySize(); });

  window.addEventListener("scroll", () => {
    if (!data || restoring) return;
    updateProgressUI();
    clearTimeout(scrollSaveTimer);
    scrollSaveTimer = setTimeout(saveState, 180);
  }, { passive: true });
  window.addEventListener("pagehide", saveState);
  document.addEventListener("visibilitychange", () => { if (document.hidden) saveState(); });

  $("shareBtn").addEventListener("click", async () => {
    const shareData = {
      title: data ? data.title : document.title,
      text: "Прочетете това произведение от Огнян Пеев",
      url: location.href
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(location.href);
        notify("Връзката към страницата е копирана.");
      }
    } catch (e) {}
  });

  ["copy", "cut", "dragstart", "selectstart"].forEach(ev =>
    document.addEventListener(ev, e => {
      if (e.target.closest(".reader-text")) {
        e.preventDefault();
        notify("Текстът е предоставен само за четене.");
      }
    })
  );

  document.addEventListener("contextmenu", e => {
    if (e.target.closest(".reader-paper")) {
      e.preventDefault();
      notify("Десният бутон е изключен в страницата за четене.");
    }
  });

  document.addEventListener("keydown", e => {
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && ["c", "x", "s", "p", "u", "a"].includes(k)) {
      e.preventDefault();
      notify("Тази команда е изключена в страницата за четене.");
    }
    if (e.key === "Escape") closeToc();
    if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key === "ArrowRight" && document.activeElement.tagName !== "SELECT") {
      if (data && section < data.sections.length - 1) setSection(section + 1);
    }
    if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key === "ArrowLeft" && document.activeElement.tagName !== "SELECT") {
      if (data && section > 0) setSection(section - 1);
    }
  });
})();
