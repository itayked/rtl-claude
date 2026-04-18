const BLOCKS = "p,li,h1,h2,h3,h4,h5,h6,blockquote,td,th,dt,dd,ol,ul";
const SEL = BLOCKS.split(",").map((s) => `:is(${s})`).join(",");

const css = document.createElement("style");
css.textContent = `
  ol[dir="rtl"], ul[dir="rtl"] {
    padding-left: 0 !important; padding-right: 2rem !important;
  }
  li[dir="rtl"] {
    padding-left: 0 !important; padding-right: 0.5rem !important;
  }
  code, pre, kbd, samp,
  .katex, .katex-display, .katex-html,
  .MathJax, .MathJax_Display {
    direction: ltr !important;
    unicode-bidi: isolate !important;
    text-align: left !important;
  }
  [dir="rtl"] a[href] { unicode-bidi: isolate; }
`;
document.head.appendChild(css);

// ============================================================
// Step 1: Weighted Majority Rule
// Hebrew×2 > adjusted Latin → RTL. Latin inside (...) excluded.
// ============================================================
const HE = /[\u0590-\u05FF]/g;
const LAT = /[A-Za-z]/g;
const PARENS = /\([^)]*\)/g;

function detectDir(text) {
  const he = (text.match(HE) || []).length;
  const stripped = text.replace(PARENS, "");
  const lat = (stripped.match(LAT) || []).length;
  return he * 2 > lat ? "rtl" : "ltr";
}

function applyDir(el) {
  const d = detectDir(el.textContent);
  el.dir = d;
  el.style.setProperty("text-align", d === "rtl" ? "right" : "left", "important");
}

// ============================================================
// Step 2: Protected Islands
// In RTL blocks, wrap continuous LTR segments in <bdi dir="ltr">
// to prevent the browser from scrambling them.
// Responses only — never touch contenteditable.
// Execution order:
//   0. Math islands (captures formulas/equations before anything else)
//   1. LTR phrase islands (captures full English phrases)
//   2. Hybrid prefixes — RTL wrap only in LTR containers
//   3. Naked prefixes (ה-, ב-) — always wrapped
// ============================================================
const PROCESSED = new WeakSet();
const SKIP = "code,pre,bdi,a,span[dir],.katex,.MathJax";

