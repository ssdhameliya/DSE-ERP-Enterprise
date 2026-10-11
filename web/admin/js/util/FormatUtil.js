/**
 * Jasvi Industries ERP - FormatUtil
 * Enterprise number, currency, and date formatting
 */
window.FormatUtil = {
  formatRupees(amount) {
    const val = parseFloat(amount) || 0;
    return '₹ ' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  formatNumber(val) {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-IN');
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  },

  formatTime(dateStr) {
    try {
      const d = dateStr ? new Date(dateStr) : new Date();
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    } catch (e) {
      return '';
    }
  }
};
