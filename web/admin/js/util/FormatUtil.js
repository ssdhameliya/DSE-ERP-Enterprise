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
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      const datePart = d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timePart = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      return `${datePart} ${timePart}`;
    } catch (e) {
      return String(dateStr);
    }
  },

  formatDateISO(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  },

  formatBytes(bytes) {
    const b = parseInt(bytes, 10) || 0;
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    if (b < 1024 * 1024 * 1024) return (b / (1024 * 1024)).toFixed(2) + ' MB';
    return (b / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
};
