/* Wires the reader to post.hbs. Depends on reader.js (Reader, buildPages) and page-flip. */
(() => {
  const $ = id => document.getElementById(id);
  const source = $("source"), stage = $("stage"), counter = $("counter");
  const prev = $("prev"), next = $("next");
  const state = { mode: "page" };
  let idx = 0, lastSize = null;

  const fillReading = () => {
    const d = source.dataset;
    $("reading").innerHTML = `<h2>${d.title}</h2><div class="byline">${d.author}</div>` + source.innerHTML;
  };

  Reader.onChange(i => {
    idx = i;
    const n = Reader.count;
    counter.textContent = i === 0 ? "Cover" : i >= n - 1 ? "End" : `Page ${i} of ${n - 2}`;
    prev.disabled = i === 0;
    next.disabled = i >= n - 1;
  });
  prev.onclick = () => Reader.previous();
  next.onclick = () => Reader.next();
  document.addEventListener("keydown", e => {
    if (!Reader.isOpen) return;
    if (e.key === "ArrowRight") Reader.next();
    if (e.key === "ArrowLeft") Reader.previous();
  });

  // Pass 1 opens with manual pages to learn the page size; pass 2 auto-paginates to fit it.
  function render(frac = 0) {
    if (state.mode !== "page") return;
    Reader.open(stage, buildPages(source, null));
    lastSize = Reader.pageSize;
    if (lastSize) {
      const pages = buildPages(source, lastSize);
      Reader.open(stage, pages, Math.round(frac * (pages.length - 1)));
    }
  }

  let t;
  addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      if (!Reader.isOpen) return;
      Reader.resize();
      const s = Reader.pageSize;
      if (s && lastSize && (Math.abs(s.w - lastSize.w) > 2 || Math.abs(s.h - lastSize.h) > 2))
        render(idx / Math.max(1, Reader.count - 1));
    }, 200);
  });

  function setMode(mode) {
    state.mode = mode;
    const page = mode === "page";
    $("bPage").setAttribute("aria-pressed", page);
    $("bRead").setAttribute("aria-pressed", !page);
    $("pageView").style.display = page ? "" : "none";
    $("reading").style.display = page ? "none" : "block";
    if (page) render(0); else Reader.close();
  }
  $("bPage").onclick = () => setMode("page");
  $("bRead").onclick = () => setMode("read");

  fillReading();
  // Small screens or no library: start in Reading View (the always-works fallback).
  if (window.St && St.PageFlip) setMode("page");
  else { $("bPage").disabled = true; setMode("read"); }
})();
