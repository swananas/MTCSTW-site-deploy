#!/usr/bin/env node
/* scripts/check-inner-scripts.js — Build-time syntax gate for inner <script> blocks.
 *
 * BACKGROUND (2026-10-05): two homepage widgets (MORNING BRIEFING,
 * Solidarity Draw) shipped dead — each killed by a SyntaxError inside the
 * <script> block staged in its <template>. `node --check` cannot see this
 * bug class: it parses the OUTER file, where the inner script is just
 * template-literal text. The error materializes only after template-literal
 * escape processing, the way the browser receives it via insertAdjacentHTML.
 *
 * WHAT THIS DOES: for each JS file on the command line, finds every
 * template literal containing an inner <script> block, evaluates the
 * literal (exactly the browser's post-escape view), extracts each inner
 * script up to its </script>, and parses it with vm.Script (classic-script
 * goal — the browser's parse goal — with zero execution). Any SyntaxError
 * fails the build with file + line context.
 *
 * SAFETY: a template literal with LIVE ${...} interpolation is never
 * eval'd blind — it is reported and skipped (these templates are fully
 * static today; if one ever gains interpolation it gets a loud warning,
 * not a silent pass). Tagged templates are skipped the same way.
 *
 * Usage: node scripts/check-inner-scripts.js <file...>   (exit 0 clean, 1 on failure)
 * Wired into build/bundle.js (games silos) and build/bundle-core.js (core/pages).
 */
'use strict';
var fs = require('fs');
var vm = require('vm');

var files = process.argv.slice(2).filter(function (a) { return a.charAt(0) !== '-'; });
if (!files.length) {
  console.error('INNER-SCRIPT CHECK: no files given — wiring error.');
  process.exit(2);
}

var failures = 0;
var checkedScripts = 0;
var checkedFiles = 0;
var skippedCount = 0;
var warnings = [];

/* ---------- line numbers ---------- */
function lineStartsFor(src) {
  var ls = [0];
  for (var i = 0; i < src.length; i++) if (src[i] === '\n') ls.push(i + 1);
  return ls;
}
function lineOf(ls, idx) {
  var lo = 0, hi = ls.length - 1;
  while (lo < hi) {
    var mid = (lo + hi + 1) >> 1;
    if (ls[mid] <= idx) lo = mid; else hi = mid - 1;
  }
  return lo + 1; /* 1-based */
}

/* ---------- lexical scanner: find template literals, skipping strings,
   comments and regex literals so a backtick inside any of those can't
   throw the scan off ---------- */
var RE_KEYWORDS = /^(?:return|typeof|instanceof|in|of|new|delete|void|throw|case|do|else|yield|await)$/;

function isSpace(c) {
  return c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === '\v' || c === '\u00a0';
}

/* Heuristic: is the '/' at slashIdx the start of a regex literal? True
   unless the previous significant char is an identifier char, ')' or ']'
   (with a keyword exception: `return /x/`, `typeof /x/`...). */
function isRegexStart(src, slashIdx) {
  var j = slashIdx - 1;
  while (j >= 0 && isSpace(src[j])) j--;
  if (j < 0) return true;
  var c = src[j];
  if (/[a-zA-Z0-9_$\]\)]/.test(c)) {
    if (/[a-zA-Z_$]/.test(c)) {
      var k = j;
      while (k >= 0 && /[a-zA-Z0-9_$]/.test(src[k])) k--;
      if (RE_KEYWORDS.test(src.slice(k + 1, j + 1))) return true;
    }
    return false;
  }
  return true;
}

function skipRegex(src, i) { /* src[i] === '/' */
  var n = src.length, j = i + 1, cls = false;
  while (j < n) {
    var c = src[j];
    if (c === '\\') { j += 2; continue; }
    if (c === '[') { cls = true; j++; continue; }
    if (c === ']' && cls) { cls = false; j++; continue; }
    if (c === '/' && !cls) {
      j++;
      while (j < n && /[a-z]/i.test(src[j])) j++;
      return j;
    }
    if (c === '\n' || c === '\r') return j; /* unterminated — bail */
    j++;
  }
  return j;
}

