/**
 * Jasvi Industries ERP - ReminderCenterController
 * Exact Desktop Parity with org.example.controller.ReminderCenterController & ReminderCenter.fxml
 * Real database-backed reminder inbox with CRUD, completion and snooze workflows via /api/insights/reminders
 */
window.ReminderCenterController = (function() {
  'use strict';

  let sourceReminders = [];
  let filteredReminders = [];
  let selectedReminder = null;

  function formatDate(d) {
    if (!d) return '-';
    if (window.FormatUtil && window.FormatUtil.formatDate) {
      return window.FormatUtil.formatDate(d);
    }
    try {
      const parts = d.toString().split('T')[0].split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return d;
    } catch {
      return d;
    }
  }

  function getTodayStr() {
    return new Date().toISOString().substring(0, 10);
  }

  function getPriorityBadge(priority) {
    const p = (priority || 'NORMAL').toUpperCase();
    if (p === 'URGENT') return '<span class="pill-badge pill-danger" style="font-weight:700;">URGENT</span>';
    if (p === 'HIGH') return '<span class="pill-badge pill-warning" style="font-weight:700;">HIGH</span>';
    if (p === 'LOW') return '<span class="pill-badge pill-neutral">LOW</span>';
    return '<span class="pill-badge pill-blue">NORMAL</span>';
  }

  function getStatusBadge(status) {
    const s = (status || 'OPEN').toUpperCase();
    if (s === 'COMPLETED') return '<span class="pill-badge pill-success" style="font-weight:700;">COMPLETED</span>';
    if (s === 'SNOOZED') return '<span class="pill-badge pill-warning" style="font-weight:700;">SNOOZED</span>';
    return '<span class="pill-badge pill-blue" style="font-weight:700;">OPEN</span>';
  }

  return {
    async init() {
      await this.refresh();
    },

    async refresh() {
      await this.loadReminders();
    },

    async loadReminders() {
      const tbody = document.getElementById('reminders-table-tbody');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading reminders from server...</td></tr>`;
      }

      try {
        let data = [];
        if (window.ApiService) {
          data = await window.ApiService.get('/api/insights/reminders').catch(() => []);
        }
        sourceReminders = Array.isArray(data) ? data : [];

        this.updateKpis(sourceReminders);
        this.applyFilters();
      } catch (err) {
        console.error('Failed to load reminders:', err);
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--accent-red);">Failed to load reminders: ${err.message || 'Server error'}</td></tr>`;
        }
      }
    },

    updateKpis(list) {
      const todayStr = getTodayStr();
      const today = new Date(todayStr);
      today.setHours(0, 0, 0, 0);

      const sevenDays = new Date(today);
      sevenDays.setDate(today.getDate() + 7);

      let openCount = 0;
      let overdueCount = 0;
      let dueTodayCount = 0;
      let upcomingCount = 0;

      list.forEach(item => {
        const status = (item.status || 'OPEN').toUpperCase();
        if (status !== 'COMPLETED') {
          openCount++;

          if (item.dueDate) {
            const dueStr = item.dueDate.substring(0, 10);
            const d = new Date(dueStr);
            d.setHours(0, 0, 0, 0);

            if (dueStr < todayStr) {
              overdueCount++;
            } else if (dueStr === todayStr) {
              dueTodayCount++;
            } else if (d > today && d <= sevenDays) {
              upcomingCount++;
            }
          }
        }
      });

      const elOpen = document.getElementById('rc-kpi-open');
      if (elOpen) elOpen.innerText = openCount;

      const elOverdue = document.getElementById('rc-kpi-overdue');
      if (elOverdue) elOverdue.innerText = overdueCount;

      const elDueToday = document.getElementById('rc-kpi-due-today');
      if (elDueToday) elDueToday.innerText = dueTodayCount;

      const elUpcoming = document.getElementById('rc-kpi-upcoming');
      if (elUpcoming) elUpcoming.innerText = upcomingCount;
    },

    applyFilters() {
      const q = (document.getElementById('rc-filter-search')?.value || '').toLowerCase().trim();
      const statusFilter = (document.getElementById('rc-filter-status')?.value || '').toUpperCase();
      const priorityFilter = (document.getElementById('rc-filter-priority')?.value || '').toUpperCase();
      const periodFilter = (document.getElementById('rc-filter-period')?.value || '').toUpperCase();

      const todayStr = getTodayStr();
      const today = new Date(todayStr);
      today.setHours(0, 0, 0, 0);

      const sevenDays = new Date(today);
      sevenDays.setDate(today.getDate() + 7);

      const thirtyDays = new Date(today);
      thirtyDays.setDate(today.getDate() + 30);

      filteredReminders = sourceReminders.filter(item => {
        // Text Search
        if (q) {
          const title = (item.title || '').toLowerCase();
          const ref = (item.referenceNo || '').toLowerCase();
          const notes = (item.notes || '').toLowerCase();
          const createdBy = (item.createdBy || '').toLowerCase();
          if (!title.includes(q) && !ref.includes(q) && !notes.includes(q) && !createdBy.includes(q)) {
            return false;
          }
        }

        // Status Filter
        if (statusFilter && (item.status || 'OPEN').toUpperCase() !== statusFilter) {
          return false;
        }

        // Priority Filter
        if (priorityFilter && (item.priority || 'NORMAL').toUpperCase() !== priorityFilter) {
          return false;
        }

        // Period Filter
        if (periodFilter && item.dueDate) {
          const dueStr = item.dueDate.substring(0, 10);
          const d = new Date(dueStr);
          d.setHours(0, 0, 0, 0);

          if (periodFilter === 'OVERDUE') {
            if (dueStr >= todayStr || (item.status || '').toUpperCase() === 'COMPLETED') return false;
          } else if (periodFilter === 'TODAY') {
            if (dueStr !== todayStr) return false;
          } else if (periodFilter === '7DAYS') {
            if (d < today || d > sevenDays) return false;
          } else if (periodFilter === '30DAYS') {
            if (d < today || d > thirtyDays) return false;
          }
        }

        return true;
      });

      const countEl = document.getElementById('rc-result-count');
      if (countEl) {
        countEl.innerText = `Showing ${filteredReminders.length} Record${filteredReminders.length === 1 ? '' : 's'}`;
      }

      this.renderTable(filteredReminders);
    },

    clearFilters() {
      if (document.getElementById('rc-filter-search')) document.getElementById('rc-filter-search').value = '';
      if (document.getElementById('rc-filter-status')) document.getElementById('rc-filter-status').value = '';
      if (document.getElementById('rc-filter-priority')) document.getElementById('rc-filter-priority').value = '';
      if (document.getElementById('rc-filter-period')) document.getElementById('rc-filter-period').value = '';
      this.applyFilters();
    },

    renderTable(list) {
      const tbody = document.getElementById('reminders-table-tbody');
      if (!tbody) return;

      if (!list || list.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align:center; padding:40px 20px;">
              <div style="font-size:2rem; margin-bottom:8px;">📋</div>
              <div style="font-weight:700; color:var(--text-main); font-size:1rem; margin-bottom:4px;">No reminders found</div>
              <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:14px;">Create a reminder or change the filters to see matching records.</div>
              <button class="btn btn-primary btn-sm" onclick="window.ReminderCenterController.openAddModal()">+ Create Reminder</button>
            </td>
          </tr>
        `;
        return;
      }

      const todayStr = getTodayStr();

      tbody.innerHTML = list.map((item, idx) => {
        const isSelected = selectedReminder && selectedReminder.id === item.id;
        const isCompleted = (item.status || '').toUpperCase() === 'COMPLETED';
        const isOverdue = !isCompleted && item.dueDate && item.dueDate.substring(0, 10) < todayStr;
        const dueFormatted = formatDate(item.dueDate);

        return `
          <tr onclick="window.ReminderCenterController.onRowClick(${item.id}, event)" class="${isSelected ? 'selected-row' : ''}" style="cursor:pointer;">
            <td style="font-weight:600; color:#fff;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="color:var(--text-muted); font-size:0.8rem;">⏰</span>
                <span style="${isCompleted ? 'text-decoration:line-through; color:var(--text-muted);' : ''}">${escapeHtml(item.title || 'Untitled Reminder')}</span>
              </div>
            </td>
            <td style="font-family:monospace; font-size:0.8rem; color:var(--cyan); font-weight:700;">
              ${escapeHtml(item.referenceNo || '-')}
            </td>
            <td style="font-size:0.82rem; ${isOverdue ? 'color:#f87171; font-weight:700;' : 'color:var(--text-main);'}">
              ${dueFormatted} ${isOverdue ? '<span class="pill-badge pill-danger" style="font-size:0.6rem; padding:1px 4px; margin-left:4px;">OVERDUE</span>' : ''}
            </td>
            <td style="text-align:center;">
              ${getPriorityBadge(item.priority)}
            </td>
            <td style="text-align:center;">
              ${getStatusBadge(item.status)}
            </td>
            <td style="font-size:0.8rem; color:var(--text-muted);">
              ${escapeHtml(item.createdBy || 'System')}
            </td>
            <td style="text-align:center; white-space:nowrap;" onclick="event.stopPropagation()">
              <div class="action-cell-container" style="position:relative; display:inline-block;">
                <button class="btn-purple" onclick="window.ReminderCenterController.toggleActionMenu(${item.id}, event)" style="height:28px; padding:0 10px; font-size:0.74rem; font-weight:600;" title="View Actions Menu">
                  ::: Actions &#9660;
                </button>
                <div class="action-dropdown-menu" id="rc-action-menu-${item.id}" style="display:none; position:fixed; z-index:100005; min-width:170px; background:#1e293b; border:1px solid #334155; border-radius:6px; box-shadow:0 10px 25px -5px rgba(0,0,0,0.5); padding:4px 0; text-align:left;">
                  <div class="action-menu-item" onclick="window.ReminderCenterController.showDetailsById(${item.id})"><span style="margin-right:8px;">👁️</span> View Details</div>
                  <div class="action-menu-item" onclick="window.ReminderCenterController.editReminder(${item.id}, event)"><span style="margin-right:8px;">✏️</span> Edit Reminder</div>
                  <div class="action-menu-item" onclick="window.ReminderCenterController.toggleComplete(${item.id}, event)"><span style="margin-right:8px;">${isCompleted ? '↩' : '✅'}</span> ${isCompleted ? 'Reopen Reminder' : 'Mark Complete'}</div>
                  <div class="action-menu-item" onclick="window.ReminderCenterController.openSnoozeModal(${item.id}, event)"><span style="margin-right:8px;">⏰</span> Snooze Reminder</div>
                  <div class="action-menu-item" style="color:var(--red);" onclick="window.ReminderCenterController.deleteReminder(${item.id}, event)"><span style="margin-right:8px;">🗑️</span> Delete Reminder</div>
                </div>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    closeActionMenus() {
      document.querySelectorAll('.action-dropdown-menu').forEach(m => {
        if (m.id && m.id.startsWith('rc-action-menu-')) m.style.display = 'none';
      });
    },

    toggleActionMenu(id, event) {
      if (event) event.stopPropagation();
      const menuId = 'rc-action-menu-' + id;
      const targetMenu = document.getElementById(menuId);
      document.querySelectorAll('.action-dropdown-menu').forEach(m => {
        if (m !== targetMenu && m.id && m.id.startsWith('rc-action-menu-')) m.style.display = 'none';
      });
      if (targetMenu) {
        const isShowing = targetMenu.style.display === 'block';
        if (isShowing) {
          targetMenu.style.display = 'none';
        } else {
          targetMenu.style.display = 'block';
          targetMenu.style.position = 'fixed';
          targetMenu.style.zIndex = '100005';
          const btn = event?.currentTarget || event?.target;
          if (btn) {
            const rect = btn.getBoundingClientRect();
            const menuWidth = 180;
            let left = rect.right - menuWidth;
            if (left < 10) left = 10;

            const menuHeight = targetMenu.offsetHeight || 190;
            const spaceBelow = window.innerHeight - rect.bottom;
            let top;
            if (spaceBelow < menuHeight && rect.top > menuHeight) {
              top = Math.max(10, rect.top - menuHeight - 4);
            } else {
              top = rect.bottom + 4;
            }

            targetMenu.style.top = `${top}px`;
            targetMenu.style.left = `${left}px`;

            const closeHandler = (e) => {
              if (!targetMenu.contains(e.target) && e.target !== btn) {
                targetMenu.style.display = 'none';
                document.removeEventListener('click', closeHandler);
              }
            };
            document.addEventListener('click', closeHandler);
          }
        }
      }
    },

    showDetailsById(id) {
      this.closeActionMenus();
      const item = sourceReminders.find(r => r.id === id);
      if (item) this.showDetails(item);
    },

    onRowClick(id, event) {
      if (selectedReminder && selectedReminder.id === id) {
        this.closeReminderDrawer();
      } else {
        const item = sourceReminders.find(r => r.id === id);
        if (item) this.showDetails(item);
      }
    },

    showDetails(item) {
      selectedReminder = item;

      const titleEl = document.getElementById('lblDetailTitle');
      if (titleEl) titleEl.innerText = item.title || 'Reminder Details';

      const refEl = document.getElementById('lblDetailReference');
      if (refEl) refEl.innerText = item.referenceNo || 'No reference';

      const dueEl = document.getElementById('lblDetailDue');
      if (dueEl) dueEl.innerText = formatDate(item.dueDate);

      const priEl = document.getElementById('lblDetailPriority');
      if (priEl) priEl.innerHTML = getPriorityBadge(item.priority);

      const stEl = document.getElementById('lblDetailStatus');
      if (stEl) stEl.innerHTML = getStatusBadge(item.status);

      const notesEl = document.getElementById('lblDetailNotes');
      if (notesEl) notesEl.innerText = item.notes ? item.notes.trim() : 'No notes provided.';

      const btnComplete = document.getElementById('btn-complete-selected');
      if (btnComplete) {
        const isCompleted = (item.status || '').toUpperCase() === 'COMPLETED';
        btnComplete.innerText = isCompleted ? '↩ Reopen' : '✅ Mark Complete';
      }

      const drawer = document.getElementById('reminder-detail-drawer');
      if (drawer) drawer.style.display = 'flex';

      this.renderTable(filteredReminders);
    },

    closeReminderDrawer() {
      selectedReminder = null;
      const drawer = document.getElementById('reminder-detail-drawer');
      if (drawer) drawer.style.display = 'none';
      this.renderTable(filteredReminders);
    },

    editSelected() {
      if (!selectedReminder) return;
      this.editReminder(selectedReminder.id);
    },

    async completeSelected() {
      if (!selectedReminder) return;
      await this.toggleComplete(selectedReminder.id);
    },

    snoozeSelected() {
      if (!selectedReminder) return;
      this.openSnoozeModal(selectedReminder.id);
    },

    async deleteSelected() {
      if (!selectedReminder) return;
      await this.deleteReminder(selectedReminder.id);
    },

    // ==========================================
    // MODALS & CRUD OPERATIONS
    // ==========================================

    openAddModal() {
      document.getElementById('mre-modal-title').innerText = 'Add Reminder';
      document.getElementById('mre-id').value = '';
      document.getElementById('mre-title').value = '';
      document.getElementById('mre-ref').value = '';
      document.getElementById('mre-due').value = getTodayStr();
      document.getElementById('mre-priority').value = 'NORMAL';
      document.getElementById('mre-status').value = 'OPEN';
      document.getElementById('mre-notes').value = '';

      const modal = document.getElementById('modal-reminder-editor');
      if (modal) modal.style.display = 'flex';
    },

    editReminder(id, event) {
      if (event) event.stopPropagation();
      this.closeActionMenus();
      const item = sourceReminders.find(r => r.id === id);
      if (!item) return;

      document.getElementById('mre-modal-title').innerText = 'Edit Reminder';
      document.getElementById('mre-id').value = item.id;
      document.getElementById('mre-title').value = item.title || '';
      document.getElementById('mre-ref').value = item.referenceNo || '';
      document.getElementById('mre-due').value = item.dueDate ? item.dueDate.substring(0, 10) : getTodayStr();
      document.getElementById('mre-priority').value = (item.priority || 'NORMAL').toUpperCase();
      document.getElementById('mre-status').value = (item.status || 'OPEN').toUpperCase();
      document.getElementById('mre-notes').value = item.notes || '';

      const modal = document.getElementById('modal-reminder-editor');
      if (modal) modal.style.display = 'flex';
    },

    closeEditorModal() {
      const modal = document.getElementById('modal-reminder-editor');
      if (modal) modal.style.display = 'none';
    },

    async saveReminderFromModal() {
      const title = document.getElementById('mre-title')?.value.trim();
      const dueDate = document.getElementById('mre-due')?.value;
      if (!title) {
        if (window.AppDialogService) window.AppDialogService.toastWarning('Please enter a reminder title.');
        else alert('Please enter a reminder title.');
        return;
      }
      if (!dueDate) {
        if (window.AppDialogService) window.AppDialogService.toastWarning('Please select a due date.');
        else alert('Please select a due date.');
        return;
      }

      const id = document.getElementById('mre-id')?.value;
      const payload = {
        title: title,
        referenceNo: document.getElementById('mre-ref')?.value.trim() || null,
        dueDate: dueDate,
        priority: document.getElementById('mre-priority')?.value || 'NORMAL',
        status: document.getElementById('mre-status')?.value || 'OPEN',
        notes: document.getElementById('mre-notes')?.value.trim() || ''
      };

      try {
        if (id) {
          payload.id = parseInt(id);
          await window.ApiService.put(`/api/insights/reminders/${id}`, payload);
          if (window.AppDialogService) window.AppDialogService.toastSuccess('Reminder updated successfully.');
        } else {
          await window.ApiService.post('/api/insights/reminders', payload);
          if (window.AppDialogService) window.AppDialogService.toastSuccess('Reminder created successfully.');
        }

        this.closeEditorModal();
        await this.loadReminders();

        if (selectedReminder && selectedReminder.id == id) {
          const fresh = sourceReminders.find(r => r.id == id);
          if (fresh) this.showDetails(fresh);
        }
      } catch (err) {
        console.error('Failed to save reminder:', err);
        alert('Failed to save reminder: ' + (err.message || 'Server error'));
      }
    },

    async toggleComplete(id, event) {
      if (event) event.stopPropagation();
      this.closeActionMenus();
      const item = sourceReminders.find(r => r.id === id);
      if (!item) return;

      const isCompleted = (item.status || '').toUpperCase() === 'COMPLETED';
      const targetStatus = isCompleted ? 'OPEN' : 'COMPLETED';

      try {
        await window.ApiService.post(`/api/insights/reminders/${id}/status?status=${targetStatus}`, {});
        if (window.AppDialogService) {
          window.AppDialogService.toastSuccess(targetStatus === 'COMPLETED' ? 'Reminder marked complete.' : 'Reminder reopened.');
        }
        await this.loadReminders();

        if (selectedReminder && selectedReminder.id === id) {
          const fresh = sourceReminders.find(r => r.id === id);
          if (fresh) this.showDetails(fresh);
        }
      } catch (err) {
        console.error('Failed to change reminder status:', err);
        alert('Failed to update status: ' + (err.message || 'Server error'));
      }
    },

    openSnoozeModal(id, event) {
      if (event) event.stopPropagation();
      this.closeActionMenus();
      const item = sourceReminders.find(r => r.id === id);
      if (!item) return;

      document.getElementById('mrs-id').value = item.id;
      document.getElementById('mrs-reminder-title').innerText = item.title || 'Reminder';

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      document.getElementById('mrs-date').value = tomorrow.toISOString().substring(0, 10);

      const modal = document.getElementById('modal-reminder-snooze');
      if (modal) modal.style.display = 'flex';
    },

    closeSnoozeModal() {
      const modal = document.getElementById('modal-reminder-snooze');
      if (modal) modal.style.display = 'none';
    },

    async confirmSnooze() {
      const id = document.getElementById('mrs-id')?.value;
      const snoozeDate = document.getElementById('mrs-date')?.value;
      if (!id || !snoozeDate) {
        alert('Please select a valid date to snooze.');
        return;
      }

      if (snoozeDate < getTodayStr()) {
        alert('Snooze date must be today or a future date.');
        return;
      }

      try {
        await window.ApiService.post(`/api/insights/reminders/${id}/status?status=SNOOZED&snoozedUntil=${encodeURIComponent(snoozeDate)}`, {});
        if (window.AppDialogService) window.AppDialogService.toastSuccess(`Reminder snoozed until ${formatDate(snoozeDate)}.`);

        this.closeSnoozeModal();
        await this.loadReminders();

        if (selectedReminder && selectedReminder.id == id) {
          const fresh = sourceReminders.find(r => r.id == id);
          if (fresh) this.showDetails(fresh);
        }
      } catch (err) {
        console.error('Failed to snooze reminder:', err);
        alert('Failed to snooze reminder: ' + (err.message || 'Server error'));
      }
    },

    async deleteReminder(id, event) {
      if (event) event.stopPropagation();
      this.closeActionMenus();
      const item = sourceReminders.find(r => r.id === id);
      const title = item ? item.title : `Reminder #${id}`;

      if (!confirm(`Permanently delete reminder '${title}'? This action cannot be undone.`)) {
        return;
      }

      try {
        await window.ApiService.delete(`/api/insights/reminders/${id}`);
        if (window.AppDialogService) window.AppDialogService.toastSuccess('Reminder deleted successfully.');

        if (selectedReminder && selectedReminder.id === id) {
          this.closeReminderDrawer();
        }

        await this.loadReminders();
      } catch (err) {
        console.error('Failed to delete reminder:', err);
        alert('Failed to delete reminder: ' + (err.message || 'Server error'));
      }
    }
  };

  function escapeHtml(str) {
    if (!str) return '';
    return str.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
