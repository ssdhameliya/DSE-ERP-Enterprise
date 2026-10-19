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
    },

    /**
     * Universal Client-Side Tabular PDF Generator
     * Generates standard PDF 1.4 binary file matching desktop export specifications
     * Downloads directly without triggering browser print dialogs.
     */
    downloadTablePdf(title, headers, rows, filename = 'Export.pdf', meta = {}) {
      try {
        const cleanTitle = (title || 'Report').trim();
        const genDate = this.formatDateTime ? this.formatDateTime(new Date()) : new Date().toLocaleString();
        const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

        // PDF dimensions: A4 Landscape (841.89 pt width, 595.28 pt height)
        const pageWidth = 841.89;
        const pageHeight = 595.28;
        const marginX = 36;
        const marginTop = 40;
        const marginBottom = 40;
        const contentWidth = pageWidth - (marginX * 2);

        // Escape PDF special characters
        const esc = (str) => {
          if (str == null) return '';
          return String(str)
            .replace(/\\/g, '\\\\')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/[^\x20-\x7E]/g, ' '); // Keep printable ASCII
        };

        const numCols = Math.max(1, headers.length);
        const colWidth = contentWidth / numCols;
        const rowHeight = 18;
        const headerHeight = 22;
        const rowsPerPage = 22;

        const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
        const pages = [];

        for (let p = 0; p < totalPages; p++) {
          const pageRows = rows.slice(p * rowsPerPage, (p + 1) * rowsPerPage);
          let stream = '';

          // 1. Header Banner & Branding
          stream += `0.15 0.23 0.42 rg\n`; // Dark blue
          stream += `BT /F1 14 Tf ${marginX} ${pageHeight - marginTop} Td (${esc(cleanTitle)}) Tj ET\n`;
          
          stream += `0.4 0.45 0.5 rg\n`;
          stream += `BT /F2 8 Tf ${marginX} ${pageHeight - marginTop - 12} Td (JASVI INDUSTRIES ERP - Precision Fasteners & Piping | Generated: ${esc(genDate)}) Tj ET\n`;

          // Page Number
          const pageStr = `Page ${p + 1} of ${totalPages}`;
          stream += `BT /F2 8 Tf ${pageWidth - marginX - 60} ${pageHeight - marginTop} Td (${esc(pageStr)}) Tj ET\n`;

          // Top divider line
          stream += `0.85 0.88 0.92 RG 1 w\n`;
          stream += `${marginX} ${pageHeight - marginTop - 18} m ${pageWidth - marginX} ${pageHeight - marginTop - 18} l S\n`;

          // 2. Table Headers
          let currentY = pageHeight - marginTop - 24;
          
          // Header Background
          stream += `0.93 0.95 0.98 rg\n`;
          stream += `${marginX} ${currentY - headerHeight} ${contentWidth} ${headerHeight} re f\n`;
          stream += `0.75 0.8 0.88 RG 1 w\n`;
          stream += `${marginX} ${currentY - headerHeight} ${contentWidth} ${headerHeight} re S\n`;

          // Header Text
          stream += `0.1 0.15 0.25 rg\n`;
          headers.forEach((h, idx) => {
            const x = marginX + (idx * colWidth) + 6;
            const textY = currentY - 15;
            stream += `BT /F1 8.5 Tf ${x} ${textY} Td (${esc(h).substring(0, Math.floor(colWidth / 5.5))}) Tj ET\n`;
          });

          currentY -= headerHeight;

          // 3. Table Rows
          pageRows.forEach((row, rIdx) => {
            const isEven = rIdx % 2 === 0;
            const rowY = currentY - rowHeight;

            // Zebra background
            if (isEven) {
              stream += `0.98 0.99 1.0 rg\n`;
              stream += `${marginX} ${rowY} ${contentWidth} ${rowHeight} re f\n`;
            }

            // Cell bottom border
            stream += `0.9 0.92 0.95 RG 0.5 w\n`;
            stream += `${marginX} ${rowY} m ${pageWidth - marginX} ${rowY} l S\n`;

            // Row text
            stream += `0.15 0.18 0.22 rg\n`;
            (row || []).forEach((cell, cIdx) => {
              if (cIdx >= numCols) return;
              const x = marginX + (cIdx * colWidth) + 6;
              const textY = rowY + 5;
              const val = esc(cell != null ? String(cell) : '-').substring(0, Math.floor(colWidth / 5.5));
              stream += `BT /F2 8 Tf ${x} ${textY} Td (${val}) Tj ET\n`;
            });

            currentY -= rowHeight;
          });

          // Outer table border
          stream += `0.75 0.8 0.88 RG 1 w\n`;
          const tableHeight = headerHeight + (pageRows.length * rowHeight);
          stream += `${marginX} ${currentY} ${contentWidth} ${tableHeight} re S\n`;

          // 4. Footer Note
          stream += `0.55 0.6 0.65 rg\n`;
          stream += `BT /F2 7.5 Tf ${marginX} ${marginBottom} Td (Confidential - Jasvi Industries Management Portal - Authoritative System Export) Tj ET\n`;

          pages.push(stream);
        }

        // Build valid PDF Document Structure
        let pdf = `%PDF-1.4\n`;
        const objects = [];

        // Obj 1: Catalog
        objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

        // Obj 2: Pages
        const kids = [];
        for (let i = 0; i < totalPages; i++) {
          kids.push(`${4 + (i * 2)} 0 R`);
        }
        objects.push(`2 0 obj\n<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${totalPages} >>\nendobj\n`);

        // Obj 3: Font Resources
        objects.push(`3 0 obj\n<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>\nendobj\n`);

        // Pages and Content Streams
        for (let i = 0; i < totalPages; i++) {
          const pageObjNum = 4 + (i * 2);
          const streamObjNum = pageObjNum + 1;
          const streamContent = pages[i];
          const streamLen = streamContent.length;

          // Page Obj
          objects.push(`${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources 3 0 R /Contents ${streamObjNum} 0 R >>\nendobj\n`);

          // Stream Obj
          objects.push(`${streamObjNum} 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream\nendobj\n`);
        }

        // Assemble with Byte Offsets
        const xref = [];
        let offset = pdf.length;
        xref.push('0000000000 65535 f \n');

        for (let i = 0; i < objects.length; i++) {
          xref.push(String(offset).padStart(10, '0') + ' 00000 n \n');
          pdf += objects[i];
          offset += objects[i].length;
        }

        const xrefOffset = offset;
        pdf += `xref\n0 ${objects.length + 1}\n${xref.join('')}`;
        pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

        // Trigger Direct File Download via Blob
        const blob = new Blob([pdf], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = safeFilename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);

        if (window.AudioSynthesizer && typeof window.AudioSynthesizer.playSuccess === 'function') {
          window.AudioSynthesizer.playSuccess();
        }
        if (window.AppDialogService) {
          window.AppDialogService.toastSuccess(`Downloaded PDF: ${safeFilename}`);
        }
      } catch (err) {
        console.error('[FormatUtil] downloadTablePdf error:', err);
        if (window.AppDialogService) {
          window.AppDialogService.toastError(`Could not generate PDF: ${err.message}`);
        }
      }
    }
  };
})();