function skipString(src, i) { /* src[i] is ' or " */
  var q = src[i], n = src.length, j = i + 1;
  while (j < n) {
    var c = src[j];
    if (c === '\\') { j += 2; continue; }
    if (c === q) return j + 1;
    if (c === '\n' || c === '\r') return j; /* unterminated — bail */
    j++;
  }
  return j;
}

/* Parse the single template literal starting at src[j] === '`'.
   Returns {start, end, hasInterp} — end is past the closing backtick. */
function parseTemplateAt(src, j) {
  var n = src.length;
  var hasInterp = false, k = j + 1;
  var inExpr = false;
  var stack = []; /* brace depth inside ${...} */
  while (k < n) {
    var ch = src[k];
    if (inExpr) {
      if (ch === '"' || ch === "'") { k = skipString(src, k); continue; }
      if (ch === '`') { var nt = parseTemplateAt(src, k); k = nt.end; if (nt.hasInterp) hasInterp = true; continue; }
      if (ch === '/' && src[k + 1] === '/') { while (k < n && src[k] !== '\n') k++; continue; }
      if (ch === '/' && src[k + 1] === '*') {
        k += 2;
        while (k < n && !(src[k] === '*' && src[k + 1] === '/')) k++;
        k += 2;
        continue;
      }
      if (ch === '/' && isRegexStart(src, k)) { k = skipRegex(src, k); continue; }
      if (ch === '{') { stack.push(1); k++; continue; }
      if (ch === '}') {
        if (!stack.length) { inExpr = false; k++; continue; }
        stack.pop(); k++; continue;
      }
      k++;
      continue;
    }
    if (ch === '\\') { k += 2; continue; }
    if (ch === '`') return { start: j, end: k + 1, hasInterp: hasInterp };
    if (ch === '$' && src[k + 1] === '{') { hasInterp = true; inExpr = true; k += 2; continue; }
    k++;
  }
  return { start: j, end: k, hasInterp: hasInterp };
}

/* Returns [{start, end, hasInterp}] — raw spans INCLUDING the backticks.
   hasInterp is conservative: ANY ${...} anywhere in the literal means we
   must not eval it blind (a substituted value is runtime data, not static
   text), so the literal is reported and skipped instead. */
function findTemplates(src) {
  var n = src.length;
  var templates = [];

  var i = 0;
  while (i < n) {
    var c = src[i];
    if (c === '"' || c === "'") { i = skipString(src, i); continue; }
    if (c === '`') {
      var t = parseTemplateAt(src, i);
      templates.push({ start: t.start, end: t.end, hasInterp: t.hasInterp });
      i = t.end;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === '/' && isRegexStart(src, i)) { i = skipRegex(src, i); continue; }
    i++;
  }
  return templates;
}

/* ---------- inner <script> extraction from the COOKED template ----------
   (cooked = exactly what insertAdjacentHTML hands the browser's parser) */
var OPEN_RE = /<script\b[^>]*>/gi;

function innerScriptsOf(cooked) {
  var scripts = [];
  var lower = cooked.toLowerCase();
  OPEN_RE.lastIndex = 0;
  var m;
  while ((m = OPEN_RE.exec(cooked)) !== null) {
    var contentStart = m.index + m[0].length;
    var closeIdx = lower.indexOf('</script', contentStart);
    scripts.push({
      openIndex: m.index,
      contentStart: contentStart,
      closeIndex: closeIdx,
      src: closeIdx === -1 ? cooked.slice(contentStart) : cooked.slice(contentStart, closeIdx)
    });
    if (closeIdx === -1) break;
    OPEN_RE.lastIndex = closeIdx + 8;
  }
  return scripts;
}

