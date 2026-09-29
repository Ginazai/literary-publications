/* ---------- Reader: thin abstraction so StPageFlip stays replaceable ---------- */
const Reader = (() => {
  let pf = null, listener = () => {};
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  return {
    open(stage, pages, start = 0) {
      this.close();
      const el = document.createElement("div");
      el.className = "book";
      stage.appendChild(el);
      pf = new St.PageFlip(el, {
        width: 400, height: 560, size: "stretch",
        minWidth: 280, maxWidth: 520, minHeight: 400, maxHeight: 720,
        showCover: true, usePortrait: true, mobileScrollSupport: false,
        maxShadowOpacity: 0.4, flippingTime: reduced ? 1 : 900, startPage: start
      });
      pf.loadFromHTML(pages);
      pf.on("flip", e => listener(e.data));
      listener(start);
    },
    next()      { pf && pf.flipNext(); },
    previous()  { pf && pf.flipPrev(); },
    goTo(n)     { pf && pf.flip(n); },
    resize()    { pf && pf.update(); },
    close()     { if (pf) { try { pf.destroy(); } catch (e) {} pf = null; } },
    onChange(cb){ listener = cb; },
    get count() { return pf ? pf.getPageCount() : 0; },
    get isOpen(){ return !!pf; },
    get pageSize() {          // rendered size of one page in px
      if (!pf) return null;
      const r = pf.getBoundsRect && pf.getBoundsRect();
      if (r && r.pageWidth && r.height) return { w: r.pageWidth, h: r.height };
      const it = [...document.querySelectorAll(".book .stf__item")].find(e => e.offsetWidth);
      return it ? { w: it.offsetWidth, h: it.offsetHeight } : null;
    }
  };
})();

/* ---------- Pagination ---------- */
const wordCount = html => (html.replace(/<[^>]+>/g, "").match(/\S+/g) || []).length;

// Split an HTML string after k words, keeping inline tags (em, a, ...) balanced across the cut.
function splitAt(html, k) {
  const toks = html.match(/<[^>]+>|\s+|[^<\s]+/g) || [];
  let words = 0, a = "", stack = [], i = 0;
  for (; i < toks.length; i++) {
    const t = toks[i];
    if (t[0] === "<") {
      a += t;
      if (t[1] === "/") stack.pop();
      else if (!/\/>$|^<(br|img|hr)\b/i.test(t)) stack.push(t);
    } else {
      if (!/^\s/.test(t)) { if (words === k) break; words++; }
      a += t;
    }
  }
  const dangling = [];                       // open tags right at the cut belong to the next chunk
  let m;
  while ((m = a.match(/<(?!\/)[^>]+>$/))) { a = a.slice(0, -m[0].length); dangling.unshift(stack.pop()); }
  const close = stack.slice().reverse().map(t => "</" + t.match(/^<(\w+)/)[1] + ">").join("");
  return [a.trimEnd() + close, stack.concat(dangling).join("") + toks.slice(i).join("")];
}

// Author-inserted <hr> = forced page break. Returns arrays of cloned blocks.
function sectionsOf(srcEl) {
  const out = [[]];
  [...srcEl.children].forEach(n => n.tagName === "HR" ? out.push([]) : out[out.length - 1].push(n.cloneNode(true)));
  return out.filter(s => s.length);
}

// Fill invisible pages of exactly w x h px with the essay; returns one HTML string per page.
function paginate(srcEl, w, h) {
  const probe = document.createElement("section");
  probe.className = "page probe";
  probe.style.cssText = `position:fixed;left:-9999px;top:0;width:${w}px;height:${h}px;visibility:hidden`;
  probe.innerHTML = '<div class="inner"></div>';
  document.body.appendChild(probe);
  const inner = probe.firstChild;
  const pad = parseFloat(getComputedStyle(inner).paddingBottom);
  const fits = () => {
    const l = inner.lastElementChild;
    return !l || l.getBoundingClientRect().bottom <= inner.getBoundingClientRect().bottom - pad + 0.5;
  };
  const tryWords = (html, k) => {
    const p = document.createElement("p");
    p.innerHTML = splitAt(html, k)[0];
    inner.appendChild(p);
    const ok = fits();
    inner.removeChild(p);
    return ok;
  };
  const pages = [];
  const hardFlush = () => { if (inner.children.length) pages.push(inner.innerHTML); inner.innerHTML = ""; };
  const flush = () => {       // never strand a heading at the bottom of a page
    const l = inner.lastElementChild;
    let carry = null;
    if (l && /^H\d$/.test(l.tagName) && inner.children.length > 1) { carry = l; inner.removeChild(l); }
    hardFlush();
    if (carry) inner.appendChild(carry);
  };

  sectionsOf(srcEl).forEach(sec => {
    sec.forEach(block => {
      let rest = block;
      while (rest) {
        inner.appendChild(rest);
        if (fits()) break;
        inner.removeChild(rest);
        if (rest.tagName === "P") {
          const html = rest.innerHTML, n = wordCount(html);
          let lo = 0, hi = n - 1;                    // largest word count that still fits
          while (lo < hi) { const m = (lo + hi + 1) >> 1; tryWords(html, m) ? lo = m : hi = m - 1; }
          if (lo >= 3 && n - lo >= 3) {              // avoid one/two-word orphans and widows
            const [a, c] = splitAt(html, lo);
            const pa = document.createElement("p"); pa.innerHTML = a; inner.appendChild(pa);
            const pc = document.createElement("p"); pc.innerHTML = c; pc.className = "cont";
            rest = pc; flush(); continue;
          }
        }
        if (inner.children.length) { flush(); continue; }
        inner.appendChild(rest); flush(); break;     // nothing fits on an empty page: force it
      }
    });
    hardFlush();                                     // manual breaks always start a new page
  });
  probe.remove();
  return pages;
}

/* ---------- Essay -> page elements ---------- */
function mkPage(cls, html, dense) {
  const s = document.createElement("section");
  s.className = "page " + cls;
  if (dense) s.dataset.density = "hard";
  s.innerHTML = '<div class="inner">' + html + "</div>";
  return s;
}
// size = {w,h} paginates automatically; null uses only the author's manual <hr> breaks.
function buildPages(srcEl, size) {
  const { title, author } = srcEl.dataset;
  const bodies = size ? paginate(srcEl, size.w, size.h) : sectionsOf(srcEl).map(s => s.map(n => n.outerHTML).join(""));
  const pages = [mkPage("cover", `<small>An Essay</small><h2>${title}</h2><small>${author}</small>`, true)];
  bodies.forEach((h, i) => {
    if (i === 0) h = h.replace("<p>", '<p class="dropcap">');
    pages.push(mkPage("", h + `<div class="num">${i + 1}</div>`));
  });
  if ((pages.length + 1) % 2) pages.push(mkPage("", ""));   // keep spread parity: back cover lands on the left
  pages.push(mkPage("back", `<small>${author}</small>`, true));
  return pages;
}
