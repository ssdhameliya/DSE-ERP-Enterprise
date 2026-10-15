/**
 * Jasvi Industries ERP - AmountInWordsConverter
 * Centralized Indian Rupees Amount-to-Words converter matching desktop
 * AmountInWordsConverter.java.
 *
 * Converts numeric document totals into canonical Indian banking words:
 * e.g., 1250.50 -> "ONE THOUSAND TWO HUNDRED FIFTY RUPEES AND FIFTY PAISE ONLY"
 */
window.AmountInWordsConverter = (function() {
  'use strict';

  const ONES = [
    '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
    'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN',
    'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'
  ];

  const TENS = [
    '', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'
  ];

  function twoDigits(value) {
    if (value < 20) return ONES[value];
    return TENS[Math.floor(value / 10)] + (value % 10 === 0 ? '' : ' ' + ONES[value % 10]);
  }

  function appendGroup(out, value, label) {
    if (value > 0) {
      if (out.length > 0) out.push(' ');
      out.push(twoDigits(value));
      out.push(' ');
      out.push(label);
    }
  }

  function convertInteger(n) {
    const out = [];
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const hundred = Math.floor(n / 100);
    n %= 100;

    appendGroup(out, crore, 'CRORE');
    appendGroup(out, lakh, 'LAKH');
    appendGroup(out, thousand, 'THOUSAND');
    if (hundred > 0) {
      if (out.length > 0) out.push(' ');
      out.push(ONES[hundred]);
      out.push(' HUNDRED');
    }
    if (n > 0) {
      if (out.length > 0) out.push(' ');
      out.push(twoDigits(n));
    }
    return out.join('').trim().replace(/\s+/g, ' ');
  }

  return {
    indianRupees(value) {
      const num = parseFloat(value) || 0;
      if (Math.abs(num) < 0.005) return 'ZERO RUPEES ONLY';
      if (num < 0) return 'MINUS ' + this.indianRupees(Math.abs(num));

      const fixed = num.toFixed(2);
      const parts = fixed.split('.');
      const rupees = parseInt(parts[0], 10);
      const paise = parseInt(parts[1], 10);

      const res = [];
      if (rupees > 0) {
        res.push(convertInteger(rupees));
        res.push(' RUPEES');
      }
      if (paise > 0) {
        if (res.length > 0) res.push(' AND ');
        res.push(twoDigits(paise));
        res.push(' PAISE');
      }
      res.push(' ONLY');
      return res.join('').trim().replace(/\s+/g, ' ');
    }
  };
})();