function isProbablyTagged(src, tStart) {
  var b = tStart - 1;
  while (b >= 0 && isSpace(src[b])) b--;
  if (b < 0 || !/[a-zA-Z0-9_$)\]]/.test(src[b])) return false;
  /* A keyword (return/typeof/...) before the backtick is not a tag. */
  if (/[a-zA-Z_$]/.test(src[b])) {
    var k = b;
    while (k >= 0 && /[a-zA-Z0-9_$]/.test(src[k])) k--;
    if (RE_KEYWORDS.test(src.slice(k + 1, b + 1)) ||
        /^(?:if|for|while|switch|with|function|class)$/.test(src.slice(k + 1, b + 1))) return false;
  }
  return true;
}

function innerLineOf(err) {
  var m = /:(\d+)(?:\n|$)/.exec(String((err && err.stack) || ''));
  return m ? parseInt(m[1], 10) : 0;
}

function failBlock(lines) {
  failures++;
  console.error(lines.join('\n'));
}

/* Evaluate one static template literal OR string literal raw source
   (including delimiters) to its cooked value. Returns {ok, value, why}. */
function evalStaticLiteral(raw) {
  try {
    var v = new Function('return (' + raw + ');')(); /* eslint-disable-line no-new-func */
    if (typeof v !== 'string') return { ok: false, why: 'did not evaluate to a string' };
    return { ok: true, value: v };
  } catch (e) {
    return { ok: false, why: String((e && e.message) || e) };
  }
}

/* Skip whitespace and comments from index j. Returns new index. */
function skipWsComments(src, j) {
  var n = src.length;
  while (j < n) {
    var c = src[j];
    if (isSpace(c)) { j++; continue; }
    if (c === '/' && src[j + 1] === '/') { while (j < n && src[j] !== '\n') j++; continue; }
    if (c === '/' && src[j + 1] === '*') {
      j += 2;
      while (j < n && !(src[j] === '*' && src[j + 1] === '/')) j++;
      j += 2;
      continue;
    }
    break;
  }
  return j;
}

