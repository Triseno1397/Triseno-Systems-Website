/* Triseno // Web Design Division — interactions
   Custom cursor · magnetic buttons · text scramble · infinite marquee ·
   pinned horizontal gallery · 3D tilt cards · scroll-scrubbed reveals ·
   animated counters · draggable physics chips · cursor-reactive grid. */

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
gsap.registerPlugin(ScrollTrigger, Draggable);

/* ---------- data ---------- */
const MARQUEE = ["STRATEGY", "DESIGN", "MOTION", "WEBGL", "INTERACTION", "BRAND", "CRO", "HEADLESS"];
const WORK = [
  { idx: "01", name: "Helio Robotics", tags: "WebGL · Motion · 3D", g: "linear-gradient(135deg,#00e5ff 0%,#06303a 60%,#08080c 100%)" },
  { idx: "02", name: "Nova Finance", tags: "Brand · Product · CRO", g: "linear-gradient(135deg,#ff2d78 0%,#3a0a22 60%,#08080c 100%)" },
  { idx: "03", name: "Atlas Broadcast", tags: "Live · Interaction", g: "linear-gradient(135deg,#00e5ff 0%,#06303a 60%,#08080c 100%)" },
  { idx: "04", name: "Pulse Health", tags: "Design System · App", g: "linear-gradient(135deg,#00e5ff 0%,#ff2d78 120%)" },
  { idx: "05", name: "Vertex Studios", tags: "Editorial · Motion", g: "linear-gradient(135deg,#ffffff 0%,#5a5a66 50%,#08080c 100%)" },
];
const CAPS = [
  { n: "01", h: "Strategy & Positioning", d: "Where you win before a pixel is drawn — narrative, structure, and the one idea that carries everything." },
  { n: "02", h: "Brand & Art Direction", d: "Identity systems with a point of view: type, color, grid, and motion language built to last." },
  { n: "03", h: "Motion & Interaction", d: "Every scroll, hover, and transition choreographed — the difference between a page and an experience." },
  { n: "04", h: "Build & Ship", d: "Headless, fast, 100-Lighthouse, accessible, and yours to own. Engineered like the rest of Triseno." },
];
const STATS = [
  { v: "60", s: "fps", k: "Buttery, always" },
  { v: "100", s: "", k: "Lighthouse target" },
  { v: "12", s: "+", k: "Awards & features" },
  { v: "0", s: "", k: "Templates used" },
];
const CHIPS = [
  { t: "WEBGL", c: "#00e5ff" }, { t: "GSAP", c: "#ff2d78" }, { t: "MOTION", c: "#00e5ff" },
  { t: "3D", c: "#00e5ff" }, { t: "SCROLL", c: "#ffffff" }, { t: "HEADLESS", c: "#ff2d78" },
  { t: "CRO", c: "#00e5ff" }, { t: "BRAND", c: "#00e5ff" },
];

