/**
 * Jasvi Industries ERP - DocumentCalculationEngine
 * Canonical arithmetic authority for every business document (Sales, Purchases, Quotations, Returns)
 * matching desktop DocumentCalculationEngine.java and InvoiceTaxCalculator.java.
 *
 * Rules:
 * - Money, sell/buy rates, document totals: 2 decimals, HALF_UP rounding
 * - Quantities: 4 decimals, HALF_UP rounding
 * - Intra-state GST: 50/50 split -> CGST = Round(Tax / 2), SGST = Tax - CGST (exact paise parity)
 * - Inter-state IGST: IGST = Tax, CGST = 0, SGST = 0
 * - Round-off: roundedGrand = Math.round(grandTotal), roundOff = roundedGrand - grandTotal
 */
window.DocumentCalculationEngine = (function() {
  'use strict';

  function roundMoney(val) {
    const num = Number(val) || 0;
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  function roundQty(val) {
    const num = Number(val) || 0;
    return Math.round((num + Number.EPSILON) * 10000) / 10000;
  }

  /**
   * Normalizes tax mode string to 'GST' (Intra-state) or 'IGST' (Inter-state)
   */
  function normalizeTaxMode(val) {
    const norm = (val || '').toString().trim().toUpperCase();
    if (['IGST', 'INTERSTATE', 'INTER STATE', 'INTER_STATE'].includes(norm)) {
      return 'IGST';
    }
    return 'GST';
  }

  /**
   * Calculates a single line item
   */
  function line(quantity, rate, discountPercent = 0, taxPercent = 0) {
    const qty = Math.max(0, roundQty(quantity));
    const unitRate = Math.max(0, roundMoney(rate));
    const discPct = Math.min(100, Math.max(0, Number(discountPercent) || 0));
    const taxPct = Math.max(0, Number(taxPercent) || 0);

    const grossAmount = roundMoney(qty * unitRate);
    const discountAmount = roundMoney(grossAmount * (discPct / 100));
    const taxableAmount = Math.max(0, roundMoney(grossAmount - discountAmount));
    const taxAmount = roundMoney(taxableAmount * (taxPct / 100));
    const totalAmount = roundMoney(taxableAmount + taxAmount);

    return {
      grossAmount,
      discountAmount,
      taxableAmount,
      taxAmount,
      totalAmount
    };
  }

  /**
   * Calculates a single additional charge
   */
  function charge(amount, taxable = false, taxPercent = 0) {
    const amt = Math.max(0, roundMoney(amount));
    const isTaxable = Boolean(taxable);
    const taxPct = isTaxable ? Math.max(0, Number(taxPercent) || 0) : 0;

    const taxableAmount = isTaxable ? amt : 0;
    const taxAmount = isTaxable ? roundMoney(amt * (taxPct / 100)) : 0;
    const totalAmount = roundMoney(amt + taxAmount);

    return {
      amount: amt,
      taxableAmount,
      taxAmount,
      totalAmount
    };
  }

  /**
   * Calculates document totals across lines, charges, and GST mode
   */
  function calculateTotals(lines = [], charges = [], taxMode = 'GST') {
    let grossItems = 0;
    let discountAmount = 0;
    let itemTaxable = 0;
    let lineTax = 0;

    (lines || []).forEach(l => {
      const res = line(l.quantity, l.rate, l.discountPercent, l.taxPercent || l.gstPercent);
      grossItems = roundMoney(grossItems + res.grossAmount);
      discountAmount = roundMoney(discountAmount + res.discountAmount);
      itemTaxable = roundMoney(itemTaxable + res.taxableAmount);
      lineTax = roundMoney(lineTax + res.taxAmount);
    });

    let chargeAmount = 0;
    let taxableCharges = 0;
    let chargeTax = 0;

    (charges || []).forEach(c => {
      const res = charge(c.amount, c.taxable, c.taxPercent || c.gstPercent);
      chargeAmount = roundMoney(chargeAmount + res.amount);
      taxableCharges = roundMoney(taxableCharges + res.taxableAmount);
      chargeTax = roundMoney(chargeTax + res.taxAmount);
    });

    const taxableAmount = roundMoney(itemTaxable + taxableCharges);
    const totalTax = roundMoney(lineTax + chargeTax);

    const mode = normalizeTaxMode(taxMode);
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (mode === 'IGST') {
      igstAmount = totalTax;
    } else {
      // Exact desktop parity: one half rounded, second half is exact remainder
      cgstAmount = roundMoney(totalTax / 2);
      sgstAmount = roundMoney(totalTax - cgstAmount);
    }

    const exactGrandTotal = roundMoney(itemTaxable + lineTax + chargeAmount + chargeTax);
    const roundedGrandTotal = Math.round(exactGrandTotal);
    const roundOff = roundMoney(roundedGrandTotal - exactGrandTotal);

    return {
      grossItems,
      discountAmount,
      itemTaxable,
      lineTax,
      chargeAmount,
      taxableCharges,
      nonTaxableCharges: roundMoney(chargeAmount - taxableCharges),
      chargeTax,
      taxableAmount,
      taxAmount: totalTax,
      cgstAmount,
      sgstAmount,
      igstAmount,
      exactGrandTotal,
      roundedGrandTotal,
      roundOff,
      grandTotal: exactGrandTotal
    };
  }

  return {
    line,
    charge,
    calculateTotals,
    roundMoney,
    roundQty,
    normalizeTaxMode
  };
})();