files.forEach(function (file) {
  var src;
  try {
    src = fs.readFileSync(file, 'utf8');
  } catch (e) {
    failBlock(['INNER-SCRIPT SYNTAX FAIL: ' + file, '  cannot read file: ' + (e.message || e)]);
    return;
  }
  checkedFiles++;
  var ls = lineStartsFor(src);
  var templates = findTemplates(src);

  templates.forEach(function (t) {
    var raw = src.slice(t.start, t.end);
    if (raw.toLowerCase().indexOf('<script') === -1) return;
    var tplLine = lineOf(ls, t.start);

    if (t.hasInterp || isProbablyTagged(src, t.start)) {
      skippedCount++;
      warnings.push('WARN: ' + file + ':' + tplLine +
        ' — template with <script> ' +
        (t.hasInterp ? 'has live ${...} interpolation' : 'looks like a tagged template') +
        '; inner script NOT statically verified.');
      return;
    }

    /* Reconstruct the full HTML fragment: the staging call often splits
       the closing </script> across `+`-chained literals
       (`...</scr` + `ipt>...`) so the raw outer <script> element never
       contains a literal "</script". The browser receives the
       CONCATENATED cooked text — so must we. */
    var cooked = '';
    var j = t.start;
    var chainOk = true, chainWhy = '';
    var firstRaw = '';
    for (;;) {
      var lit;
      if (src[j] === '`') {
        var pt = (j === t.start)
          ? { start: t.start, end: t.end, hasInterp: t.hasInterp }
          : parseTemplateAt(src, j);
        if (pt.hasInterp || isProbablyTagged(src, pt.start)) {
          chainOk = false;
          chainWhy = 'continuation literal ' +
            (pt.hasInterp ? 'has live ${...} interpolation' : 'looks tagged');
          break;
        }
        lit = evalStaticLiteral(src.slice(pt.start, pt.end));
        if (j === t.start) firstRaw = src.slice(pt.start, pt.end);
        j = pt.end;
      } else if (src[j] === '"' || src[j] === "'") {
        var se = skipString(src, j);
        lit = evalStaticLiteral(src.slice(j, se));
        j = se;
      } else {
        chainOk = false; chainWhy = 'unexpected operand';
        break;
      }
      if (!lit.ok) { chainOk = false; chainWhy = lit.why; break; }
      cooked += lit.value;
      var nj = skipWsComments(src, j);
      if (src[nj] === '+') {
        j = skipWsComments(src, nj + 1);
        if (src[j] !== '`' && src[j] !== '"' && src[j] !== "'") {
          chainOk = false; chainWhy = 'chain continues into non-literal operand';
          break;
        }
        continue;
      }
      break;
    }
    if (!chainOk) {
      skippedCount++;
      warnings.push('WARN: ' + file + ':' + tplLine +
        ' — could not reconstruct staged HTML (' + chainWhy + '); inner script NOT statically verified.');
      return;
    }
    if (typeof cooked !== 'string' || !cooked) return;

    var scripts = innerScriptsOf(cooked);
    if (!scripts.length) return;

    /* Map each cooked open-tag back to its raw position for line numbers.
       (Counts agree in practice; fall back to the template line if not.) */
    var rawOpens = [];
    var rre = /<script\b[^>]*>/gi, rm;
    while ((rm = rre.exec(firstRaw)) !== null) rawOpens.push({ index: rm.index, len: rm[0].length });

    scripts.forEach(function (s, si) {
      var label = file + ' [inner <script> #' + (si + 1) + ']';
      var contentLine0 = tplLine; /* 1-based outer line of the inner script's first line */
      if (rawOpens.length === scripts.length) {
        contentLine0 = lineOf(ls, t.start + rawOpens[si].index + rawOpens[si].len);
      }

      if (s.closeIndex === -1) {
        failBlock([
          'INNER-SCRIPT SYNTAX FAIL: ' + label,
          '  template literal at line ' + tplLine + ' — inner <script> has NO closing </script>.',
          '  The browser would swallow the rest of the template; the widget never boots.'
        ]);
        return;
      }

      checkedScripts++;
      try {
        /* Classic-script parse goal, exactly like the browser — no execution. */
        new vm.Script(s.src, { filename: label });
      } catch (e) {
        var innerLine = innerLineOf(e);
        var approxOuter = innerLine ? contentLine0 + innerLine - 1 : contentLine0;
        var srcLines = s.src.split(/\r?\n/);
        var ctx = [];
        var from = Math.max(1, innerLine - 3), to = Math.min(srcLines.length, innerLine + 3);
        for (var L = from; L <= to; L++) {
          var marker = (L === innerLine) ? '>>>' : '   ';
          ctx.push('  ' + marker + ' inner:' + L + ' (~file:' + (contentLine0 + L - 1) + ') | ' +
            srcLines[L - 1].slice(0, 160));
        }
        failBlock([
          'INNER-SCRIPT SYNTAX FAIL: ' + label,
          '  template literal at line ' + tplLine + '; inner script starts ~line ' + contentLine0 + '.',
          '  ' + String((e && e.message) || e).split('\n')[0] +
            ' (inner line ' + (innerLine || '?') + ' ≈ file line ' + approxOuter + ')',
          '  context (inner-script text as the browser receives it):'
        ].concat(ctx));
      }
    });
  });
});

console.log('check-inner-scripts: ' + checkedFiles + ' files, ' + checkedScripts +
  ' inner <script> block(s) parsed OK' +
  (skippedCount ? ', ' + skippedCount + ' skipped (warnings below)' : '') + '.');
warnings.forEach(function (w) { console.error(w); });

if (failures) {
  console.error('INNER-SCRIPT CHECK FAILED: ' + failures + ' broken inner script block(s). Fix the widget source and rebuild.');
  process.exit(1);
}
