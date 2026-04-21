/**
 * @file js/02-num2words.js
 * @description Converts numeric amounts to French words (dinars + millimes)
 * Used in invoice editor (totals display) and PDF generation
 */

/**
 * Converts a numeric amount to uppercase French text
 * Example: 1234.567 → "MILLE DEUX CENT TRENTE QUATRE DINARS ET CINQ CENT SOIXANTE SEPT MILLIMES"
 * @param {number} amount - Amount in dinars (with decimal millimes)
 * @returns {string} French text representation in uppercase
 */
function num2wordsFR(amount) {
  const unit = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teen = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

  /**
   * Converts an integer to its French word representation
   * @param {number} n
   * @returns {string}
   */
  function convert(n) {
    if (n === 0) return 'zéro';
    if (n < 10) return unit[n];
    if (n < 20) return teen[n - 10];
    if (n < 70) {
      const d = Math.floor(n / 10), u = n % 10;
      return tens[d] + (u === 1 ? ' et un' : (u > 0 ? '-' + unit[u] : ''));
    }
    if (n < 80) {
      const r = n - 60;
      return 'soixante' + (r === 11 ? ' et onze' : '-' + (r < 10 ? unit[r] : teen[r - 10]));
    }
    if (n < 100) {
      const r = n - 80;
      return 'quatre-vingt' + (r === 0 ? 's' : '-' + (r < 10 ? unit[r] : teen[r - 10]));
    }
    if (n < 1000) {
      const c = Math.floor(n / 100), r = n % 100;
      const cs = c === 1 ? 'cent' : unit[c] + ' cent' + (r === 0 ? 's' : '');
      return cs + (r > 0 ? ' ' + convert(r) : '');
    }
    if (n < 1000000) {
      const m = Math.floor(n / 1000), r = n % 1000;
      const ms = m === 1 ? 'mille' : convert(m) + ' mille';
      return ms + (r > 0 ? ' ' + convert(r) : '');
    }
    if (n < 1000000000) {
      const M = Math.floor(n / 1000000), r = n % 1000000;
      const Ms = M === 1 ? 'un million' : convert(M) + ' millions';
      return Ms + (r > 0 ? ' ' + convert(r) : '');
    }
    return 'nombre trop grand';
  }

  amount = Number(amount) || 0;
  const dinars = Math.floor(amount);
  const millimes = Math.round((amount - dinars) * 1000);

  let text = convert(dinars) + (dinars > 1 ? ' dinars' : ' dinar');
  if (millimes > 0) {
    text += ' et ' + convert(millimes) + (millimes > 1 ? ' millimes' : ' millime');
  }
  return text.toUpperCase();
}
