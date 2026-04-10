function teM(id, val) { let e = document.getElementById(id); if (e) e.textContent = val; }

// Preserves keyboard focus and cursor position across a full innerHTML re-render.
// Saves the active element's oninput/onchange attribute before calling renderFn(),
// then after rendering finds the matching element by that attribute and restores focus.
function teFocusSafe(renderFn) {
  let ae       = document.activeElement;
  let oninput  = ae ? (ae.getAttribute('oninput') || ae.getAttribute('onchange')) : null;
  let isText   = ae && (ae.type === 'text' || ae.type === 'number');
  let selStart = null, selEnd = null;
  if (isText && oninput) {
    try { selStart = ae.selectionStart; selEnd = ae.selectionEnd; } catch(e) {}
  }

  renderFn();

  if (oninput) {
    let sel      = '[oninput="' + oninput.replace(/"/g, '\\"') + '"]';
    let restored = document.querySelector(sel)
                || document.querySelector('[onchange="' + oninput.replace(/"/g, '\\"') + '"]');
    if (restored) {
      restored.focus();
      if (selStart !== null) try { restored.setSelectionRange(selStart, selEnd); } catch(e) {}
    }
  }
}

function teFmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '$0';
  return '$' + Math.round(n).toLocaleString('en-US');
}

// ── Cent-precision rounding for intermediate calc values ──────────────
function teRound(n) { return Math.round(n * 100) / 100; }
