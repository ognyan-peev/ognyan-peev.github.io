(() => {
  const setup = document.getElementById("commentsSetup");
  const shortname = String(window.SITE_COMMENTS?.disqusShortname || "").trim();

  if (!shortname) {
    setup.innerHTML = "<strong>Коментарите временно не са достъпни.</strong>";
    setup.hidden = false;
    return;
  }

  window.disqus_config = function () {
    this.page.url = `${location.origin}${location.pathname}`;
    this.page.identifier = "ognyan-peev-reader-comments";
    this.language = "bg";
  };

  const script = document.createElement("script");
  script.src = `https://${shortname}.disqus.com/embed.js`;
  script.setAttribute("data-timestamp", String(Date.now()));
  script.async = true;
  script.addEventListener("error", () => {
    setup.innerHTML = "<strong>Коментарите не успяха да се заредят.</strong><p>Моля, опитайте да презаредите страницата.</p>";
    setup.hidden = false;
  });
  document.head.appendChild(script);
})();
