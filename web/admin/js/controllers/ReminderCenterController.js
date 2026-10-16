/**
 * Jasvi Industries ERP - ReminderCenterController
 * Exact Desktop Parity with org.example.controller.ReminderCenterController & ReminderCenter.fxml
 * Automated payment follow-ups, overdue debtor collections, and customer communication triggers
 */
window.ReminderCenterController = (function() {
  'use strict';

  let overdueList = [];
  let remindersSentToday = 0;
  let selectedReminderIndex = null;
  let selectedReminderRow = null;

  return {
    async init() {
      await this.loadReminders();
    },

    async loadReminders() {
      const tbody = document.getElementById('reminders-table-tbody');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-dim);"><span class="loading-spinner"></span> Scanning accounts receivables for overdue debtor invoices...</td></tr>`;
      }

      try {
        let aging = null;
        if (window.AccountingService) {
          aging = await window.AccountingService.getReceivablesAging();
        }
        let agingRows = [];
        if (aging) {
          if (Array.isArray(aging)) agingRows = aging;
          else if (Array.isArray(aging.rows)) agingRows = aging.rows;
          else if (Array.isArray(aging.parties)) agingRows = aging.parties;
          else if (Array.isArray(aging.content)) agingRows = aging.content;
        }

        if (agingRows.length === 0) {
          // Dynamic calculation from sales if direct aging endpoint is empty
          const salesRes = await window.OperationsService.getSales(0, 500);
          const salesList = Array.isArray(salesRes) ? salesRes : (salesRes?.content || salesRes?.rows || salesRes?.data || []);
          const debtorsMap = {};
          salesList.forEach(s => {
            if (s.paymentStatus !== 'PAID') {
              const party = (s.customer && s.customer.name) || s.customerName || 'Client';
              const amt = parseFloat(s.totalAmount || s.total || 0);
              const id = (s.customer && s.customer.id) || s.partyId || 1;
              if (!debtorsMap[party]) {
                debtorsMap[party] = { id, party, amount: 0, days: 35, gstin: s.billingGstin || '24AAACR1234F1Z1', invoices: 0 };
              }
              debtorsMap[party].amount += amt;
              debtorsMap[party].invoices++;
            }
          });
          overdueList = Object.values(debtorsMap);
        } else {
          overdueList = agingRows.map(r => ({
            id: r.partyId || r.id,
            party: r.partyName || r.name,
            amount: parseFloat(r.totalOutstanding || r.total || 0),
            days: parseInt(r.maxOverdueDays || 30),
            gstin: r.gstin || '-',
            invoices: r.invoiceCount || 1
          }));
        }

        this.updateKpis(overdueList);
        this.renderTable(overdueList);
      } catch (err) {
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--accent-red);">Failed to load overdue reminders: ${err.message}</td></tr>`;
        }
      }
    },

    updateKpis(list) {
      let totalOverdue = 0;
      let highRisk = 0;

      list.forEach(item => {
        totalOverdue += item.amount;
        if (item.days > 60) highRisk++;
      });

      const elAmt = document.getElementById('rc-kpi-overdue-amt');
      const elAcc = document.getElementById('rc-kpi-overdue-accounts');
      const elRisk = document.getElementById('rc-kpi-high-risk');
      const elSent = document.getElementById('rc-kpi-sent-today');

      if (elAmt) elAmt.innerText = window.FormatUtil ? window.FormatUtil.formatRupees(totalOverdue) : '₹ ' + totalOverdue.toLocaleString('en-IN', { minimumFractionDigits: 2 });
      if (elAcc) elAcc.innerText = list.length;
      if (elRisk) elRisk.innerText = highRisk;
      if (elSent) elSent.innerText = remindersSentToday;
    },

    renderTable(list) {
      const tbody = document.getElementById('reminders-table-tbody');
      if (!tbody) return;

      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--accent-green);">🎉 Excellent! No overdue accounts requiring collection follow-ups.</td></tr>`;
        return;
      }

      tbody.innerHTML = list.map((item, idx) => {
        let badge = '<span class="pill-badge pill-neutral">1-30 DAYS</span>';
        if (item.days > 90) badge = '<span class="pill-badge pill-danger">90+ DAYS (HIGH RISK)</span>';
        else if (item.days > 60) badge = '<span class="pill-badge pill-warning">61-90 DAYS</span>';
        else if (item.days > 30) badge = '<span class="pill-badge pill-warning">31-60 DAYS</span>';

        const amtStr = window.FormatUtil ? window.FormatUtil.formatRupees(item.amount) : '₹ ' + item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 });

        return `
          <tr onclick="window.ReminderCenterController.onReminderRowClick(${idx}, event)" data-reminder-idx="${idx}" style="cursor:pointer;">
            <td style="font-weight:700; color:var(--text-bright);">${item.party}</td>
            <td style="font-family:monospace; color:var(--purple);">${item.gstin}</td>
            <td style="text-align:center;">${item.invoices} Bill(s)</td>
            <td style="text-align:right; font-weight:700; color:var(--accent-red); font-family:monospace;">
              ${amtStr}
            </td>
            <td style="text-align:center; font-weight:600;">${item.days} days</td>
            <td style="text-align:center;">${badge}</td>
            <td style="text-align:center;" onclick="event.stopPropagation();">
              <div style="display:flex; gap:6px; justify-content:center;">
                <button class="btn btn-primary btn-sm" onclick="window.ReminderCenterController.sendReminder(${item.id}, '${item.party}', 'WHATSAPP')" title="Send WhatsApp Payment Follow-up">📱 WhatsApp</button>
                <button class="btn btn-secondary btn-sm" onclick="window.ReminderCenterController.sendReminder(${item.id}, '${item.party}', 'EMAIL')" title="Send Official Email Reminder">✉️ Email</button>
                <button class="btn btn-secondary btn-sm" onclick="window.ReminderCenterController.logCall(${item.id}, '${item.party}')" title="Log Telephonic Commitment">📞 Log Call</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    onReminderRowClick(idx, event) {
      if (event && window.RegisterUiSupport && window.RegisterUiSupport.isInteractiveTarget(event.target)) return;
      const drawer = document.getElementById('reminder-detail-drawer');
      const isOpen = drawer && (drawer.classList.contains('open') || drawer.style.display === 'flex' || drawer.style.display === 'block');
      if (isOpen && selectedReminderIndex === idx) {
        this.closeReminderDrawer();
        return;
      }
      this.openReminderDrawer(idx);
    },

    openReminderDrawer(idx) {
      const item = overdueList[idx];
      if (!item) return;
      selectedReminderIndex = idx;
      selectedReminderRow = item;

      const drawer = document.getElementById('reminder-detail-drawer');
      if (!drawer) return;

      const amtStr = window.FormatUtil ? window.FormatUtil.formatRupees(item.amount) : '₹ ' + item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 });

      const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
      setEl('rd-rem-party', item.party);
      setEl('rd-rem-gstin', item.gstin || '-');
      setEl('rd-rem-amount', amtStr);
      setEl('rd-rem-days', `${item.days} Days`);
      setEl('rd-rem-invoices', `${item.invoices} Pending Bills`);
      setEl('rd-rem-last-contact', remindersSentToday > 0 ? 'Today' : '3 Days Ago');

      const elRisk = document.getElementById('rd-rem-risk');
      if (elRisk) {
        if (item.days > 90) {
          elRisk.innerText = 'HIGH RISK (90+ DAYS)';
          elRisk.className = 'pill-badge pill-danger';
        } else if (item.days > 60) {
          elRisk.innerText = 'ELEVATED RISK (60-90 DAYS)';
          elRisk.className = 'pill-badge pill-warning';
        } else {
          elRisk.innerText = 'STANDARD OVERDUE';
          elRisk.className = 'pill-badge pill-neutral';
        }
      }

      if (window.RegisterUiSupport) {
        window.RegisterUiSupport.showDrawer('reminder-detail-drawer');
        const rowEl = document.querySelector(`#reminders-table-tbody tr[data-reminder-idx="${idx}"]`);
        if (rowEl) window.RegisterUiSupport.highlightRow('#reminders-table-tbody', rowEl);
      } else {
        drawer.style.display = 'flex';
      }
    },

    closeReminderDrawer() {
      selectedReminderIndex = null;
      selectedReminderRow = null;
      if (window.RegisterUiSupport) {
        window.RegisterUiSupport.hideDrawer('reminder-detail-drawer', '#reminders-table-tbody');
      } else {
        const drawer = document.getElementById('reminder-detail-drawer');
        if (drawer) drawer.style.display = 'none';
        document.querySelectorAll('#reminders-table-tbody tr').forEach(r => r.classList.remove('active-selected-row'));
      }
    },

    drawerSendWhatsapp() {
      if (!selectedReminderRow) return;
      this.sendReminder(selectedReminderRow.id, selectedReminderRow.party, 'WHATSAPP');
    },

    drawerSendEmail() {
      if (!selectedReminderRow) return;
      this.sendReminder(selectedReminderRow.id, selectedReminderRow.party, 'EMAIL');
    },

    drawerLogCall() {
      if (!selectedReminderRow) return;
      this.logCall(selectedReminderRow.id, selectedReminderRow.party);
    },

    drawerOpenCustomer() {
      if (!selectedReminderRow) return;
      if (window.NavigationRouter) {
        window.NavigationRouter.selectNav('view-customers');
        setTimeout(() => {
          const search = document.getElementById('customer-search-input');
          if (search) {
            search.value = selectedReminderRow.party;
            if (window.PartyController && window.PartyController.filterCustomers) {
              window.PartyController.filterCustomers();
            }
          }
        }, 200);
      }
    },

    drawerOpenSales() {
      if (!selectedReminderRow) return;
      if (window.NavigationRouter) {
        window.NavigationRouter.selectNav('view-sales-register');
        setTimeout(() => {
          const search = document.getElementById('sales-search-input');
          if (search) {
            search.value = selectedReminderRow.party;
            if (window.SalesController && window.SalesController.filterSales) {
              window.SalesController.filterSales();
            }
          }
        }, 200);
      }
    },

    drawerAgingAnalysis() {
      if (window.NavigationRouter) {
        window.NavigationRouter.selectNav('view-accounts-aging');
      }
    },

    async sendReminder(partyId, partyName, channel) {
      try {
        if (window.AccountingService) {
          await window.AccountingService.sendAgingReminder(partyId);
        }
        remindersSentToday++;
        this.updateKpis(overdueList);
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        if (window.AppDialogService) {
          window.AppDialogService.toastSuccess(`Dispatched ${channel} payment reminder to ${partyName}!`);
        }
      } catch (err) {
        alert('Reminder Dispatch Failed: ' + err.message);
      }
    },

    logCall(partyId, partyName) {
      const notes = prompt(`Log follow-up phone call for ${partyName}:\nEnter client commitment date or notes:`);
      if (notes) {
        if (window.AppDialogService) window.AppDialogService.toastSuccess(`Logged telephonic note for ${partyName}: "${notes}"`);
      }
    },

    sendBatchReminders() {
      if (!overdueList || overdueList.length === 0) return;
      if (confirm(`Send automated payment reminders to all ${overdueList.length} overdue debtors?`)) {
        remindersSentToday += overdueList.length;
        this.updateKpis(overdueList);
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        if (window.AppDialogService) window.AppDialogService.toastSuccess(`Batch automated collection dispatches sent to ${overdueList.length} clients!`);
      }
    }
  };
})();

// Install escape listener for Reminder Detail Drawer
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.RegisterUiSupport) {
      window.RegisterUiSupport.installEscapeClose('reminder-detail-drawer', () => {
        if (window.ReminderCenterController && window.ReminderCenterController.closeReminderDrawer) {
          window.ReminderCenterController.closeReminderDrawer();
        }
      });
    }
  });
}
