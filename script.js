/* I.N. BALLET — terza versione: interazioni e grafica */
(function () {
  "use strict";

  var doc = document.documentElement;
  var body = document.body;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var desktopQuery = window.matchMedia("(min-width: 900px)");

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  /* ---------- Scomposizione testi ---------- */
  // Lettere del titolo hero
  var charIndex = 0;
  $$("[data-chars]").forEach(function (el) {
    var h1 = el.closest("h1");
    if (h1 && !h1.hasAttribute("aria-label")) h1.setAttribute("aria-label", h1.textContent.replace(/\s+/g, " ").trim());
    el.setAttribute("aria-hidden", "true");
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          // ogni parola resta intera: le lettere sono inline-block e altrimenti andrebbero a capo singolarmente
          child.textContent.split(/(\s+)/).forEach(function (word) {
            if (!word) return;
            if (/^\s+$/.test(word)) { frag.appendChild(document.createTextNode(" ")); return; }
            var w = document.createElement("span");
            w.className = "word";
            word.split("").forEach(function (c) {
              var outer = document.createElement("span");
              outer.className = "ch";
              var inner = document.createElement("span");
              inner.style.setProperty("--i", charIndex++);
              inner.textContent = c;
              outer.appendChild(inner);
              w.appendChild(outer);
            });
            frag.appendChild(w);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    })(el);
  });

  // Titoli di sezione: maschera unica che sale
  $$(".reveal-lines").forEach(function (el) {
    el.innerHTML = '<span class="ln"><span style="--i:0">' + el.innerHTML + "</span></span>";
  });

  // Parole (citazione e paragrafo che si accende)
  function splitWords(el, outerClass) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
            var outer = document.createElement("span");
            outer.className = outerClass;
            if (outerClass === "wd") {
              var inner = document.createElement("span");
              inner.style.setProperty("--i", i);
              inner.textContent = p;
              outer.appendChild(inner);
            } else {
              outer.textContent = p;
            }
            i++;
            frag.appendChild(outer);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    })(el);
  }
  $$("[data-words]").forEach(function (el) { splitWords(el, "wd"); });
  var litBlocks = $$("[data-lit]").map(function (el) {
    splitWords(el, "w");
    return { el: el, words: $$(".w", el) };
  });

  // Nastro discipline: duplica il set finché copre due schermi
  var ribbonTrack = $(".ribbon-track");
  var ribbonSet = ribbonTrack ? $(".ribbon-set", ribbonTrack) : null;
  if (ribbonSet) {
    var copies = Math.max(2, Math.ceil((window.innerWidth * 2) / Math.max(ribbonSet.offsetWidth, 1)) + 1);
    for (var c = 1; c < copies; c++) ribbonTrack.appendChild(ribbonSet.cloneNode(true));
  }

  /* ---------- Menu ---------- */
  $$(".menu-main > li").forEach(function (li, i) { li.style.setProperty("--i", i); });

  /* ---------- Smooth scroll (Lenis, se disponibile) ---------- */
  var lenis = null;
  function initLenis() {
    if (lenis || reduceMotion || !finePointer || typeof window.Lenis !== "function") return;
    lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 1 });
  }
  function scrollToTarget(target) {
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.6 });
    else {
      var y = typeof target === "number" ? target : target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
    }
  }

  var menu = $(".menu");
  var menuBtn = $(".menu-btn");
  var menuLabel = $(".menu-btn-label");
  function setMenu(open) {
    menu.classList.toggle("is-open", open);
    menu.setAttribute("aria-hidden", String(!open));
    menuBtn.setAttribute("aria-expanded", String(open));
    menuLabel.textContent = open ? menuLabel.dataset.close : menuLabel.dataset.open;
    body.classList.toggle("menu-open", open);
    body.classList.toggle("is-locked", open);
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    if (open) { var first = $("a", menu); if (first) setTimeout(function () { first.focus(); }, 400); }
  }
  menuBtn.addEventListener("click", function () { setMenu(!menu.classList.contains("is-open")); });
  $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && menu.classList.contains("is-open")) { setMenu(false); menuBtn.focus(); }
  });

  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      var t = id.length > 1 ? $(id) : null;
      if (!t) return;
      e.preventDefault();
      scrollToTarget(t);
    });
  });
  var toTop = $(".to-top");
  if (toTop) toTop.addEventListener("click", function () { scrollToTarget(0); });

  /* ---------- Sipario ---------- */
  var loader = $(".loader");
  function start() {
    body.classList.add("is-ready");
    updateScroll(true);
  }
  if (!loader || reduceMotion) {
    if (loader) loader.remove();
    requestAnimationFrame(start);
    setTimeout(start, 150);
  } else {
    var countEl = $(".loader-count");
    var bar = $(".loader-bar span");
    var t0 = performance.now();
    var minTime = 1500;
    var assetsReady = false;
    var heroImg = $(".hero-bg img");
    var waits = [document.fonts ? document.fonts.ready : Promise.resolve()];
    if (heroImg && !heroImg.complete) {
      waits.push(new Promise(function (res) { heroImg.addEventListener("load", res); heroImg.addEventListener("error", res); }));
    }
    Promise.all(waits).then(function () { assetsReady = true; });
    setTimeout(function () { assetsReady = true; }, 3500);
    body.classList.add("is-locked");
    var finished = false;
    var finish = function () {
      if (finished) return;
      finished = true;
      loader.classList.add("is-done");
      body.classList.remove("is-locked");
      setTimeout(start, 350);
      setTimeout(function () { loader.remove(); }, 1300);
    };
    // rete di sicurezza: se requestAnimationFrame è sospeso (scheda in background) il sipario si apre comunque
    setTimeout(finish, 4500);
    (function tick(now) {
      if (finished) return;
      var p = clamp((now - t0) / minTime, 0, 1);
      if (!assetsReady) p = Math.min(p, 0.86);
      var eased = 1 - Math.pow(1 - p, 3);
      countEl.textContent = String(Math.round(eased * 100)).padStart(3, "0");
      bar.style.transform = "scaleX(" + eased + ")";
      if (p < 1) { requestAnimationFrame(tick); return; }
      setTimeout(finish, 180);
    })(t0);
  }

  /* ---------- Reveal ---------- */
  var revealEls = $$(".reveal, .clip-reveal, .reveal-lines, [data-words], .t-item");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { (en.target._reveal || en.target).classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.1 });
    revealEls.forEach(function (el) {
      // un elemento con clip-path al 100% non risulta mai visibile: si osserva il genitore
      if (el.classList.contains("clip-reveal")) {
        var probe = document.createElement("span");
        probe.style.cssText = "position:absolute;inset:0;pointer-events:none;";
        probe._reveal = el;
        el.parentNode.appendChild(probe);
        io.observe(probe);
      } else {
        io.observe(el);
      }
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Contatori ---------- */
  var counters = $$("[data-count]");
  function runCounter(el) {
    var to = parseInt(el.dataset.count, 10);
    var from = to > 100 ? to - 25 : 0;
    var t0 = performance.now();
    (function step(now) {
      var p = clamp((now - t0) / 1600, 0, 1);
      var e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(lerp(from, to, e));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  if ("IntersectionObserver" in window && !reduceMotion) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { runCounter(en.target); cio.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { el.textContent = el.dataset.count > 100 ? el.dataset.count - 25 : 0; cio.observe(el); });
  }

  /* ---------- Cursore personalizzato ---------- */
  var cursor = $(".cursor");
  var mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false };
  var ring = { x: mouse.x, y: mouse.y };
  var cDot = cursor ? $(".cursor-dot", cursor) : null;
  var cRing = cursor ? $(".cursor-ring", cursor) : null;
  var cLabel = cursor ? $(".cursor-label", cursor) : null;
  var useCursor = finePointer && cursor && !reduceMotion;
  if (useCursor) {
    // Il cursore personalizzato compare solo al primo movimento: fino ad allora resta quello di sistema,
    // così aprendo una pagina non c'è un pallino fermo al centro mentre si scorre con la rotella
    window.addEventListener("pointermove", function first(e) {
      if (e.pointerType !== "mouse") return;
      window.removeEventListener("pointermove", first);
      ring.x = e.clientX; ring.y = e.clientY;
      doc.classList.add("has-cursor");
    });
    document.addEventListener("mouseover", function (e) {
      var lab = e.target.closest("[data-cursor]");
      var hov = e.target.closest("a, button");
      cursor.classList.toggle("is-label", !!lab);
      cursor.classList.toggle("is-hover", !lab && !!hov);
      if (lab) cLabel.textContent = lab.dataset.cursor;
    });
    document.addEventListener("mouseleave", function () { cursor.style.opacity = "0"; });
    document.addEventListener("mouseenter", function () { cursor.style.opacity = "1"; });
  }
  window.addEventListener("pointermove", function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
  }, { passive: true });

  /* ---------- Elementi magnetici ---------- */
  if (finePointer && !reduceMotion) {
    $$(".magnetic").forEach(function (el) {
      el.style.transition = "translate 0.6s cubic-bezier(0.22, 1, 0.36, 1)";
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        el.style.translate = dx * 0.28 + "px " + dy * 0.36 + "px";
      });
      el.addEventListener("pointerleave", function () { el.style.translate = "0 0"; });
    });
  }

  /* ---------- Seta in canvas (hero) ---------- */
  var silk = (function () {
    var canvas = $(".silk");
    if (!canvas || !canvas.getContext) return null;
    var ctx = canvas.getContext("2d");
    var hero = canvas.parentNode;
    var w = 0, h = 0, dpr = 1, pts = 80;
    var visible = true;
    var pointer = { x: 0.6, y: 0.5, s: 0 };
    var ribbons = [
      { y: 0.6, a1: 0.11, f1: 2.1, s1: 0.32, a2: 0.06, f2: 4.2, s2: 0.21, lines: 30, spread: 0.032, c1: [235, 186, 198], c2: [165, 150, 201], alpha: 0.2 },
      { y: 0.44, a1: 0.13, f1: 1.5, s1: 0.24, a2: 0.05, f2: 3.4, s2: 0.29, lines: 24, spread: 0.045, c1: [250, 226, 232], c2: [235, 186, 198], alpha: 0.12 },
      { y: 0.78, a1: 0.08, f1: 2.7, s1: 0.38, a2: 0.07, f2: 5.1, s2: 0.17, lines: 20, spread: 0.055, c1: [165, 150, 201], c2: [235, 186, 198], alpha: 0.16 }
    ];
    // Il colore d'accento dell'area (es. Urban, Attività motorie) tinge la seta
    var accent = /^#([0-9a-f]{6})$/i.exec(getComputedStyle(body).getPropertyValue("--rose").trim());
    if (accent) {
      var n = parseInt(accent[1], 16);
      var rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      ribbons[0].c1 = rgb; ribbons[1].c2 = rgb; ribbons[2].c2 = rgb;
    }
    function resize() {
      var r = hero.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      pts = Math.max(48, Math.round(w / 18));
      ribbons.forEach(function (rb) {
        var g = ctx.createLinearGradient(0, 0, w, 0);
        var a = rb.alpha;
        g.addColorStop(0, "rgba(" + rb.c2 + ",0)");
        g.addColorStop(0.25, "rgba(" + rb.c2 + "," + a + ")");
        g.addColorStop(0.6, "rgba(" + rb.c1 + "," + a * 1.2 + ")");
        g.addColorStop(1, "rgba(" + rb.c1 + ",0)");
        rb.grad = g;
        rb.n = w < 700 ? Math.ceil(rb.lines * 0.55) : rb.lines;
      });
    }
    function draw(t, scrollY) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = 1;
      var px = pointer.x * w, py = pointer.y * h, sig2 = 2 * Math.pow(w * 0.14, 2);
      var lift = scrollY * 0.25;
      ribbons.forEach(function (rb, ri) {
        ctx.strokeStyle = rb.grad;
        for (var k = 0; k < rb.n; k++) {
          var ph = k * rb.spread;
          var twist = Math.sin(t * 0.35 + k * 0.11 + ri);
          var falloff = 1 - (k / rb.n) * 0.5;
          ctx.beginPath();
          for (var i = 0; i <= pts; i++) {
            var x = (i / pts) * (w + 160) - 80;
            var nx = x / w;
            var y = rb.y * h - lift
              + Math.sin(nx * rb.f1 + t * rb.s1 + ph) * rb.a1 * h
              + Math.sin(nx * rb.f2 - t * rb.s2 + ph * 1.7) * rb.a2 * h * twist;
            var dx = x - px;
            y += (py - y) * Math.exp(-(dx * dx) / sig2) * 0.32 * pointer.s * falloff;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      });
    }
    resize();
    window.addEventListener("resize", resize);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(hero);
    }
    return {
      frame: function (t, scrollY) {
        if (!visible || document.hidden) return;
        var r = hero.getBoundingClientRect();
        var tx = mouse.active ? (mouse.x - r.left) / w : 0.6;
        var ty = mouse.active ? (mouse.y - r.top) / h : 0.5;
        var inside = mouse.active && ty >= 0 && ty <= 1;
        pointer.x = lerp(pointer.x, tx, 0.06);
        pointer.y = lerp(pointer.y, ty, 0.06);
        pointer.s = lerp(pointer.s, inside ? 1 : 0, 0.04);
        draw(t, scrollY);
      },
      still: function () { draw(4, 0); }
    };
  })();

  /* ---------- Galleria orizzontale ---------- */
  var areas = $(".areas");
  var areasTrack = areas ? $(".areas-track", areas) : null;
  var areasBar = areas ? $(".areas-bar span", areas) : null;
  var areasCurrent = areas ? $(".areas-current", areas) : null;
  var panels = areas ? $$(".panel", areas) : [];
  var hDist = 0;
  var pinned = false;
  function setupAreas() {
    if (!areas) return;
    pinned = desktopQuery.matches && !reduceMotion;
    if (pinned) {
      areasTrack.style.transform = "";
      hDist = Math.max(0, areasTrack.scrollWidth - window.innerWidth);
      areas.style.height = window.innerHeight + hDist + "px";
    } else {
      areas.style.height = "";
      areasTrack.style.transform = "";
      panels.forEach(function (p) { $("img", p).style.setProperty("--px", "0px"); });
    }
  }
  function setAreaIndex(p) {
    var idx = Math.min(panels.length, Math.round(p * (panels.length - 1)) + 1);
    var label = idx < 10 ? "0" + idx : String(idx);
    if (areasCurrent.textContent !== label) areasCurrent.textContent = label;
    areasBar.parentNode.style.setProperty("--p", p);
    areasBar.style.setProperty("--p", p);
  }
  // Le immagini della galleria sono fuori schermo in orizzontale: si caricano in anticipo
  if (areas && "IntersectionObserver" in window) {
    var aio = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      panels.forEach(function (p) { $("img", p).loading = "eager"; });
      aio.disconnect();
    }, { rootMargin: "150% 0px" });
    aio.observe(areas);
  }
  if (areasTrack) {
    areasTrack.addEventListener("scroll", function () {
      if (pinned) return;
      var max = areasTrack.scrollWidth - areasTrack.clientWidth;
      setAreaIndex(max > 0 ? areasTrack.scrollLeft / max : 0);
    }, { passive: true });
  }

  /* ---------- Stato legato allo scroll ---------- */
  var header = $("[data-header]");
  var progress = $(".scroll-progress");
  var parallaxEls = $$("[data-parallax]");
  var ftrWord = $(".ftr-word");
  var timeline = $(".timeline");
  var timelineBar = timeline ? $(".progress", timeline) : null;
  if (!timelineBar) timeline = null;
  var lastY = window.scrollY;
  var velocity = 0;

  function updateScroll(force) {
    var y = window.scrollY;
    var vh = window.innerHeight;
    var max = doc.scrollHeight - vh;
    if (progress) progress.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")";

    if (header && !body.classList.contains("menu-open")) {
      if (y > 320 && y > lastY + 2) header.classList.add("is-hidden");
      else if (y < lastY - 2 || y < 320) header.classList.remove("is-hidden");
    }

    // Paragrafo che si accende parola per parola
    litBlocks.forEach(function (b) {
      var lr = b.el.getBoundingClientRect();
      if (lr.top > vh || lr.bottom < 0) return;
      var lp = clamp((vh * 0.85 - lr.top) / (lr.height + vh * 0.35), 0, 1);
      var lit = reduceMotion ? b.words.length : Math.round(lp * b.words.length);
      for (var j = 0; j < b.words.length; j++) b.words[j].classList.toggle("on", j < lit);
    });

    // Linea del tempo (Atelier)
    if (timeline) {
      var tr = timeline.getBoundingClientRect();
      var tp = clamp((vh * 0.6 - tr.top) / tr.height, 0, 1);
      timelineBar.style.transform = "scaleY(" + tp + ")";
    }

    if (!reduceMotion) {
      parallaxEls.forEach(function (el) {
        var box = el.parentNode.getBoundingClientRect();
        if (box.bottom < -100 || box.top > vh + 100) return;
        var off = (box.top + box.height / 2 - vh / 2) * parseFloat(el.dataset.parallax);
        var lim = box.height * 0.07;
        el.style.translate = "0 " + clamp(off, -lim, lim).toFixed(1) + "px";
      });
    }

    if (areas && pinned) {
      var ar = areas.getBoundingClientRect();
      var p = hDist > 0 ? clamp(-ar.top / hDist, 0, 1) : 0;
      areasTrack.style.transform = "translate3d(" + (-p * hDist).toFixed(1) + "px,0,0)";
      setAreaIndex(p);
      var vw = window.innerWidth;
      panels.forEach(function (pn) {
        var media = pn.firstElementChild;
        var pr = media.getBoundingClientRect();
        if (pr.right < 0 || pr.left > vw) return;
        var off = (pr.left + pr.width / 2 - vw / 2) * -0.1;
        var lim = pr.width * 0.09;
        media.firstElementChild.style.setProperty("--px", clamp(off, -lim, lim).toFixed(1) + "px");
      });
    }

    if (!force) velocity = lerp(velocity, y - lastY, 0.2);
    lastY = y;
  }

  /* ---------- Faretto sulla scritta del footer ---------- */
  var spot = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, hover: false };
  if (ftrWord) {
    ftrWord.addEventListener("pointermove", function (e) {
      var r = ftrWord.getBoundingClientRect();
      spot.tx = (e.clientX - r.left) / r.width;
      spot.ty = (e.clientY - r.top) / r.height;
      spot.hover = true;
    });
    ftrWord.addEventListener("pointerleave", function () { spot.hover = false; });
  }

  /* ---------- Loop principale ---------- */
  var ribbonX = 0;
  var ribbonSetW = ribbonSet ? ribbonSet.offsetWidth : 0;
  var ribbonDir = -1;
  var tStart = performance.now();

  function loop(now) {
    var t = (now - tStart) / 1000;
    if (lenis) lenis.raf(now);
    updateScroll(false);

    if (cursor && doc.classList.contains("has-cursor")) {
      ring.x = lerp(ring.x, mouse.x, 0.16);
      ring.y = lerp(ring.y, mouse.y, 0.16);
      cDot.style.transform = "translate3d(" + mouse.x + "px," + mouse.y + "px,0)";
      cRing.style.transform = "translate3d(" + ring.x + "px," + ring.y + "px,0)";
    }

    if (ribbonTrack && ribbonSetW) {
      if (Math.abs(velocity) > 0.5) ribbonDir = velocity > 0 ? -1 : 1;
      ribbonX += ribbonDir * (0.6 + Math.min(Math.abs(velocity) * 0.35, 14));
      if (ribbonX <= -ribbonSetW) ribbonX += ribbonSetW;
      if (ribbonX > 0) ribbonX -= ribbonSetW;
      var skew = clamp(velocity * -0.25, -8, 8);
      ribbonTrack.style.transform = "translate3d(" + ribbonX.toFixed(1) + "px,0,0) skewX(" + skew.toFixed(2) + "deg)";
    }

    if (silk) silk.frame(t, window.scrollY);

    if (ftrWord) {
      if (!spot.hover) {
        spot.tx = 0.5 + Math.sin(t * 0.5) * 0.38;
        spot.ty = 0.5 + Math.sin(t * 0.9) * 0.2;
      }
      spot.x = lerp(spot.x, spot.tx, 0.08);
      spot.y = lerp(spot.y, spot.ty, 0.08);
      ftrWord.style.setProperty("--mx", (spot.x * 100).toFixed(2) + "%");
      ftrWord.style.setProperty("--my", (spot.y * 100).toFixed(2) + "%");
    }

    requestAnimationFrame(loop);
  }

  function boot() {
    initLenis();
    setupAreas();
    ribbonSetW = ribbonSet ? ribbonSet.offsetWidth : 0;
    if (reduceMotion) {
      if (silk) silk.still();
      window.addEventListener("scroll", function () { updateScroll(true); }, { passive: true });
      updateScroll(true);
    } else {
      requestAnimationFrame(loop);
    }
  }

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      setupAreas();
      ribbonSetW = ribbonSet ? ribbonSet.offsetWidth : 0;
      if (reduceMotion && silk) silk.still();
    }, 150);
  });
  window.addEventListener("load", function () {
    // Le foto del pager compaiono solo al passaggio del mouse: decodificarle subito evita lo scatto alla prima volta
    $$(".pager img").forEach(function (img) { if (img.decode) img.decode().catch(function () {}); });
    setupAreas();
    ribbonSetW = ribbonSet ? ribbonSet.offsetWidth : 0;
  });

  boot();
})();
