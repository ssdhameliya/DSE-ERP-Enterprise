/**
 * Jasvi Industries ERP - NotificationCenterController
 * Complete Desktop Parity matching NotificationCenterController.java & NotificationService.java
 * Backed by typed Spring insights endpoints:
 *   GET /api/insights/notifications?limit=50
 *   GET /api/insights/notifications/unread-count
 *   POST /api/insights/notifications/{id}/read
 *   POST /api/insights/notifications/{id}/unread
 *   POST /api/insights/notifications/read-all
 *   DELETE /api/insights/notifications/{id}
 *   DELETE /api/insights/notifications
 */
window.NotificationCenterController = (function() {
  const ALL = 'All Notifications';
  const BASE_FILTERS = [
    ALL, 'Unread', 'Action Needed', 'Approval', 'Sales', 'Purchases',
    'Quotations', 'Returns', 'Payments', 'Inventory', 'Reminders',
    'Communication', 'Security', 'System', 'Update', 'Backup'
  ];

  let notifications = [];
  let currentFilter = ALL;
  let selectedNotification = null;
  let searchQuery = '';

  function isActionable(item) {
    if (!item) return false;
    const cat = (item.category || '').toUpperCase();
    const sev = (item.severity || '').toUpperCase();
    const act = (item.actionCode || '').toUpperCase();
    return sev === 'WARN' || sev === 'ERROR' || act.includes('ACTION') || act.includes('APPROV') || cat === 'APPROVAL' || cat === 'REMINDERS';
  }

  function getSeverityBadge(sev) {
    const s = (sev || 'INFO').toUpperCase();
    if (s === 'ERROR') return '<span class="badge" style="background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid rgba(239,68,68,0.4);">CRITICAL</span>';
    if (s === 'WARN') return '<span class="badge" style="background: rgba(251,191,36,0.2); color: #fbbf24; border: 1px solid rgba(251,191,36,0.4);">WARNING</span>';
    return '<span class="badge" style="background: rgba(56,189,248,0.2); color: #38bdf8; border: 1px solid rgba(56,189,248,0.4);">INFO</span>';
  }

  function timeAgo(millis) {
    if (!millis) return 'Just now';
    const now = Date.now();
    const diff = Math.max(0, now - millis);
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  return {
    async loadNotifications() {
      try {
        const list = await window.ApiService.get('/api/insights/notifications?limit=50');
        notifications = Array.isArray(list) ? list : [];

        // Update header badge
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

  const CATEGORIES = [
    { key: 'Approval', label: 'Approval', icon: '✔' },
    { key: 'Sales', label: 'Sales', icon: '🛒' },
    { key: 'Purchases', label: 'Purchases', icon: '📦' },
    { key: 'Quotations', label: 'Quotations', icon: '📑' },
    { key: 'Returns', label: 'Returns', icon: '↺' },
    { key: 'Payments', label: 'Payments', icon: '💳' },
    { key: 'Inventory', label: 'Inventory', icon: '🏷' },
    { key: 'Reminders', label: 'Reminders', icon: '⏰' },
    { key: 'Communication', label: 'Communication', icon: '✉' },
    { key: 'Security', label: 'Security', icon: '🔒' },
    { key: 'System', label: 'System', icon: '🔔' },
    { key: 'Update', label: 'Update', icon: '⚡' },
    { key: 'Backup', label: 'Backup', icon: '💾' }
  ];

  function formatNotifDate(ts) {
    if (!ts) return '-';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return '-';
      const day = String(d.getDate()).padStart(2, '0');
      const mon = String(d.getMonth() + 1).padStart(2, '0');
      const yr = d.getFullYear();
      let hrs = d.getHours();
      const mins = String(d.getMinutes()).padStart(2, '0');
      const ampm = hrs >= 12 ? 'PM' : 'AM';
      hrs = hrs % 12;
      if (hrs === 0) hrs = 12;
      const hrsStr = String(hrs).padStart(2, '0');
      return `${day}/${mon}/${yr} • ${hrsStr}:${mins} ${ampm}`;
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
    if (c.includes('REMIND')) return '⏰';
    if (c.includes('COMM')) return '✉';
    if (c.includes('APPROV')) return '✔';
    if (c.includes('BACKUP')) return '💾';
    if (c.includes('SEC')) return '🔒';
    return '🔔';
  }

  return {
    async loadNotifications() {
      try {
        const list = await window.ApiService.get('/api/insights/notifications?limit=50');
        notifications = Array.isArray(list) ? list : [];

        // Update header badge
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

      const counts = {};
      notifications.forEach(n => {
        const cat = (n.category || 'System').toUpperCase();
        CATEGORIES.forEach(c => {
          if (c.key.toUpperCase() === cat || (c.key === 'Sales' && cat.includes('SALE')) || (c.key === 'Purchases' && cat.includes('PURCHASE'))) {
            counts[c.key] = (counts[c.key] || 0) + 1;
          }
        });
      });

      let html = `
        <div style="padding: 10px 12px 6px; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-dim); font-weight: 800;">
          FILTERS
        </div>
        <div style="padding: 0 12px 10px; font-size: 0.82rem; font-weight: 700; color: var(--text-main);">
          Categories
        </div>
      `;

      CATEGORIES.forEach(c => {
        const count = counts[c.key] || 0;
        const isActive = currentFilter === c.key;
        html += `
          <div class="notif-category-item ${isActive ? 'active' : ''}" onclick="window.NotificationCenterController.setFilter('${c.key}')" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-radius: 6px; cursor: pointer; margin-bottom: 2px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 0.85rem; color: ${isActive ? '#fff' : 'var(--text-muted)'};">${c.icon}</span>
              <span style="font-size: 0.78rem; font-weight: ${isActive ? '700' : '600'}; color: ${isActive ? '#fff' : 'var(--text-muted)'};">${c.label}</span>
            </div>
            <span style="font-size: 0.72rem; padding: 1px 7px; border-radius: 10px; font-weight: 700; background: ${count > 0 ? (isActive ? 'rgba(255,255,255,0.25)' : 'rgba(56, 189, 248, 0.2)') : 'rgba(255,255,255,0.05)'}; color: ${count > 0 ? (isActive ? '#fff' : 'var(--cyan)') : 'var(--text-dim)'};">
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
        if (currentFilter === 'Unread') return !n.read;
        if (currentFilter === 'Action Needed') return isActionable(n);
        if (currentFilter !== ALL) {
          const c = (n.category || 'System').toUpperCase();
          if (c !== currentFilter.toUpperCase() && !c.includes(currentFilter.toUpperCase())) return false;
        }
        return true;
      });

      if (searchQuery) {
        visible = visible.filter(n => {
          const hay = `${n.title || ''} ${n.message || ''} ${n.referenceNo || ''} ${n.category || ''}`.toLowerCase();
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
          <div style="padding: 40px 20px; text-align: center; color: var(--text-dim); font-size: 0.82rem;">
            No notifications in this category.
          </div>
        `;
        this.renderDetail(null);
        return;
      }

      // If nothing selected or selected not in list, select first
      if (!selectedNotification || !visible.find(n => n.id === selectedNotification.id)) {
        selectedNotification = visible[0];
      }

      listPane.innerHTML = visible.map(n => {
        const isSelected = selectedNotification && selectedNotification.id === n.id;
        const safeTitle = (n.title || 'Notification').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeMsg = (n.message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const cat = (n.category || 'Sales').toUpperCase();
        const icon = getModuleIcon(cat);
        const ref = n.referenceNo || n.reference || '';
        const dateStr = formatNotifDate(n.createdAt);

        return `
          <div class="notif-item-card ${!n.read ? 'unread' : ''} ${isSelected ? 'selected' : ''}" 
               onclick="window.NotificationCenterController.selectItem(${n.id})"
               ondblclick="window.NotificationCenterController.openLinkedRecord()"
               style="padding: 14px 16px; border-bottom: 1px solid var(--border-subtle); cursor: pointer; transition: background 0.15s; background: ${isSelected ? 'rgba(37, 99, 235, 0.22)' : 'transparent'}; border-left: ${isSelected ? '4px solid #3b82f6' : '4px solid transparent'};">
            <div style="display: flex; gap: 12px; align-items: flex-start;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">
                ${icon}
              </div>
              <div style="flex: 1; min-width: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <span style="font-size: 0.84rem; font-weight: 700; color: #fff;">${safeTitle}</span>
                  <div style="display: flex; gap: 6px; align-items: center;">
                    <span style="font-size: 0.68rem; padding: 1px 7px; border-radius: 4px; background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 700; text-transform: uppercase;">${n.category || 'Sales'}</span>
                    ${!n.read ? '<span style="font-size: 0.68rem; padding: 1px 7px; border-radius: 4px; background: rgba(59, 130, 246, 0.3); color: #60a5fa; font-weight: 700;">NEW</span>' : ''}
                  </div>
                </div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 6px; line-height: 1.4;">
                  ${safeMsg}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 0.72rem; color: var(--text-dim);">${n.category || 'Sales'} • ${ref || '-'}</span>
                  <span style="font-size: 0.72rem; color: var(--text-dim);">${dateStr}</span>
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
          <div style="padding: 40px; text-align: center; color: var(--text-dim); font-size: 0.84rem;">
            Select a notification from the list to view full details and linked ERP actions.
          </div>
        `;
        return;
      }

      const safeTitle = (item.title || 'Notification').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeMsg = (item.message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const createdStr = formatNotifDate(item.createdAt);
      const ref = item.referenceNo || item.reference || '';
      const cat = (item.category || 'Sales').toUpperCase();
      const icon = getModuleIcon(cat);

      detailPane.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle);">
          <div style="width: 32px; height: 32px; border-radius: 6px; background: rgba(16, 185, 129, 0.15); display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
            ${icon}
          </div>
          <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: #fff;">Notification Details</h3>
        </div>

        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h4 style="margin: 0 0 10px 0; font-size: 0.95rem; font-weight: 800; color: #fff;">${safeTitle}</h4>
          <p style="margin: 0 0 14px 0; font-size: 0.82rem; color: var(--text-muted); line-height: 1.5;">${safeMsg}</p>

          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.76rem; color: var(--text-dim); border-top: 1px solid rgba(255,255,255,0.06); padding-top: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>${icon}</span>
              <span>${item.category || 'Sales'} • ${item.severity || 'INFO'} • ${createdStr} • ${item.read ? 'Read' : 'Unread'}</span>
            </div>
            ${ref ? `
              <div style="display: flex; align-items: center; gap: 8px;">
                <span>🔗</span>
                <span>Reference: <strong style="color: var(--cyan);">${ref}</strong> • ${cat}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div style="margin-top: auto; display: flex; flex-direction: column; gap: 10px;">
          <button type="button" class="btn btn-primary" style="width: 100%; height: 38px; font-size: 0.82rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; background: rgba(59, 130, 246, 0.85); border-color: #3b82f6;" onclick="window.NotificationCenterController.openLinkedRecord()">
            <span>👁</span> Open Record
          </button>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <button type="button" class="btn btn-secondary" style="font-size: 0.78rem; font-weight: 600; padding: 8px 12px; color: #34d399; border-color: rgba(52, 211, 153, 0.4);" onclick="window.NotificationCenterController.toggleRead(${item.id})">
              ${item.read ? '✉ Mark Unread' : '✔ Mark Read'}
            </button>
            <button type="button" class="btn btn-secondary" style="font-size: 0.78rem; font-weight: 600; padding: 8px 12px; color: #f87171; border-color: rgba(248, 113, 113, 0.4);" onclick="window.NotificationCenterController.deleteSelected(${item.id})">
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
        window.AppDialogService.showToast('All notifications marked as read', 'success');
        this.loadNotifications();
      } catch (err) {
        window.AppDialogService.showToast('Could not mark all as read: ' + err.message, 'error');
      }
    },

    async deleteSelected(id) {
      try {
        await window.ApiService.delete(`/api/insights/notifications/${id}`);
        window.AppDialogService.showToast('Notification dismissed', 'info');
        this.loadNotifications();
      } catch (err) {
        window.AppDialogService.showToast('Could not dismiss notification: ' + err.message, 'error');
      }
    },

    async clearHistory() {
      if (!confirm('Clear all your notification history? This action cannot be undone.')) return;
      try {
        await window.ApiService.delete('/api/insights/notifications');
        window.AppDialogService.showToast('Notification history cleared', 'success');
        this.loadNotifications();
      } catch (err) {
        window.AppDialogService.showToast('Could not clear history: ' + err.message, 'error');
      }
    },

    openLinkedRecord() {
      if (!selectedNotification) return;
      const item = selectedNotification;
      const ref = (item.referenceNo || '').trim();
      const mod = (item.moduleKey || item.category || '').toUpperCase();
      const target = (item.targetFxml || '').toLowerCase();

      // Mark read when opened
      if (!item.read) this.toggleRead(item.id);

      window.AppDialogService.closeModal('modal-notifications-center');

      if (mod.includes('SALE') || ref.startsWith('INV') || ref.startsWith('JI/') || target.includes('sale')) {
        window.NavigationRouter.selectNav('view-sales-register');
        if (window.SalesController) {
          window.SalesController.filterSales(ref);
          window.SalesController.openSaleViewMode(ref);
        }
      } else if (mod.includes('PURCHASE') || ref.startsWith('PO') || ref.startsWith('BILL') || target.includes('purchase')) {
        window.NavigationRouter.selectNav('view-purchase-register');
        if (window.PurchaseController) {
          const searchInp = document.getElementById('pur-filter-search');
          if (searchInp) {
            searchInp.value = ref;
            window.PurchaseController.loadPurchases(0);
          }
          window.PurchaseController.showDetails(ref);
        }
      } else if (mod.includes('CUSTOMER') || target.includes('customer')) {
        window.NavigationRouter.selectNav('view-customers');
      } else if (mod.includes('SUPPLIER') || target.includes('supplier')) {
        window.NavigationRouter.selectNav('view-suppliers');
      } else if (mod.includes('ITEM') || mod.includes('INVENTORY') || target.includes('item')) {
        window.NavigationRouter.selectNav('view-item-master');
      } else if (mod.includes('QUOTATION') || ref.startsWith('QT')) {
        window.NavigationRouter.selectNav('view-quotations');
      } else if (mod.includes('RETURN') || target.includes('return')) {
        window.NavigationRouter.selectNav('view-sales-returns');
      } else if (mod.includes('PAYMENT') || target.includes('payment')) {
        window.NavigationRouter.selectNav('view-payment-receipt');
      } else if (mod.includes('REMINDER') || target.includes('reminder')) {
        window.NavigationRouter.selectNav('view-reminders');
      } else if (mod.includes('COMMUNICATION') || target.includes('communication')) {
        window.NavigationRouter.selectNav('view-communication');
      } else {
        window.AppDialogService.showToast(`Notification referenced: ${ref}`, 'info');
      }
    },

    openModal() {
      this.loadNotifications();
      window.AppDialogService.openModal('modal-notifications-center');
    }
  };
})();
