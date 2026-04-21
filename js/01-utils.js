/**
 * @file js/01-utils.js
 * @description Shared DOM helpers and utility functions
 * - DOM queries ($)
 * - String escaping (XSS prevention)
 * - Number/date formatting
 * - Toast notifications
 * - Modal dialogs
 * - Event listeners for modals + autocomplete
 */

// ──────────────────────────────────────────────────────────────────────────
// DOM HELPERS
// ──────────────────────────────────────────────────────────────────────────

/**
 * Shorthand for document.getElementById
 * @param {string} id
 * @returns {HTMLElement|null}
 */
function $(id) {
  return document.getElementById(id);
}

/**
 * Escapes HTML special characters to prevent XSS injection
 * @param {*} s - Value to escape (converted to string)
 * @returns {string} Escaped string safe for innerHTML
 */
function escapeHTML(s) {
  if (s === undefined || s === null) return '';
  return String(s).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

/**
 * Generates a unique DOM-safe identifier
 * @returns {string} Unique ID like "id_abc123_de456"
 */
function uid() {
  return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ──────────────────────────────────────────────────────────────────────────
// FORMATTING
// ──────────────────────────────────────────────────────────────────────────

/**
 * Formats a number with 3 decimal places using French locale (comma as thousands separator)
 * @param {number|string} v - Value to format
 * @returns {string} Formatted number (e.g., "1 234.567")
 */
function fmt3(v) {
  const n = Number(v) || 0;
  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  }).replace(/\s/g, ' ');
}

/**
 * Formats an ISO date string to DD/MM/YYYY
 * @param {string} iso - ISO format date (e.g., "2026-04-20")
 * @returns {string} Formatted date or empty string
 */
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Formats an ISO date string to DD/MM/YYYY HH:MM
 * @param {string} iso - ISO format datetime
 * @returns {string} Formatted datetime or empty string
 */
function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${fmtDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Returns today's date in YYYY-MM-DD format
 * @returns {string}
 */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Debounce function — delays execution until no new calls received for N milliseconds
 * @param {Function} fn - Function to debounce
 * @param {number} ms - Delay in milliseconds (default 300)
 * @returns {Function} Debounced function
 */
function debounce(fn, ms = 300) {
  let timer;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

// ──────────────────────────────────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ──────────────────────────────────────────────────────────────────────────

/**
 * Shows a temporary dismissible toast notification
 * @param {string} msg - Message text
 * @param {'success'|'error'|'warning'|''} type - Toast type (affects styling)
 */
function toast(msg, type = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  $('toasts').appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ──────────────────────────────────────────────────────────────────────────
// MODAL DIALOGS
// ──────────────────────────────────────────────────────────────────────────

/**
 * Opens the modal overlay with custom HTML content
 * @param {string} html - Inner HTML for the modal
 * @param {'lg'|''} size - Modal size class (default: normal)
 */
function openModal(html, size = '') {
  const mc = $('modal-content');
  mc.innerHTML = html;
  mc.className = 'modal ' + (size === 'lg' ? 'modal-lg' : '');
  $('modal-backdrop').classList.add('show');
}

/**
 * Closes the modal overlay
 */
function closeModal() {
  $('modal-backdrop').classList.remove('show');
}

/**
 * Opens a confirmation dialog with Yes/No buttons
 * @param {string} title - Dialog title
 * @param {string} msg - Dialog message (can include safe HTML)
 * @param {Function} onYes - Callback if user confirms
 * @param {boolean} danger - If true, confirm button is red (destructive action)
 */
function confirmModal(title, msg, onYes, danger = false) {
  openModal(`
    <div class="modal-header"><h3>${escapeHTML(title)}</h3></div>
    <div class="modal-body">${msg}</div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-yes">Confirmer</button>
    </div>
  `);
  $('confirm-yes').onclick = () => { closeModal(); onYes(); };
}

// ──────────────────────────────────────────────────────────────────────────
// EVENT LISTENERS — Modal + Autocomplete
// ──────────────────────────────────────────────────────────────────────────

// Close modal when clicking on the backdrop (not inside the modal)
$('modal-backdrop').addEventListener('click', e => {
  if (e.target.id === 'modal-backdrop') closeModal();
});

// Close all autocomplete dropdowns when clicking outside them
document.addEventListener('click', e => {
  if (!e.target.closest('.autocomplete')) {
    document.querySelectorAll('.autocomplete-list.show').forEach(el => el.classList.remove('show'));
  }
});

// ──────────────────────────────────────────────────────────────────────────
// CHART.JS LAZY LOADER
// ──────────────────────────────────────────────────────────────────────────

let chartJsPromise = null;

/**
 * Lazily loads Chart.js from CDN on first call
 * Subsequent calls return the same promise
 * @returns {Promise<void>} Resolves when Chart.js is loaded
 */
function loadChartJs() {
  if (!chartJsPromise) {
    chartJsPromise = new Promise((resolve) => {
      if (window.Chart) return resolve();
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
      s.onload = resolve;
      s.onerror = () => { chartJsPromise = null; };
      document.head.appendChild(s);
    });
  }
  return chartJsPromise;
}
