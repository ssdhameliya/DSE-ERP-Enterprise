/**
 * Jasvi Industries ERP - NotificationCenterController
 * Complete Desktop Parity matching NotificationCenterController.java & NotificationService.java
 * Backed by typed Spring insights endpoints:
 *   GET /api/insights/notifications?limit=500
 *   GET /api/insights/notifications/unread-count
 *   POST /api/insights/notifications/{id}/read
 *   POST /api/insights/notifications/{id}/unread
 *   POST /api/insights/notifications/read-all
 *   DELETE /api/insights/notifications/{id}
 *   DELETE /api/insights/notifications
 */
window.NotificationCenterController = (function() {
  'use strict';

  const ALL = 'All Notifications';
  const UNREAD = 'Unread';
  const ACTION_NEEDED = 'Action Needed';

  const META_FILTERS = [
    { key: ALL, label: 'All Notifications', icon: '⚏' },
    { key: UNREAD, label: 'Unread', icon: '✉' },
    { key: ACTION_NEEDED, label: 'Action Needed', icon: '⚠' }
  ];

  const CATEGORIES = [
    { key: 'Approval', label: 'Approval', icon: '✔' },
    { key: 'Sales', label: 'Sales', icon: '🛒' },
    { key: 'Purchases', label: 'Purchases', icon: '📦' },
    { key: 'Quotations', label: 'Quotations', icon: '📑' },
    { key: 'Returns', label: 'Returns', icon: '↺' },
    { key: 'Payments', label: 'Payments', icon: '💳' },
    { key: 'Inventory', label: 'Inventory', icon: '🏷' },
    { key: 'Banking', label: 'Banking', icon: '🏦' },
    { key: 'Reports', label: 'Reports', icon: '📊' },
    { key: 'Reminders', label: 'Reminders', icon: '⏰' },
    { key: 'Communication', label: 'Communication', icon: '✉' },
    { key: 'Security', label: 'Security', icon: '🔒' },
    { key: 'Imports', label: 'Imports', icon: '📥' },
    { key: 'Backup', label: 'Backup', icon: '💾' },
    { key: 'Update', label: 'Update', icon: '⚡' },
    { key: 'System', label: 'System', icon: '🔔' }
  ];

  const ACTION_VERBS = [
    'APPROVE', 'REVIEW', 'RESOLVE', 'PAY', 'PAYMENT',
    'RECONCILE', 'COMPLETE', 'EXECUTE', 'CHECK', 'INSTALL'
  ];

  let notifications = [];
  let currentFilter = ALL;
  let selectedNotification = null;
  let searchQuery = '';

  function isActionable(item) {
    if (!item) return false;
    const cat = (item.category || '').toUpperCase().trim();
    if (cat === 'APPROVAL') return true;

    const act = (item.actionCode || '').toUpperCase().trim();
    if (act && ACTION_VERBS.some(v => act === v || act.includes(v))) return true;

    const sev = (item.severity || '').toUpperCase().trim();
    if (sev === 'WARN' || sev === 'ERROR') return true;

    const title = (item.title || '').toUpperCase();
    if (title.includes('APPROVAL') || title.includes('ACTION NEEDED')) return true;

    return false;
  }

  function formatNotifDate(ts) {
    if (!ts) return '-';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return '-';
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = String(d.getDate()).padStart(2, '0');
      const mon = months[d.getMonth()];
      const yr = d.getFullYear();
      let hrs = d.getHours();
      const mins = String(d.getMinutes()).padStart(2, '0');
      const ampm = hrs >= 12 ? 'PM' : 'AM';
      hrs = hrs % 12;
      if (hrs === 0) hrs = 12;
      const hrsStr = String(hrs).padStart(2, '0');
      return `${day} ${mon} ${yr} • ${hrsStr}:${mins} ${ampm}`;
    } catch(e) {
      return '-';
    }
  }

  function getModuleIcon(cat) {
    const c = (cat || '').toUpperCase();
    if (c.includes('SALE')) return '🛒';
    if (c.includes('PURCHASE')) return '📦';
    if (c.includes('QUOTE')) return '📑';
    if (c.includes('RETURN')) return '↺';
    if (c.includes('PAY')) return '💳';
    if (c.includes('INVENT') || c.includes('ITEM')) return '🏷';
    if (c.includes('BANK') || c.includes('EXPENSE')) return '🏦';
    if (c.includes('REPORT')) return '📊';
    if (c.includes('REMIND')) return '⏰';
    if (c.includes('COMM')) return '✉';
    if (c.includes('APPROV')) return '✔';
    if (c.includes('IMPORT')) return '📥';
    if (c.includes('BACKUP')) return '💾';
    if (c.includes('UPDATE')) return '⚡';
    if (c.includes('SEC')) return '🔒';
    return '🔔';
  }

  function displayCategory(c) {
    if (!c) return 'System';
    const val = c.trim().replace(/_/g, ' ').toLowerCase();
    return val.charAt(0).toUpperCase() + val.slice(1);
  }

  return {
    async loadNotifications() {
      try {
        const list = await window.ApiService.get('/api/insights/notifications?limit=500');
        notifications = Array.isArray(list) ? list : [];

        // Update shell header counter badge
        const unreadCount = notifications.filter(n => !n.read).length;
        const badgeEl = document.getElementById('badge-notifications');
        if (badgeEl) {
          badgeEl.innerText = unreadCount;
          badgeEl.classList.toggle('zero', unreadCount === 0);
        }

        this.updateSummaryCounters();
        this.renderCategoryRail();
        this.renderNotificationList();
      } catch (err) {
        console.warn('[NotificationCenterController] Failed to load notifications:', err);
        notifications = [];
        this.updateSummaryCounters();
        this.renderCategoryRail();
        this.renderNotificationList();
      }
    },

    updateSummaryCounters() {
      const allCount = notifications.length;
      const unreadCount = notifications.filter(n => !n.read).length;
      const actionCount = notifications.filter(isActionable).length;

      const elAll = document.getElementById('nc-summary-all');
      const elUnread = document.getElementById('nc-summary-unread');
      const elAction = document.getElementById('nc-summary-action');

      if (elAll) elAll.innerText = allCount;
      if (elUnread) elUnread.innerText = unreadCount;
      if (elAction) elAction.innerText = actionCount;
    },

    renderCategoryRail() {
      const railEl = document.getElementById('nc-category-rail');
      if (!railEl) return;

      const allCount = notifications.length;
      const unreadCount = notifications.filter(n => !n.read).length;
      const actionCount = notifications.filter(isActionable).length;

      const counts = {
        [ALL]: allCount,
        [UNREAD]: unreadCount,
        [ACTION_NEEDED]: actionCount
      };

      notifications.forEach(n => {
        const cat = (n.category || 'System').toUpperCase();
        CATEGORIES.forEach(c => {
          const keyUpper = c.key.toUpperCase();
          if (keyUpper === cat ||
              (c.key === 'Sales' && cat.includes('SALE')) ||
              (c.key === 'Purchases' && cat.includes('PURCHASE')) ||
              (c.key === 'Banking' && (cat.includes('BANK') || cat.includes('EXPENSE'))) ||
              (c.key === 'Reports' && cat.includes('REPORT'))) {
            counts[c.key] = (counts[c.key] || 0) + 1;
          }
        });
      });

      let html = `
        <div style="padding: 6px 12px 4px; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-dim); font-weight: 800;">
          FILTERS
        </div>
        <div style="padding: 0 12px 8px; font-size: 0.82rem; font-weight: 700; color: var(--text-main);">
          Categories
        </div>
      `;

      // 1. Render Top Meta-Filters (All Notifications, Unread, Action Needed)
      META_FILTERS.forEach(m => {
        const count = counts[m.key] || 0;
        const isActive = currentFilter === m.key;
        html += `
          <div class="notif-category-item meta-filter ${isActive ? 'active' : ''}" 
               onclick="window.NotificationCenterController.setFilter('${m.key}')" 
               style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-radius: 6px; cursor: pointer; margin-bottom: 3px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 0.85rem; color: ${isActive ? '#fff' : (m.key === ACTION_NEEDED ? '#fbbf24' : 'var(--cyan)')};">${m.icon}</span>
              <span style="font-size: 0.78rem; font-weight: ${isActive ? '800' : '700'}; color: ${isActive ? '#fff' : 'var(--text-main)'};">${m.label}</span>
            </div>
            <span style="font-size: 0.72rem; padding: 1px 7px; border-radius: 10px; font-weight: 800; background: ${isActive ? 'rgba(255,255,255,0.3)' : (count > 0 ? (m.key === ACTION_NEEDED ? 'rgba(251,191,36,0.2)' : 'rgba(56,189,248,0.2)') : 'rgba(255,255,255,0.05)')}; color: ${isActive ? '#fff' : (count > 0 ? (m.key === ACTION_NEEDED ? '#fbbf24' : 'var(--cyan)') : 'var(--text-dim)')};">
              ${count}
            </span>
          </div>
        `;
      });

      html += `
        <div style="height: 1px; background: rgba(255,255,255,0.08); margin: 6px 10px;"></div>
      `;

      // 2. Render 16 Domain Categories
      CATEGORIES.forEach(c => {
        const count = counts[c.key] || 0;
        const isActive = currentFilter === c.key;
        html += `
          <div class="notif-category-item ${isActive ? 'active' : ''}" 
               onclick="window.NotificationCenterController.setFilter('${c.key}')" 
               style="display: flex; justify-content: space-between; align-items: center; padding: 7px 12px; border-radius: 6px; cursor: pointer; margin-bottom: 2px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 0.85rem; color: ${isActive ? '#fff' : 'var(--text-muted)'};">${c.icon}</span>
              <span style="font-size: 0.76rem; font-weight: ${isActive ? '700' : '600'}; color: ${isActive ? '#fff' : 'var(--text-muted)'};">${c.label}</span>
            </div>
            <span style="font-size: 0.70rem; padding: 1px 6px; border-radius: 10px; font-weight: 700; background: ${count > 0 ? (isActive ? 'rgba(255,255,255,0.25)' : 'rgba(56,189,248,0.15)') : 'rgba(255,255,255,0.05)'}; color: ${count > 0 ? (isActive ? '#fff' : 'var(--cyan)') : 'var(--text-dim)'};">
              ${count}
            </span>
          </div>
        `;
      });

      railEl.innerHTML = html;
    },

    setFilter(filterName) {
      currentFilter = filterName;
      this.renderCategoryRail();
      this.renderNotificationList();
    },

    onSearch(q) {
      searchQuery = (q || '').toLowerCase().trim();
      this.renderNotificationList();
    },

    renderNotificationList() {
      const listPane = document.getElementById('nc-notifications-list');
      if (!listPane) return;

      let visible = notifications.filter(n => {
        if (currentFilter === UNREAD) return !n.read;
        if (currentFilter === ACTION_NEEDED) return isActionable(n);
        if (currentFilter !== ALL) {
          const c = (n.category || 'System').toUpperCase();
          const target = currentFilter.toUpperCase();
          if (c !== target && !c.includes(target)) return false;
        }
        return true;
      });

      if (searchQuery) {
        visible = visible.filter(n => {
          const hay = `${n.title || ''} ${n.message || ''} ${n.referenceNo || ''} ${n.category || ''} ${n.actionCode || ''}`.toLowerCase();
          return hay.includes(searchQuery);
        });
      }

      // Update sub-counter
      const unreadCount = visible.filter(n => !n.read).length;
      const subCounter = document.getElementById('nc-sub-counter');
      if (subCounter) {
        subCounter.innerText = `${visible.length} shown • ${unreadCount} unread`;
      }

      if (visible.length === 0) {
        listPane.innerHTML = `
          <div style="padding: 50px 20px; text-align: center; color: var(--text-dim); font-size: 0.82rem;">
            <div style="font-size: 1.6rem; margin-bottom: 8px;">📭</div>
            No notifications in this category.
          </div>
        `;
        this.renderDetail(null);
        return;
      }

      // If nothing selected or selected item is no longer in visible list, select first
      if (!selectedNotification || !visible.find(n => n.id === selectedNotification.id)) {
        selectedNotification = visible[0];
      }

      listPane.innerHTML = visible.map(n => {
        const isSelected = selectedNotification && selectedNotification.id === n.id;
        const safeTitle = (n.title || 'Notification').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeMsg = (n.message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const cat = displayCategory(n.category);
        const icon = getModuleIcon(n.category);
        const ref = n.referenceNo || n.reference || '';
        const dateStr = formatNotifDate(n.createdAt);
        const actionable = isActionable(n);

        return `
          <div class="notif-item-card ${!n.read ? 'unread' : ''} ${isSelected ? 'selected' : ''}" 
               onclick="window.NotificationCenterController.selectItem(${n.id})"
               ondblclick="window.NotificationCenterController.openLinkedRecord()"
               style="padding: 13px 16px; border-bottom: 1px solid var(--border-subtle); cursor: pointer; transition: background 0.12s; background: ${isSelected ? 'rgba(37, 99, 235, 0.22)' : 'transparent'}; border-left: ${isSelected ? '4px solid #3b82f6' : '4px solid transparent'};">
            <div style="display: flex; gap: 12px; align-items: flex-start;">
              <div style="width: 38px; height: 38px; border-radius: 8px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.25); display: flex; align-items: center; justify-content: center; font-size: 1.15rem; flex-shrink: 0;">
                ${icon}
              </div>
              <div style="flex: 1; min-width: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; gap: 6px;">
                  <span style="font-size: 0.84rem; font-weight: 700; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${safeTitle}</span>
                  <div style="display: flex; gap: 5px; align-items: center; flex-shrink: 0;">
                    <span style="font-size: 0.65rem; padding: 1px 6px; border-radius: 4px; background: rgba(56, 189, 248, 0.18); color: #38bdf8; font-weight: 700; text-transform: uppercase;">${cat}</span>
                    ${!n.read ? '<span class="dse-notif-badge-new">NEW</span>' : ''}
                    ${actionable ? '<span class="dse-notif-badge-action">ACTION</span>' : ''}
                  </div>
                </div>
                <div style="font-size: 0.76rem; color: var(--text-muted); margin-bottom: 6px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                  ${safeMsg}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.70rem; color: var(--text-dim);">
                  <span>${cat}${ref ? ` • <strong style="color: var(--cyan);">${ref}</strong>` : ''}</span>
                  <span>${dateStr}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');

      this.renderDetail(selectedNotification);
    },

    selectItem(id) {
      const item = notifications.find(n => n.id === id);
      if (item) {
        selectedNotification = item;
        this.renderNotificationList();
      }
    },

    renderDetail(item) {
      const detailPane = document.getElementById('nc-detail-pane');
      if (!detailPane) return;

      if (!item) {
        detailPane.innerHTML = `
          <div style="padding: 50px 20px; text-align: center; color: var(--text-dim); font-size: 0.84rem;">
            <div style="font-size: 2rem; margin-bottom: 10px;">📋</div>
            Select a notification from the list to view full details and linked ERP actions.
          </div>
        `;
        return;
      }

      const safeTitle = (item.title || 'Notification').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeMsg = (item.message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const createdStr = formatNotifDate(item.createdAt);
      const ref = item.referenceNo || item.reference || '';
      const cat = displayCategory(item.category);
      const icon = getModuleIcon(item.category);
      const actionable = isActionable(item);
      const act = (item.actionCode || '').toUpperCase();
      const openBtnText = act === 'APPROVE' ? 'Review Approval' : 'Open Record';

      detailPane.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle);">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
            ${icon}
          </div>
          <div>
            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 800; color: #fff;">Notification Details</h3>
            <span style="font-size: 0.72rem; color: var(--text-dim);">Live ERP Record Connection</span>
          </div>
        </div>

        <div style="background: rgba(15, 23, 42, 0.65); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 16px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 8px;">
            <h4 style="margin: 0; font-size: 0.98rem; font-weight: 800; color: #fff;">${safeTitle}</h4>
            <div style="display: flex; gap: 5px;">
              ${!item.read ? '<span class="dse-notif-badge-new">NEW</span>' : ''}
              ${actionable ? '<span class="dse-notif-badge-action">ACTION</span>' : ''}
            </div>
          </div>
          <p style="margin: 0 0 14px 0; font-size: 0.82rem; color: var(--text-muted); line-height: 1.55;">${safeMsg}</p>

          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.76rem; color: var(--text-dim); border-top: 1px solid rgba(255,255,255,0.06); padding-top: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>${icon}</span>
              <span><strong>${cat}</strong> • ${item.severity || 'INFO'} • ${createdStr} • <span style="color: ${item.read ? 'var(--text-dim)' : 'var(--cyan)'}; font-weight: 700;">${item.read ? 'Read' : 'Unread'}</span></span>
            </div>
            ${ref ? `
              <div style="display: flex; align-items: center; gap: 8px;">
                <span>🔗</span>
                <span>Reference: <strong style="color: var(--cyan);">${ref}</strong> ${item.moduleKey ? `• ${item.moduleKey}` : ''}</span>
              </div>
            ` : '<div style="font-size: 0.72rem; color: var(--text-dim); font-style: italic;">Informational alert with no direct record reference.</div>'}
          </div>
        </div>

        <div style="margin-top: auto; display: flex; flex-direction: column; gap: 10px;">
          <button type="button" class="btn btn-primary" style="width: 100%; height: 38px; font-size: 0.84rem; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; background: #2563eb; border-color: #3b82f6;" onclick="window.NotificationCenterController.openLinkedRecord()">
            <span>👁</span> ${openBtnText}
          </button>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <button type="button" class="btn btn-secondary" style="font-size: 0.78rem; font-weight: 700; padding: 8px 12px; color: #34d399; border-color: rgba(52, 211, 153, 0.4);" onclick="window.NotificationCenterController.toggleRead(${item.id})">
              ${item.read ? '✉ Mark Unread' : '✔ Mark Read'}
            </button>
            <button type="button" class="btn btn-secondary" style="font-size: 0.78rem; font-weight: 700; padding: 8px 12px; color: #f87171; border-color: rgba(248, 113, 113, 0.4);" onclick="window.NotificationCenterController.deleteSelected(${item.id})">
              🗑 Dismiss
            </button>
          </div>
        </div>
      `;
    },

    async toggleRead(id) {
      const item = notifications.find(n => n.id === id);
      if (!item) return;

      try {
        if (item.read) {
          await window.ApiService.post(`/api/insights/notifications/${id}/unread`, {});
          item.read = false;
        } else {
          await window.ApiService.post(`/api/insights/notifications/${id}/read`, {});
          item.read = true;
        }
        this.loadNotifications();
      } catch (err) {
        console.warn('Failed to toggle read:', err);
      }
    },

    async markAllRead() {
      try {
        await window.ApiService.post('/api/insights/notifications/read-all', {});
        if (window.AppDialogService && window.AppDialogService.showToast) {
          window.AppDialogService.showToast('All notifications marked as read', 'success');
        }
        this.loadNotifications();
      } catch (err) {
        if (window.AppDialogService && window.AppDialogService.showToast) {
          window.AppDialogService.showToast('Could not mark all as read: ' + err.message, 'error');
        }
      }
    },

    async deleteSelected(id) {
      try {
        await window.ApiService.delete(`/api/insights/notifications/${id}`);
        if (window.AppDialogService && window.AppDialogService.showToast) {
          window.AppDialogService.showToast('Notification dismissed', 'info');
        }
        this.loadNotifications();
      } catch (err) {
        if (window.AppDialogService && window.AppDialogService.showToast) {
          window.AppDialogService.showToast('Could not dismiss notification: ' + err.message, 'error');
        }
      }
    },

    async clearHistory() {
      let confirmed = false;
      if (window.AppDialogService && typeof window.AppDialogService.confirm === 'function') {
        confirmed = await window.AppDialogService.confirm(
          'Clear Notification History',
          'This action cannot be undone',
          'Clear all your notification history? This action cannot be undone.',
          'Clear History',
          'Cancel'
        );
      } else {
        confirmed = confirm('Clear all your notification history? This action cannot be undone.');
      }
      if (!confirmed) return;
      try {
        await window.ApiService.delete('/api/insights/notifications');
        if (window.AppDialogService && window.AppDialogService.showToast) {
          window.AppDialogService.showToast('Notification history cleared', 'success');
        }
        this.loadNotifications();
      } catch (err) {
        if (window.AppDialogService && window.AppDialogService.showToast) {
          window.AppDialogService.showToast('Could not clear history: ' + err.message, 'error');
        }
      }
    },

    openLinkedRecord() {
      if (!selectedNotification) return;
      const item = selectedNotification;
      const ref = (item.referenceNo || '').trim();
      const mod = (item.moduleKey || item.category || '').toUpperCase();
      const target = (item.targetFxml || '').toLowerCase();
      const title = (item.title || '').toUpperCase();

      // Mark read when opened
      if (!item.read) this.toggleRead(item.id);

      // Close modal
      if (typeof closeModal === 'function') {
        closeModal('modal-notifications-center');
      } else if (window.AppDialogService && window.AppDialogService.closeModal) {
        window.AppDialogService.closeModal('modal-notifications-center');
      }

      if (!window.NavigationRouter) return;

      // 1. User Access / Registration Approvals / Security
      if (mod.includes('REGISTRATION') || target.includes('registration') || title.includes('REGISTRATION') || title.includes('NEW USER APPROVAL')) {
        window.NavigationRouter.selectNav('view-user-access');
        if (window.UserAccessController && window.UserAccessController.openRegistrationApprovals) {
          window.UserAccessController.openRegistrationApprovals();
        }
      }
      // 2. Sales Register & Invoices
      else if (mod.includes('SALE') || ref.startsWith('INV') || ref.startsWith('JI/') || target.includes('sale')) {
        window.NavigationRouter.selectNav('view-sales-register');
        if (window.SalesController && ref) {
          window.SalesController.filterSales(ref);
          window.SalesController.openSaleViewMode(ref);
        }
      }
      // 3. Purchase Register & Bills
      else if (mod.includes('PURCHASE') || ref.startsWith('PO') || ref.startsWith('BILL') || target.includes('purchase')) {
        window.NavigationRouter.selectNav('view-purchase-register');
        if (window.PurchaseController && ref) {
          const searchInp = document.getElementById('pur-filter-search');
          if (searchInp) {
            searchInp.value = ref;
            window.PurchaseController.loadPurchases(0);
          }
          window.PurchaseController.showDetails(ref);
        }
      }
      // 4. Quotations
      else if (mod.includes('QUOTATION') || ref.startsWith('QT') || target.includes('quotation')) {
        window.NavigationRouter.selectNav('view-quotations');
      }
      // 5. Returns
      else if (mod.includes('RETURN') || target.includes('return')) {
        if (mod.includes('PURCHASE') || target.includes('purchase')) {
          window.NavigationRouter.selectNav('view-purchase-returns');
        } else {
          window.NavigationRouter.selectNav('view-sales-returns');
        }
      }
      // 6. Payments
      else if (mod.includes('PAYMENT') || target.includes('payment')) {
        window.NavigationRouter.selectNav('view-bank-entry');
      }
      // 7. Inventory & Item Master
      else if (mod.includes('ITEM') || mod.includes('INVENT') || target.includes('item') || target.includes('inventory')) {
        window.NavigationRouter.selectNav('view-item-master');
      }
      // 8. Banking & Expenses
      else if (mod.includes('BANK') || mod.includes('EXPENSE') || target.includes('bank') || target.includes('expense')) {
        window.NavigationRouter.selectNav('view-bank-entry');
      }
      // 9. Reports & Scheduled Reports
      else if (mod.includes('REPORT') || target.includes('report')) {
        window.NavigationRouter.selectNav('view-reports');
      }
      // 10. Reminders
      else if (mod.includes('REMIND') || target.includes('reminder')) {
        window.NavigationRouter.selectNav('view-reminders');
      }
      // 11. Communication
      else if (mod.includes('COMMUNICATION') || target.includes('communication')) {
        window.NavigationRouter.selectNav('view-communication');
      }
      // 12. Backup & Restore
      else if (mod.includes('BACKUP') || target.includes('backup') || target.includes('rollback')) {
        window.NavigationRouter.selectNav('view-settings-backup');
      }
      // 13. Customer / Supplier CRM
      else if (mod.includes('CUSTOMER') || target.includes('customer')) {
        window.NavigationRouter.selectNav('view-customers');
      } else if (mod.includes('SUPPLIER') || target.includes('supplier')) {
        window.NavigationRouter.selectNav('view-suppliers');
      }
      // 14. Data Import
      else if (mod.includes('IMPORT') || target.includes('import')) {
        window.NavigationRouter.selectNav('view-import');
      }
      // 15. Profile
      else if (mod.includes('PROFILE') || target.includes('profile')) {
        window.NavigationRouter.selectNav('view-profile');
      } else {
        if (window.AppDialogService && window.AppDialogService.showToast) {
          window.AppDialogService.showToast(`Notification: ${ref || item.title}`, 'info');
        }
      }
    },

    openModal() {
      this.loadNotifications();
      if (typeof openModal === 'function') {
        openModal('modal-notifications-center');
      } else if (window.AppDialogService && window.AppDialogService.openModal) {
        window.AppDialogService.openModal('modal-notifications-center');
      }
    }
  };
})();