// Rule 0: Math island — captures continuous math expressions.
// Starts with a math-initiator (symbol, digit, variable, or opening bracket),
// then greedily consumes operators, variables, numbers, brackets, spaces.
// Must contain at least one math operator to qualify.
const MATH_INITIATOR = /[∫∑∏√∂∇∞≈≠≤≥±×÷∈∉⊂⊃∪∩∧∨¬∀∃∅ΔΣΠαβγδεθλμπσφωa-zA-Z0-9({\[]/;
const MATH_OPS = /[+\-*/=<>≤≥≠±×÷^∫∑∏√]/;
const MATH_ISLAND = /[∫∑∏√∂∇∞≈≠≤≥±×÷∈∉⊂⊃∪∩∧∨¬∀∃∅ΔΣΠαβγδεθλμπσφωa-zA-Z0-9({\["][a-zA-Z0-9_.,;:+\-*/=<>≤≥≠±×÷^∫∑∏√∂∇∞≈|!&~%#(){}[\]\s"'`]*[a-zA-Z0-9)}\]%"'`]/g;

// Rule 1: LTR phrase — chains English words via spaces/punctuation.
// After terminating punctuation (: . ,) + space, only bridges to a LETTER,
// not a digit. Numbers after punctuation start their own island.
// Joiner modes:
//   Operator: spaces around arrows/math ops (-> => + = etc), bridges to letter OR digit
//   Colon/comma: ": " or ", " — bridges ONLY to a letter, NOT a digit
//   Plain space: bridges ONLY to a letter
const LTR_ISLAND = /[a-zA-Z0-9~%+][a-zA-Z0-9_./:@#$%&*+=~\-<>|^\\]*(?:,\d+)*(?:\s*\([^)]*\))?(?:(?:\s*['")\-→=<>+*/]+\s*(?=[a-zA-Z0-9~%+])|[,:;.]\s+(?=[a-zA-Z~%+])|\s+(?=[a-zA-Z~%+]))[a-zA-Z0-9~%+][a-zA-Z0-9_./:@#$%&*+=~\-<>|^\\]*(?:,\d+)*(?:\s*\([^)]*\))?)*(?<![: ,])[;)}\]'%]*/g;

// Rule 2: Hybrid prefix — Hebrew + hyphen + English word (attached)
const HYBRID_ATTACHED = /[\u0590-\u05FF]{1,4}[-־–][A-Za-z0-9_]+/g;

// Rule 3: Naked prefix — Hebrew + hyphen, NOT followed by alphanumeric
const NAKED_PREFIX = /[\u0590-\u05FF]{1,4}[-־–](?![A-Za-z0-9])/g;

function isolate(el) {
  if (PROCESSED.has(el) || el.closest("[contenteditable]")) return;
  PROCESSED.add(el);

  const isRTL = el.dir === "rtl";
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const tn of nodes) {
    if (tn.parentElement.closest(SKIP)) continue;
    const text = tn.textContent;
    const ranges = [];

    // --- Rule 0: Math islands (RTL containers only, runs FIRST) ---
    if (isRTL) {
      MATH_ISLAND.lastIndex = 0;
      let mm;
      while ((mm = MATH_ISLAND.exec(text)) !== null) {
        const val = mm[0].trim();
        // Must contain at least one math operator and be non-trivial
        if (val.length < 3 || !MATH_OPS.test(val)) continue;
        // Must not be purely Hebrew
        if (/^[\u0590-\u05FF\s]+$/.test(val)) continue;
        ranges.push({ start: mm.index, end: mm.index + mm[0].length, dir: "ltr" });
      }
    }

    // --- Rule 1: LTR phrase islands (RTL containers only) ---
    if (isRTL) {
      LTR_ISLAND.lastIndex = 0;
      let m;
      while ((m = LTR_ISLAND.exec(text)) !== null) {
        const val = m[0].trim();
        if (val.length < 2 || !/[A-Za-z0-9]/.test(val)) continue;
        const covered = ranges.some((r) => r.start <= m.index && r.end >= m.index + m[0].length);
        if (covered) continue;
        // Trim trailing terminal punctuation — leave it outside the <bdi>
        let end = m.index + m[0].length;
        const trailingPunc = /[.,?!:;]+$/.exec(m[0]);
        if (trailingPunc) end -= trailingPunc[0].length;
        if (end > m.index + 1) ranges.push({ start: m.index, end, dir: "ltr" });
      }
    }

    // --- Rule 2: Hybrid attached prefixes (ONLY in LTR containers) ---
    if (!isRTL) {
      HYBRID_ATTACHED.lastIndex = 0;
      let m;
      while ((m = HYBRID_ATTACHED.exec(text)) !== null) {
        let raw = m[0];
        const punc = raw.match(/[,.:;!?]+$/);
        const len = punc ? raw.length - punc[0].length : raw.length;
        ranges.push({ start: m.index, end: m.index + len, dir: "rtl" });
      }
    }

    // --- Rule 3: Naked prefixes (ה-, ב-, ל-) — always, both directions ---
    NAKED_PREFIX.lastIndex = 0;
    let m;
    while ((m = NAKED_PREFIX.exec(text)) !== null) {
      const r = { start: m.index, end: m.index + m[0].length, dir: "rtl" };
      // Don't add if it overlaps an existing range
      const overlaps = ranges.some((e) => e.start < r.end && e.end > r.start);
      if (!overlaps) ranges.push(r);
    }

    if (!ranges.length) continue;

    // Sort by position, merge overlapping same-direction ranges
    ranges.sort((a, b) => a.start - b.start);
    const merged = [ranges[0]];
    for (let i = 1; i < ranges.length; i++) {
      const prev = merged[merged.length - 1];
      if (ranges[i].start <= prev.end && ranges[i].dir === prev.dir) {
        prev.end = Math.max(prev.end, ranges[i].end);
      } else if (ranges[i].start < prev.end) {
        // Different direction overlap — keep the earlier one
        continue;
      } else {
        merged.push(ranges[i]);
      }
    }

    // Build fragment
    const frag = document.createDocumentFragment();
    let last = 0;
    for (const r of merged) {
      if (r.start > last) frag.appendChild(document.createTextNode(text.slice(last, r.start)));
      const bdi = document.createElement("bdi");
      bdi.dir = r.dir;
      bdi.textContent = text.slice(r.start, r.end);
      frag.appendChild(bdi);
      last = r.end;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    tn.parentNode.replaceChild(frag, tn);
  }
}

// ============================================================
// Engine
// ============================================================
let pending = new Set();
let rafId = 0;

function flush() {
  rafId = 0;
  pending.forEach((el) => {
    if (!el.isConnected) return;
    applyDir(el);
    isolate(el);
  });
  pending.clear();
}

function enqueue(el) {
  if (el.tagName === "BDI") return;
  if (el.matches?.(SEL)) pending.add(el);
  el.querySelectorAll?.(SEL).forEach((b) => pending.add(b));
  if (!rafId) rafId = requestAnimationFrame(flush);
}

// Global event delegation on capture phase — survives React/ProseMirror re-renders.
// setTimeout(0) defers our DOM mutation to AFTER the framework finishes its re-render.
function applyDirToInput(el, text) {
  const d = detectDir(text);
  el.setAttribute("dir", d);
  el.style.setProperty("direction", d, "important");
  el.style.setProperty("text-align", d === "rtl" ? "right" : "left", "important");
}

function handleGlobalInput(e) {
  const target = e.target.closest('textarea, [contenteditable="true"]');
  if (!target) return;

  setTimeout(() => {
    if (target.matches("textarea")) {
      applyDirToInput(target, target.value);
    } else {
      // Contenteditable: apply per-paragraph if possible
      const blocks = target.querySelectorAll(SEL);
      if (blocks.length) {
        blocks.forEach((el) => {
          applyDirToInput(el, el.textContent);
        });
      }
      applyDirToInput(target, target.textContent);
    }
  }, 0);
}
document.addEventListener("input", handleGlobalInput, { capture: true });
document.addEventListener("keyup", handleGlobalInput, { capture: true });

const observer = new MutationObserver((mutations) => {
  for (const m of mutations) {
    for (const n of m.addedNodes) {
      if (n.nodeType === Node.ELEMENT_NODE) enqueue(n);
    }
  }
});
observer.observe(document.body, { childList: true, subtree: true });

document.querySelectorAll(SEL).forEach((el) => { applyDir(el); isolate(el); });
