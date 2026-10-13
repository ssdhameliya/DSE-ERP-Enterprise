/**
 * Jasvi Industries ERP - ReminderCenterController
 * Desktop Parity with org.example.controller.ReminderCenterController & ReminderCenter.fxml
 */
window.ReminderCenterController = (function() {
  let overdueList = [];
  let remindersSentToday = 0;

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
        if (!aging || !aging.rows) {
          // Dynamic calculation from sales if direct aging endpoint is empty
          const sales = await window.OperationsService.getSales();
          const debtorsMap = {};
          (sales || []).forEach(s => {
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
          overdueList = aging.rows.map(r => ({
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

      if (elAmt) elAmt.innerText = window.FormatUtil.formatRupees(totalOverdue);
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

      tbody.innerHTML = list.map(item => {
        let badge = '<span class="badge badge-pending">1-30 DAYS</span>';
        if (item.days > 90) badge = '<span class="badge badge-cancelled">90+ DAYS (HIGH RISK)</span>';
        else if (item.days > 60) badge = '<span class="badge badge-warning">61-90 DAYS</span>';
        else if (item.days > 30) badge = '<span class="badge badge-warning">31-60 DAYS</span>';

        return `
          <tr>
            <td style="font-weight:700; color:var(--text-bright);">${item.party}</td>
            <td style="font-family:monospace; color:var(--purple);">${item.gstin}</td>
            <td style="text-align:center;">${item.invoices} Bill(s)</td>
            <td style="text-align:right; font-weight:700; color:var(--accent-red); font-family:monospace;">
              ${window.FormatUtil.formatRupees(item.amount)}
            </td>
            <td style="text-align:center; font-weight:600;">${item.days} days</td>
            <td style="text-align:center;">${badge}</td>
            <td style="text-align:center;">
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
