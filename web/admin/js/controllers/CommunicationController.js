/**
 * Jasvi Industries ERP - CommunicationController
 * Desktop Parity Implementation for CommunicationCenter.fxml & CommunicationCenterController.java
 * Track invoice emails, WhatsApp activity and delivery failures
 */
window.CommunicationController = (function() {
  let communications = [];
  let filteredCommunications = [];

  function formatDate(d) {
    if (!d) return '-';
    if (window.FormatUtil && window.FormatUtil.formatDateTime) {
      return window.FormatUtil.formatDateTime(d);
    }
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return d;
      return dt.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return d;
    }
  }

  function clearEmailBadge() {
    const mailEl = document.getElementById('badge-email');
    if (mailEl) {
      mailEl.innerText = '0';
      mailEl.classList.add('zero');
    }
    try {
      localStorage.setItem('dse_email_read_ack', 'true');
      const cached = localStorage.getItem('dse_shell_counts');
      if (cached) {
        const counts = JSON.parse(cached);
        counts.email = 0;
        localStorage.setItem('dse_shell_counts', JSON.stringify(counts));
      }
    } catch (_) {}
  }

  async function loadCommunications() {
    clearEmailBadge();
    const tbody = document.getElementById('communication-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading communication events...</td></tr>`;
    }

    try {
      communications = await window.ReconService.getCommunications() || [];
      filteredCommunications = [...communications];

      updateKpis(communications);
      renderTable(filteredCommunications);

    } catch (err) {
      console.error('Failed to load communications:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--red);">⚠️ Error loading communications: ${err.message || 'Server error'}</td></tr>`;
      }
    }
  }

  function updateKpis(list) {
    const total = list.length;
    const success = list.filter(c => {
      const s = (c.status || '').toUpperCase();
      return s === 'SUCCESS' || s === 'SENT';
    }).length;
    const failed = list.filter(c => (c.status || '').toUpperCase() === 'FAILED' || (c.errorMessage && c.errorMessage.trim().length > 0)).length;
    const emails = list.filter(c => (c.channel || '').toUpperCase().includes('EMAIL') || (c.channel || '').toUpperCase().includes('MAIL')).length;
    const whatsapp = list.filter(c => (c.channel || '').toUpperCase().includes('WHATSAPP')).length;

    const tEl = document.getElementById('comm-kpi-total');
    const sEl = document.getElementById('comm-kpi-success');
    const fEl = document.getElementById('comm-kpi-failed');
    const cEl = document.getElementById('comm-kpi-channels');

    if (tEl) tEl.innerText = total.toLocaleString();
    if (sEl) sEl.innerText = success.toLocaleString();
    if (fEl) fEl.innerText = failed.toLocaleString();
    if (cEl) cEl.innerText = `${emails} Email / ${whatsapp} WA`;
  }

  function filterCommunications() {
    const q = (document.getElementById('comm-search')?.value || '').toLowerCase().trim();
    const ch = (document.getElementById('comm-channel-filter')?.value || '').toUpperCase();
    const st = (document.getElementById('comm-status-filter')?.value || '').toUpperCase();

    filteredCommunications = communications.filter(c => {
      const recipient = (c.recipient || '').toLowerCase();
      const subject = (c.subject || '').toLowerCase();
      const label = (c.documentLabel || '').toLowerCase();
      const channel = (c.channel || '').toUpperCase();
      const status = (c.status || '').toUpperCase();

      const matchesQ = !q || recipient.includes(q) || subject.includes(q) || label.includes(q);
      const matchesCh = !ch || ch === 'ALL' || channel.includes(ch);
      const matchesSt = !st || st === 'ALL' || status.includes(st);

      return matchesQ && matchesCh && matchesSt;
    });

    renderTable(filteredCommunications);
  }

  function renderTable(rows) {
    const tbody = document.getElementById('communication-tbody');
    if (!tbody) return;

    if (!rows || rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:40px; color:var(--text-muted);">
            <div style="font-size:1.8rem; margin-bottom:8px;">✉️</div>
            <div style="font-weight:600; font-size:0.95rem; color:var(--text-main);">No communication events found</div>
            <div style="font-size:0.78rem;">Email dispatch logs and WhatsApp notifications will appear here automatically.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows.map(c => {
      const statusUpper = (c.status || '').toUpperCase();
      const isSuccess = statusUpper === 'SUCCESS' || statusUpper === 'SENT';
      const isFailed = statusUpper === 'FAILED' || (c.errorMessage && c.errorMessage.trim().length > 0);
      const channel = (c.channel || 'EMAIL').toUpperCase();

      let chBadge = 'pill-neutral';
      if (channel.includes('EMAIL')) chBadge = 'pill-purple';
      else if (channel.includes('WHATSAPP')) chBadge = 'pill-success';

      return `
        <tr>
          <td style="white-space:nowrap; font-size:0.8rem; color:var(--text-muted);">${formatDate(c.createdAt)}</td>
          <td style="font-weight:700; color:var(--cyan); font-family:monospace;">${c.documentLabel || `${c.entityType || 'DOC'} #${c.entityId || ''}`}</td>
          <td><span class="pill-badge ${chBadge}">${channel}</span></td>
          <td style="font-weight:600; color:var(--text-main);">${c.recipient || '-'}</td>
          <td style="max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${c.subject || ''}">
            ${c.subject || '-'}
          </td>
          <td>
            ${isSuccess ? '<span class="pill-badge pill-success">SENT</span>' : isFailed ? '<span class="pill-badge pill-danger">FAILED</span>' : '<span class="pill-badge pill-warning">PENDING</span>'}
          </td>
          <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:0.75rem; color:${isFailed ? 'var(--red)' : 'var(--text-muted)'};" title="${c.errorMessage || 'Sent'}">
            ${c.errorMessage || 'Delivered to gateway'}
          </td>
          <td style="color:var(--text-muted); font-size:0.8rem;">${c.createdBy || 'System'}</td>
          <td style="text-align:center;">
            <button class="btn btn-secondary btn-sm" onclick="window.CommunicationController.resend(${c.id})" style="padding:2px 8px; font-size:0.72rem;" title="Resend Notification">🔄 Resend</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function resend(id) {
    const item = communications.find(c => c.id === id);
    if (!item) return;

    if (!confirm(`Resend communication to ${item.recipient} via ${item.channel}?`)) return;

    try {
      const payload = {
        entityType: item.entityType,
        entityId: item.entityId,
        channel: item.channel,
        recipient: item.recipient,
        subject: item.subject,
        status: 'PENDING',
        errorMessage: '',
        createdBy: 'Admin'
      };
      await window.ReconService.sendCommunication(payload);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Notification queued for resending to ${item.recipient}.`);
      loadCommunications();
    } catch (err) {
      alert('Resend failed: ' + (err.message || 'Server error'));
    }
  }

  function openEmailSettings() {
    if (window.NavigationRouter) {
      window.NavigationRouter.selectNav('view-settings-email');
    }
  }

  return {
    loadCommunications,
    clearEmailBadge,
    filterCommunications,
    resend,
    openEmailSettings
  };
})();