/* ---------- custom cursor ---------- */
(function cursor() {
  if (reduce || window.matchMedia("(pointer: coarse)").matches) {
    document.querySelector(".cur")?.remove();
    document.querySelector(".cur-ring")?.remove();
    return;
  }
  const dot = document.querySelector(".cur");
  const ring = document.querySelector(".cur-ring");
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
  addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`; });
  (function tick() {
    rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(tick);
  })();
  const grow = () => ring.classList.add("grow");
  const shrink = () => ring.classList.remove("grow");
  document.querySelectorAll("[data-cursor],[data-magnetic],a,button,.chip").forEach((el) => {
    el.addEventListener("pointerenter", grow); el.addEventListener("pointerleave", shrink);
  });
})();

/* ---------- magnetic buttons ---------- */
(function magnetic() {
  if (reduce) return;
  document.querySelectorAll("[data-magnetic]").forEach((wrap) => {
    const strength = 0.4;
    wrap.addEventListener("pointermove", (e) => {
      const r = wrap.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      gsap.to(wrap, { x: x * strength, y: y * strength, duration: 0.4, ease: "power3.out" });
    });
    wrap.addEventListener("pointerleave", () => gsap.to(wrap, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1,0.4)" }));
  });
})();

/* ---------- text scramble ---------- */
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*/";
function scramble(el, dur = 900) {
  const target = el.dataset.final || el.textContent;
  el.dataset.final = target;
  if (reduce) { el.textContent = target; return; }
  const start = performance.now();
  (function run(t) {
    const p = Math.min(1, (t - start) / dur);
    const locked = Math.floor(p * target.length);
    let out = "";
    for (let i = 0; i < target.length; i++) {
      out += i < locked ? target[i] : (target[i] === " " ? " " : CHARS[(Math.random() * CHARS.length) | 0]);
    }
    el.textContent = out;
    if (p < 1) requestAnimationFrame(run);
  })(start);
}
document.querySelectorAll("[data-scramble]").forEach((el, i) => {
  // first one fires on load; others fire when scrolled into view
  if (i === 0) setTimeout(() => scramble(el, 1100), 350);
  else ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: () => scramble(el, 900) });
});

/* ---------- marquee ---------- */
(function buildMarquee() {
  const mq = document.getElementById("mq");
  const seq = MARQUEE.map((w) => `<span>${w}</span><span class="dot">/</span>`).join("");
  mq.innerHTML = seq + seq; // doubled for seamless -50% loop
})();

/* ---------- pinned horizontal gallery + tilt ---------- */
(function gallery() {
  const track = document.getElementById("htrack");
  track.style.perspective = "1200px";
  WORK.forEach((w) => {
    const el = document.createElement("article");
    el.className = "work";
    el.dataset.cursor = "";
    el.innerHTML = `
      <div class="fill" style="background:${w.g}"></div>
      <div class="fill" style="background:
        linear-gradient(rgba(255,255,255,0.06) 1px,transparent 1px),
        linear-gradient(90deg,rgba(255,255,255,0.06) 1px,transparent 1px); background-size:34px 34px; opacity:.5;"></div>
      <span class="idx mono">${w.idx}</span>
      <div class="meta"><h3>${w.name}</h3><span class="tags">${w.tags}</span></div>`;
    track.appendChild(el);

    // 3D tilt on hover
    if (!reduce) {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(el, { rotateY: px * 14, rotateX: -py * 14, duration: 0.4, ease: "power2.out", transformPerspective: 900 });
      });
      el.addEventListener("pointerleave", () => gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.7, ease: "power3.out" }));
    }
  });

  if (reduce) { document.querySelector(".gallery").style.height = "auto"; track.style.overflowX = "auto"; return; }
  const amount = () => track.scrollWidth - window.innerWidth + 40;
  gsap.to(track, {
    x: () => -amount(), ease: "none",
    scrollTrigger: {
      trigger: ".gallery", start: "top top",
      end: () => "+=" + (amount() + window.innerHeight * 0.6),
      scrub: 1, pin: true, anticipatePin: 1, invalidateOnRefresh: true,
    },
  });
})();

/* ---------- capabilities + scrub reveals ---------- */
(function caps() {
  const list = document.getElementById("capList");
  CAPS.forEach((c) => {
    const row = document.createElement("div");
    row.className = "cap";
    row.innerHTML = `<span class="n">${c.n}</span><h3><span class="reveal-line">${c.h}</span></h3><p class="d">${c.d}</p>`;
    list.appendChild(row);
  });
  if (reduce) return;
  list.querySelectorAll(".cap").forEach((row) => {
    const line = row.querySelector(".reveal-line");
    const d = row.querySelector(".d");
    gsap.from(line, { yPercent: 115, duration: 0.9, ease: "power4.out", scrollTrigger: { trigger: row, start: "top 88%" } });
    gsap.from(d, { opacity: 0, y: 16, duration: 0.8, delay: 0.15, ease: "power2.out", scrollTrigger: { trigger: row, start: "top 88%" } });
    gsap.to(row, { backgroundColor: "rgba(255,255,255,0.02)", scrollTrigger: { trigger: row, start: "top 60%", end: "bottom 40%", toggleActions: "play none none reverse" } });
  });
})();

/* ---------- stats + counters ---------- */
(function stats() {
  const wrap = document.getElementById("stats");
  STATS.forEach((s) => {
    const el = document.createElement("div");
    el.className = "stat";
    el.innerHTML = `<div class="v"><span class="num" data-to="${s.v}">0</span><small>${s.s}</small></div><div class="k">${s.k}</div>`;
    wrap.appendChild(el);
  });
  wrap.querySelectorAll(".num").forEach((num) => {
    const to = parseInt(num.dataset.to, 10);
    if (reduce) { num.textContent = to; return; }
    const obj = { v: 0 };
    gsap.to(obj, { v: to, duration: 1.4, ease: "power2.out", onUpdate: () => (num.textContent = Math.round(obj.v)),
      scrollTrigger: { trigger: num, start: "top 90%", once: true } });
  });
})();

/* ---------- playground: reactive grid + draggable chips ---------- */
(function playground() {
  const play = document.getElementById("play");
  const greact = document.getElementById("greact");

  function buildGrid() {
    greact.innerHTML = "";
    const r = play.getBoundingClientRect();
    const gap = 30;
    const cols = Math.floor(r.width / gap), rows = Math.floor(r.height / gap);
    const dots = [];
    for (let y = 1; y < rows; y++) {
      for (let x = 1; x < cols; x++) {
        const d = document.createElement("div");
        d.className = "gd";
        d.style.left = x * gap + "px"; d.style.top = y * gap + "px";
        greact.appendChild(d);
        dots.push({ el: d, x: x * gap, y: y * gap });
      }
    }
    return dots;
  }
  let dots = reduce ? [] : buildGrid();

  if (!reduce) {
    let raf = 0, mx = -999, my = -999;
    play.addEventListener("pointermove", (e) => {
      const r = play.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top;
      if (!raf) raf = requestAnimationFrame(update);
    });
    play.addEventListener("pointerleave", () => { mx = my = -999; if (!raf) raf = requestAnimationFrame(update); });
    function update() {
      raf = 0;
      const R = 130;
      for (const d of dots) {
        const dist = Math.hypot(d.x - mx, d.y - my);
        if (dist < R) {
          const f = 1 - dist / R;
          d.el.style.transform = `translate(-50%,-50%) scale(${1 + f * 3.4})`;
          d.el.style.background = `rgba(0,229,255,${0.25 + f * 0.75})`;
        } else {
          d.el.style.transform = "translate(-50%,-50%) scale(1)";
          d.el.style.background = "rgba(255,255,255,0.18)";
        }
      }
    }
    window.addEventListener("resize", () => { dots = buildGrid(); });
  }

  // draggable chips
  CHIPS.forEach((c, i) => {
    const chip = document.createElement("div");
    chip.className = "chip"; chip.textContent = c.t; chip.style.color = c.c; chip.style.borderColor = c.c;
    chip.dataset.cursor = "";
    const r = play.getBoundingClientRect();
    chip.style.left = (60 + (i % 4) * (r.width / 4.5)) + "px";
    chip.style.top = (120 + Math.floor(i / 4) * 150 + (i % 2) * 40) + "px";
    play.appendChild(chip);
  });
  if (!reduce) {
    Draggable.create(".chip", {
      bounds: play, edgeResistance: 0.7, dragClickables: true,
      onPress() { gsap.to(this.target, { scale: 1.12, rotation: gsap.utils.random(-8, 8), duration: 0.25, ease: "power2.out" }); },
      onRelease() { gsap.to(this.target, { scale: 1, rotation: 0, duration: 0.5, ease: "elastic.out(1,0.5)" }); },
    });
  }
})();

/* ---------- hero parallax + entrance ---------- */
if (!reduce) {
  gsap.from(".hero h1", { y: 40, opacity: 0, duration: 1, ease: "power3.out", delay: 0.15 });
  gsap.from(".hero .sub, .hero .cta-row", { y: 24, opacity: 0, duration: 0.9, stagger: 0.12, ease: "power3.out", delay: 0.5 });
  ScrollTrigger.create({ trigger: ".hero", start: "top top", end: "bottom top", onUpdate: (self) => {
    gsap.set(".hero h1", { y: self.progress * 120, opacity: 1 - self.progress * 0.8 });
  }});
}

requestAnimationFrame(() => ScrollTrigger.refresh());
