/**
 * Jasvi Industries ERP - FormatUtil
 * Enterprise number, currency, and date/time formatting synchronized with desktop business policy.
 */
(function() {
  function getCached(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch (e) {
      return fallback;
    }
  }

  function setCached(key, val) {
    try {
      if (val) localStorage.setItem(key, val);
      else localStorage.removeItem(key);
    } catch (e) {}
  }

  window.FormatUtil = {
    _dateFormat: getCached('dse_dateFormat', 'dd/MM/yyyy'),
    _timeFormat: getCached('dse_timeFormat', 'hh:mm a'),
    _timeZone: getCached('dse_timeZone', 'Asia/Kolkata'),

    setBusinessPolicy(dateFormat, timeFormat, timeZone) {
      if (dateFormat) {
        this._dateFormat = this.normalizeDateFormat(dateFormat);
        setCached('dse_dateFormat', this._dateFormat);
      }
      if (timeFormat) {
        this._timeFormat = this.normalizeTimeFormat(timeFormat);
        setCached('dse_timeFormat', this._timeFormat);
      }
      if (timeZone) {
        this._timeZone = timeZone.trim();
        setCached('dse_timeZone', this._timeZone);
      }
    },

    normalizeDateFormat(fmt) {
      if (!fmt) return 'dd/MM/yyyy';
      const s = fmt.trim();
      const u = s.toUpperCase();
      if (u === 'DD-MM-YYYY') return 'dd-MM-yyyy';
      if (u === 'DD/MM/YYYY') return 'dd/MM/yyyy';
      if (u === 'YYYY-MM-DD') return 'yyyy-MM-dd';
      if (u === 'MM/DD/YYYY') return 'MM/dd/yyyy';
      if (u === 'DD MMM YYYY' || u === 'DD-MMM-YYYY') return 'dd MMM yyyy';
      return s;
    },

    normalizeTimeFormat(fmt) {
      if (!fmt) return 'hh:mm a';
      const s = fmt.trim();
      if (s === '12-hour' || s === '12h' || s === '12_HOUR') return 'hh:mm a';
      if (s === '24-hour' || s === '24h' || s === '24_HOUR') return 'HH:mm';
      if (s === 'hh:mm a' || s === 'hh:mm:ss a' || s === 'HH:mm' || s === 'HH:mm:ss') return s;
      return s;
    },

    parseDate(val) {
      if (!val) return null;
      if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
      if (typeof val === 'number') {
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      }
      const s = String(val).trim();
      if (!s) return null;
      // Match ISO: YYYY-MM-DD or full timestamp
      const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
      if (isoMatch) {
        const d = new Date(s);
        if (!isNaN(d.getTime())) return d;
        const y = parseInt(isoMatch[1], 10);
        const m = parseInt(isoMatch[2], 10) - 1;
        const day = parseInt(isoMatch[3], 10);
        const hh = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0;
        const mm = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
        const ss = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;
        return new Date(y, m, day, hh, mm, ss);
      }
      // Match DD/MM/YYYY or DD-MM-YYYY
      const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
      if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10);
        const m = parseInt(dmyMatch[2], 10) - 1;
        const y = parseInt(dmyMatch[3], 10);
        const hh = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
        const mm = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
        const ss = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
        return new Date(y, m, day, hh, mm, ss);
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    },

    formatRupees(amount) {
      const val = parseFloat(amount) || 0;
      return '₹ ' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    amountInWords(amount) {
      if (window.AmountInWordsConverter) {
        return window.AmountInWordsConverter.indianRupees(amount);
      }
      return '';
    },

    formatNumber(val) {
      const num = parseFloat(val) || 0;
      return num.toLocaleString('en-IN');
    },

    formatDate(dateStr, pattern) {
      if (!dateStr) return '-';
      const d = this.parseDate(dateStr);
      if (!d) return String(dateStr);

      const fmt = pattern ? this.normalizeDateFormat(pattern) : this._dateFormat;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthsShort[d.getMonth()];

      switch (fmt) {
        case 'dd-MM-yyyy':
          return `${day}-${month}-${year}`;
        case 'yyyy-MM-dd':
          return `${year}-${month}-${day}`;
        case 'MM/dd/yyyy':
          return `${month}/${day}/${year}`;
        case 'dd MMM yyyy':
          return `${day} ${monthName} ${year}`;
        case 'dd/MM/yyyy':
        default:
          return `${day}/${month}/${year}`;
      }
    },

    formatTime(dateStr, pattern) {
      const d = dateStr ? this.parseDate(dateStr) : new Date();
      if (!d) return '';

      const fmt = pattern ? this.normalizeTimeFormat(pattern) : this._timeFormat;
      const hours24 = d.getHours();
      const hours12 = hours24 % 12 || 12;
      const hh12 = String(hours12).padStart(2, '0');
      const hh24 = String(hours24).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      const ampm = hours24 >= 12 ? 'PM' : 'AM';

      switch (fmt) {
        case 'hh:mm:ss a':
          return `${hh12}:${mm}:${ss} ${ampm}`;
        case 'HH:mm':
          return `${hh24}:${mm}`;
        case 'HH:mm:ss':
          return `${hh24}:${mm}:${ss}`;
        case 'hh:mm a':
        default:
          return `${hh12}:${mm} ${ampm}`;
      }
    },

    formatDateTime(dateStr) {
      if (!dateStr) return '-';
      const d = this.parseDate(dateStr);
      if (!d) return String(dateStr);
      return `${this.formatDate(d)} ${this.formatTime(d)}`;
    },

    formatDateISO(dateStr) {
      if (!dateStr) return '';
      try {
        const d = this.parseDate(dateStr);
        if (!d) return '';
        return d.toISOString().split('T')[0];
      } catch (e) {
        return '';
      }
    },

    getTimeZoneAbbr() {
      const tz = this._timeZone || 'Asia/Kolkata';
      if (tz.includes('IST') || tz.includes('Kolkata')) return 'IST';
      if (tz.includes('UTC')) return 'UTC';
      if (tz.includes('GST') || tz.includes('Dubai')) return 'GST';
      try {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(new Date());
        const zonePart = parts.find(p => p.type === 'timeZoneName');
        return zonePart ? zonePart.value : tz;
      } catch (e) {
        return tz;
      }
    },

    formatBytes(bytes) {
      const b = parseInt(bytes, 10) || 0;
      if (b < 1024) return b + ' B';
      if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
      if (b < 1024 * 1024 * 1024) return (b / (1024 * 1024)).toFixed(2) + ' MB';
      return (b / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    },

    /**
     * Canonical Due Status calculation matching Desktop SalesListController.java:dueLabel
     * and PurchaseListController.java:due.
     */
    getDueInfo(record) {
      if (!record) return { text: 'Not set', pillClass: 'pill-neutral', icon: '📅' };
      const doc = String(record.documentStatus || '').toUpperCase();
      if (doc.includes('DELETE')) return { text: 'Deleted', pillClass: 'pill-danger', icon: '🗑️' };
      if (doc.includes('CANCEL')) return { text: 'Cancelled', pillClass: 'pill-danger', icon: '✕' };

      // Return Workflow payment status check (matches Desktop dueLabel & due)
      const payment = String(record.paymentStatus || (record.returnSettlement && record.returnSettlement.status) || '').toUpperCase().trim();
      if (payment === 'RETURN APPROVAL PENDING' || payment.includes('APPROVAL PENDING')) {
        return { text: 'Awaiting Approval', pillClass: 'pill-warning', icon: '⏰' };
      }
      if (payment === 'RETURN PAID') {
        return { text: 'Settled', pillClass: 'pill-success', icon: '✔' };
      }
      if (payment === 'RETURN PENDING' || payment === 'RETURN PARTIAL' || (record.hasReturnSettlement && (Number(record.returnPendingAmount || 0) > 0 || record.returnDueDate))) {
        const rDueStr = record.returnDueDate || (record.returnSettlement && (record.returnSettlement.dueDate || record.returnSettlement.returnDueDate));
        if (!rDueStr) return { text: 'Return Due', pillClass: 'pill-warning', icon: '⏰' };
        try {
          const today = new Date(); today.setHours(0,0,0,0);
          const rDue = new Date(rDueStr); rDue.setHours(0,0,0,0);
          if (isNaN(rDue.getTime())) return { text: 'Return Due', pillClass: 'pill-warning', icon: '⏰' };
          const d = Math.round((rDue - today) / (1000 * 60 * 60 * 24));
          if (d < 0) {
            return { text: `Return Overdue by ${Math.abs(d)} days`, pillClass: 'pill-danger', icon: '⚠️' };
          } else if (d === 0) {
            return { text: 'Return Due Today', pillClass: 'pill-warning', icon: '📅' };
          } else if (d <= 7) {
            return { text: `Return Due in ${d} Days`, pillClass: 'pill-warning', icon: '⏰' };
          } else {
            return { text: `Return Due in ${d} Days`, pillClass: 'pill-info', icon: '📅' };
          }
        } catch (_) {
          return { text: 'Return Due', pillClass: 'pill-warning', icon: '⏰' };
        }
      }

      // Normal invoice balance check
      const grandTotal = Number(record.totalAmount != null ? record.totalAmount : (record.total != null ? record.total : (record.amount != null ? record.amount : 0)));
      const paid = Number(record.paidAmount != null ? record.paidAmount : (payment === 'PAID' ? grandTotal : 0));
      const balance = Number(record.balanceAmount != null ? record.balanceAmount : Math.max(0, grandTotal - paid));
      if (balance <= 0.01) {
        return { text: 'Settled', pillClass: 'pill-success', icon: '✔' };
      }

      const dueStr = record.dueDate || record.paymentDueDate;
      if (!dueStr) {
        return { text: 'Not set', pillClass: 'pill-neutral', icon: '📅' };
      }

      try {
        const today = new Date(); today.setHours(0,0,0,0);
        const invDue = new Date(dueStr); invDue.setHours(0,0,0,0);
        if (isNaN(invDue.getTime())) return { text: 'Not set', pillClass: 'pill-neutral', icon: '📅' };
        const d = Math.round((invDue - today) / (1000 * 60 * 60 * 24));
        if (d < 0) {
          return { text: `Overdue by ${Math.abs(d)} days`, pillClass: 'pill-danger', icon: '⚠️' };
        } else if (d === 0) {
          return { text: 'Due today', pillClass: 'pill-warning', icon: '📅' };
        } else if (d <= 7) {
          return { text: `Due in ${d} days`, pillClass: 'pill-warning', icon: '⏰' };
        } else {
          return { text: `Due in ${d} days`, pillClass: 'pill-info', icon: '📅' };
        }
      } catch (_) {
        return { text: 'Not set', pillClass: 'pill-neutral', icon: '📅' };
      }
    },

    /**
     * Renders exact SemanticTableCells.dueDate() pill badge
     */
    renderDueBadge(record) {
      const info = this.getDueInfo(record);
      return `<span class="pill-badge ${info.pillClass}" style="white-space:nowrap;">${info.icon} ${info.text}</span>`;
    },

    /**
     * Canonical Payment Status string matching Desktop paymentStatusDisplay
     */
    getPaymentStatusDisplay(record) {
      if (!record) return '';
      const raw = String(record.paymentStatus || (record.returnSettlement && record.returnSettlement.status) || '').trim().toUpperCase();
      if (raw === 'RETURN APPROVAL PENDING') return 'Return Pending Approval';
      if (raw === 'RETURN PAID') return 'Return Paid';
      if (raw === 'RETURN PARTIAL') return 'Return Partial';
      if (raw === 'RETURN PENDING') return 'Return Pending';
      if (raw) return raw;
      const total = Number(record.totalAmount != null ? record.totalAmount : (record.total != null ? record.total : (record.amount != null ? record.amount : 0)));
      const paid = Number(record.paidAmount != null ? record.paidAmount : 0);
      const bal = Number(record.balanceAmount != null ? record.balanceAmount : Math.max(0, total - paid));
      if (bal <= 0.01) return 'PAID';
      if (paid > 0.01) return 'PARTIAL';
      if (record.dueDate) {
        const today = new Date(); today.setHours(0,0,0,0);
        const d = new Date(record.dueDate); d.setHours(0,0,0,0);
        if (!isNaN(d.getTime()) && d < today) return 'OVERDUE';
      }
      return 'PENDING';
    },

    /**
     * Renders exact SemanticTableCells.status("payment") pill badge
     */
    renderPaymentStatusBadge(record) {
      const display = this.getPaymentStatusDisplay(record);
      const v = display.toUpperCase();
      if (v.includes('OVERDUE') || v.includes('FAIL')) {
        return `<span class="pill-badge pill-danger" style="white-space:nowrap;">⚠️ ${display}</span>`;
      }
      if (v.includes('PAID') || v.includes('SETTLED') || v.includes('COMPLETE')) {
        return `<span class="pill-badge pill-success" style="white-space:nowrap;">💳 ${display}</span>`;
      }
      if (v.includes('PARTIAL')) {
        return `<span class="pill-badge pill-info" style="white-space:nowrap;">🌗 ${display}</span>`;
      }
      if (v.includes('PENDING') || v.includes('OPEN') || v.includes('DUE') || v.includes('WAIT')) {
        return `<span class="pill-badge pill-warning" style="white-space:nowrap;">⏱ ${display}</span>`;
      }
      return `<span class="pill-badge pill-neutral" style="white-space:nowrap;">${display || 'UNPAID'}</span>`;
    }
  };
})();
