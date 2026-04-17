const BLOCKS = "p,li,h1,h2,h3,h4,h5,h6,blockquote,pre,td,th,dt,dd,ol,ul";
const SEL = BLOCKS.split(",").map((s) => `:is(${s})`).join(",");

// Fix Tailwind's physical padding for RTL lists
const css = document.createElement("style");
css.textContent = `
  ol[dir="rtl"], ul[dir="rtl"] {
    padding-left: 0 !important; padding-right: 2rem !important;
  }
  li[dir="rtl"] {
    padding-left: 0 !important; padding-right: 0.5rem !important;
  }
`;
document.head.appendChild(css);

const HE = /[\u0590-\u05FF]/g;
const LAT = /[A-Za-z]/g;

function detectDir(text) {
  const he = (text.match(HE) || []).length;
  const lat = (text.match(LAT) || []).length;
  return he > lat ? "rtl" : he ? "auto" : "ltr";
}

// Batch pending elements via requestAnimationFrame
let pending = new Set();
let rafId = 0;

function flush() {
  rafId = 0;
  pending.forEach((el) => {
    if (!el.isConnected) return;
    el.dir = detectDir(el.textContent);
  });
  pending.clear();
}

function enqueue(el) {
  if (el.matches?.(SEL)) pending.add(el);
  el.querySelectorAll?.(SEL).forEach((b) => pending.add(b));
  if (!rafId) rafId = requestAnimationFrame(flush);
}

// User input
document.addEventListener("keyup", (e) => {
  const el = e.target.closest("[contenteditable]");
  if (el) el.dir = detectDir(el.textContent);
});

// Observe DOM mutations
const observer = new MutationObserver((mutations) => {
  for (const m of mutations) {
    for (const n of m.addedNodes) {
      if (n.nodeType === Node.ELEMENT_NODE) enqueue(n);
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Existing content
document.querySelectorAll(SEL).forEach((el) => { el.dir = detectDir(el.textContent); });
