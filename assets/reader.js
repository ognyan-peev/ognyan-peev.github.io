
(() => {
  const params = new URLSearchParams(location.search);
  const work = params.get("work") || "blue-eyes";
  let section = Math.max(0, parseInt(params.get("section") || localStorage.getItem("progress_" + work) || "0", 10));
  let data = null;

  const $ = id => document.getElementById(id);
  const notify = msg => {
    $("notice").textContent = msg;
    $("notice").classList.add("show");
    setTimeout(() => $("notice").classList.remove("show"), 2200);
  };

  function setSection(index, push = true) {
    if (!data) return;
    section = Math.max(0, Math.min(index, data.sections.length - 1));
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
    localStorage.setItem("progress_" + work, String(section));

    if (push) {
      const u = new URL(location.href);
      u.searchParams.set("section", section);
      history.replaceState({}, "", u);
    }
    window.siteAnalytics?.event('view_section', { work, section_number: section + 1, section_title: s.title || '' });
    scrollTo({top: 0, behavior: "smooth"});
  }

  function initialize() {
    data = window.WORK_DATA;
    if (!data) {
      $("readerText").textContent = "Произведението не можа да бъде заредено.";
      return;
    }

    document.title = data.title + " | Огнян Пеев";
    $("toolbarTitle").textContent = data.title;
    $("workTitle").textContent = data.title;
    $("workType").textContent = data.type;
    $("workAuthor").textContent = data.author;

    section = Math.min(section, data.sections.length - 1);
    const toc = $("tocList");
    data.sections.forEach((s, i) => {
      const b = document.createElement("button");
      b.textContent = s.subtitle ? `${s.title} — ${s.subtitle}` : s.title;
      b.addEventListener("click", () => { setSection(i); closeToc(); });
      toc.appendChild(b);
    });
    setSection(section, false);

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
  script.onerror = () => {
    $("readerText").textContent = "Произведението не можа да бъде заредено.";
  };
  document.head.appendChild(script);

  $("prevBtn").addEventListener("click", () => setSection(section - 1));
  $("nextBtn").addEventListener("click", () => setSection(section + 1));

  const openToc = () => $("tocPanel").classList.add("open");
  const closeToc = () => $("tocPanel").classList.remove("open");
  $("tocBtn").addEventListener("click", openToc);
  $("tocBtn2").addEventListener("click", openToc);
  $("closeToc").addEventListener("click", closeToc);
  $("tocPanel").addEventListener("click", e => { if (e.target === $("tocPanel")) closeToc(); });

  let size = parseInt(localStorage.getItem("reader_size") || "20", 10);
  const applySize = () => {
    size = Math.max(17, Math.min(28, size));
    document.documentElement.style.setProperty("--reader-size", size + "px");
    localStorage.setItem("reader_size", String(size));
  };
  applySize();
  $("fontDown").addEventListener("click", () => { size--; applySize(); });
  $("fontUp").addEventListener("click", () => { size++; applySize(); });

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
  });
})();
