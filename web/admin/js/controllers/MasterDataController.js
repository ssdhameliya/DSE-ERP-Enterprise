/**
 * Jasvi Industries ERP - MasterDataController
 * Full Desktop Parity with MasterDataController.java & Masterdata.fxml
 * Lookup categories, lookup entries, live KPI counters, row action menus & CRUD modals
 */
window.MasterDataController = (function() {
  let categories = [];
  let currentCategory = null;
  let currentLookups = [];
  let filteredLookups = [];
  let selectedLookupId = null;
  let selectedMasterId = null;
  let selectedMasterItem = null;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .split('"').join('&quot;')
      .split("'").join('&#39;');
  }

  return {
    async loadMastersData() {
      const catListEl = document.getElementById('masters-category-list');
      const tbody = document.getElementById('masters-table-tbody');
      if (catListEl) catListEl.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-dim);"><div class="spinner"></div> Loading categories...</div>';
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-dim);"><div class="spinner"></div> Loading master lookup entries...</td></tr>';

      try {
        const cats = await window.MasterService.getCategories();
        categories = Array.isArray(cats) ? cats : [];
        


        this.renderCategoriesList(categories);

        // Update KPI 1: Categories
        const kpiCats = document.getElementById('master-kpi-categories');
        if (kpiCats) kpiCats.innerText = categories.length;

        // Auto-select first category or maintain current
        const initialCat = (currentCategory && categories.find(c => (c.categoryName || c.name) === currentCategory)) 
          ? currentCategory 
          : (categories[0]?.categoryName || categories[0]?.name || 'UNIT');

        await this.selectCategory(initialCat);
      } catch (err) {
        console.error('[MasterDataController] Failed to load categories:', err);
        if (catListEl) catListEl.innerHTML = `<div style="padding: 14px; color: #f87171; font-size: 0.8rem;">Failed: ${escapeHtml(err.message)}</div>`;
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #f87171; padding: 24px;">Failed to load lookups: ${escapeHtml(err.message)}</td></tr>`;
      }
    },

    renderCategoriesList(catList) {
      const listEl = document.getElementById('masters-category-list');
      if (!listEl) return;

      if (!catList || catList.length === 0) {
        listEl.innerHTML = '<div style="padding: 14px; text-align: center; color: var(--text-dim); font-size: 0.8rem;">No categories found</div>';
        return;
      }

      listEl.innerHTML = catList.map(c => {
        const name = c.categoryName || c.name || '';
        const isSel = currentCategory === name;
        const activeBadge = c.active !== false 
          ? '<span style="font-size: 0.65rem; color: #34d399;">● Active</span>' 
          : '<span style="font-size: 0.65rem; color: #f87171;">● Inactive</span>';

        return `
          <div class="master-category-item ${isSel ? 'active' : ''}" 
               onclick="window.MasterDataController.selectCategory('${escapeHtml(name)}')"
               style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; margin-bottom: 4px; border-radius: 6px; cursor: pointer; transition: all 0.15s; background: ${isSel ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255,255,255,0.02)'}; border-left: 3px solid ${isSel ? 'var(--cyan)' : 'transparent'};">
            <div>
              <div style="font-size: 0.84rem; font-weight: ${isSel ? '700' : '600'}; color: ${isSel ? 'var(--cyan)' : 'var(--text-main)'};">${escapeHtml(name)}</div>
              <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 2px;">${activeBadge}</div>
            </div>
            <span class="badge" style="background: rgba(255,255,255,0.06); font-size: 0.7rem; color: var(--text-muted);">${c.count != null ? c.count : '•'}</span>
          </div>
        `;
      }).join('');
    },

    filterCategories(q) {
      const query = (q || '').trim().toLowerCase();
      const matched = categories.filter(c => (c.categoryName || c.name || '').toLowerCase().includes(query));
      this.renderCategoriesList(matched);
    },

    async selectCategory(catName) {
      currentCategory = catName;
      if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();

      // Update active style in categories list
      document.querySelectorAll('.master-category-item').forEach(el => {
        el.classList.toggle('active', el.textContent.includes(catName));
      });

      // Update KPI: Selected Category
      const kpiSel = document.getElementById('master-kpi-selected');
      if (kpiSel) kpiSel.innerText = catName;

      const titleEl = document.getElementById('masters-selected-title');
      if (titleEl) titleEl.innerText = `${catName} Lookups`;

      const tbody = document.getElementById('masters-table-tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-dim);"><div class="spinner"></div> Loading lookup records...</td></tr>';

      try {
        let items = [];
        try {
          items = await window.MasterService.getLookups(catName);
        } catch (e) {
          items = await window.MasterService.getLookupsByCategoryCode(catName).catch(() => []);
        }

        currentLookups = Array.isArray(items) ? items : [];

        // Update KPI: Total Values
        const kpiValues = document.getElementById('master-kpi-values');
        if (kpiValues) kpiValues.innerText = currentLookups.length;

        this.applyLookupFilter('');
      } catch (err) {
        console.error('[MasterDataController] Failed to load category lookups:', err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #f87171; padding: 24px;">Failed to load lookups: ${escapeHtml(err.message)}</td></tr>`;
      }
    },

    applyLookupFilter(q) {
      const query = (q || '').trim().toLowerCase();
      filteredLookups = currentLookups.filter(item => {
        if (!query) return true;
        const code = (item.lookupCode || item.code || '').toLowerCase();
        const name = (item.lookupValue || item.name || item.value || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        return code.includes(query) || name.includes(query) || desc.includes(query);
      });

      this.renderLookupsTable(filteredLookups);
    },

    renderLookupsTable(list) {
      const tbody = document.getElementById('masters-table-tbody');
      const counterEl = document.getElementById('masters-entries-counter');
      if (counterEl) counterEl.innerText = `Showing 1 to ${list.length} entries of ${currentLookups.length}`;

      if (!tbody) return;

      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 32px; color: var(--text-dim);">No lookup entries found for category "${escapeHtml(currentCategory)}". Click "+ Add Lookup" to create.</td></tr>`;
        return;
      }

      tbody.innerHTML = list.map((item, idx) => {
        const id = item.id || idx;
        const code = item.lookupCode || item.code || '-';
        const name = item.lookupValue || item.name || item.value || '-';
        const desc = item.description || '-';
        const sortOrder = item.sortOrder != null ? item.sortOrder : (idx + 1);
        const isActive = item.active !== false;

        const statusBadge = isActive 
          ? '<span class="badge badge-paid" style="font-size: 0.72rem;">ACTIVE</span>' 
          : '<span class="badge badge-overdue" style="font-size: 0.72rem;">INACTIVE</span>';

        return `
          <tr onclick="window.MasterDataController.onMasterRowClick('${escapeHtml(id)}', event)" data-master-id="${escapeHtml(id)}" style="cursor: pointer;">
            <td style="font-weight: 700; color: var(--cyan); font-family: monospace;">${escapeHtml(code)}</td>
            <td style="font-weight: 600; color: var(--text-main);">${escapeHtml(name)}</td>
            <td style="color: var(--text-muted); font-size: 0.8rem;">${escapeHtml(desc)}</td>
            <td style="text-align: center; font-size: 0.8rem; color: var(--text-dim);">${sortOrder}</td>
            <td style="text-align: center;">${statusBadge}</td>
            <td style="text-align: center;" onclick="event.stopPropagation()">
              <button class="btn-purple" style="height: 28px; padding: 0 10px; font-size: 0.74rem; font-weight: 600;" 
                      onclick="window.MasterDataController.toggleRowActionsMenu(this, '${escapeHtml(id)}', event)" 
                      title="Lookup Actions">
                ::: Actions
              </button>
            </td>
          </tr>
        `;
      }).join('');
    },

    onMasterRowClick(id, event) {
      if (event && window.RegisterUiSupport && window.RegisterUiSupport.isInteractiveTarget(event.target)) return;
      const drawer = document.getElementById('master-detail-drawer');
      const isOpen = drawer && (drawer.classList.contains('open') || drawer.style.display === 'flex' || drawer.style.display === 'block');
      if (isOpen && String(selectedMasterId) === String(id)) {
        this.closeMasterDrawer();
        return;
      }
      this.openMasterDrawer(id);
    },

    openMasterDrawer(id) {
      const item = currentLookups.find(l => String(l.id) === String(id));
      if (!item) return;
      selectedMasterId = id;
      selectedMasterItem = item;
      selectedLookupId = id;

      const drawer = document.getElementById('master-detail-drawer');
      if (!drawer) return;

      const code = item.lookupCode || item.code || '-';
      const name = item.lookupValue || item.name || item.value || '-';
      const desc = item.description || 'No additional custom attributes specified.';
      const sortOrder = item.sortOrder != null ? item.sortOrder : 1;
      const isActive = item.active !== false;

      const setEl = (elemId, text) => { const el = document.getElementById(elemId); if (el) el.innerText = text; };

      setEl('md-lookup-code', code);
      setEl('md-category', currentCategory || 'LOOKUP');
      setEl('md-name', name);
      setEl('md-sort-order', sortOrder);
      setEl('md-category-name', currentCategory || '-');
      setEl('md-description', desc);

      const badge = document.getElementById('md-status');
      if (badge) {
        badge.innerText = isActive ? 'ACTIVE' : 'INACTIVE';
        badge.className = `pill-badge ${isActive ? 'pill-success' : 'pill-danger'}`;
      }

      if (window.RegisterUiSupport) {
        window.RegisterUiSupport.showDrawer('master-detail-drawer');
        const rowEl = document.querySelector(`#masters-table-tbody tr[data-master-id="${id}"]`);
        if (rowEl) window.RegisterUiSupport.highlightRow('#masters-table-tbody', rowEl);
      } else {
        drawer.style.display = 'flex';
      }
    },

    closeMasterDrawer() {
      selectedMasterId = null;
      selectedMasterItem = null;
      if (window.RegisterUiSupport) {
        window.RegisterUiSupport.hideDrawer('master-detail-drawer', '#masters-table-tbody');
      } else {
        const drawer = document.getElementById('master-detail-drawer');
        if (drawer) drawer.style.display = 'none';
        document.querySelectorAll('#masters-table-tbody tr').forEach(r => r.classList.remove('active-selected-row'));
      }
    },

    drawerEditLookup() {
      if (selectedMasterId) this.openEditLookupModal(selectedMasterId);
    },

    drawerToggleStatus() {
      if (selectedMasterId) this.toggleSelectedLookupActive();
    },

    drawerCopyCode() {
      if (!selectedMasterItem) return;
      const code = selectedMasterItem.lookupCode || selectedMasterItem.code || '';
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => {
          if (window.AppDialogService) window.AppDialogService.toastSuccess(`Copied lookup code "${code}" to clipboard!`);
        }).catch(() => {
          if (window.AppDialogService) window.AppDialogService.toastInfo(`Lookup code: ${code}`);
        });
      }
    },

    toggleRowActionsMenu(btnEl, lookupId, event) {
      if (event) event.stopPropagation();
      selectedLookupId = lookupId;

      const menu = document.getElementById('masters-row-actions-menu');
      if (!menu) return;

      if (menu.classList.contains('show') && menu.dataset.targetId === String(lookupId)) {
        menu.classList.remove('show');
        return;
      }

      const item = currentLookups.find(l => String(l.id) === String(lookupId));
      const isActive = item ? (item.active !== false) : true;
      const toggleLabelEl = document.getElementById('masters-menu-toggle-label');
      const toggleIconEl = document.getElementById('masters-menu-toggle-icon');
      if (toggleLabelEl) {
        toggleLabelEl.textContent = isActive ? 'Deactivate Entry' : 'Reactivate Entry';
      }
      if (toggleIconEl) {
        toggleIconEl.innerHTML = isActive ? '&#9940;' : '&#9989;';
      }

      const rect = btnEl.getBoundingClientRect();
      const menuWidth = 200;
      let left = rect.right - menuWidth;
      let top = rect.bottom + 4;

      if (left < 10) left = 10;
      if (top + 180 > window.innerHeight) {
        top = rect.top - 180;
      }

      menu.style.position = 'fixed';
      menu.style.top = `${top}px`;
      menu.style.left = `${left}px`;
      menu.dataset.targetId = String(lookupId);
      menu.classList.add('show');

      const closeHandler = (e) => {
        if (!menu.contains(e.target) && e.target !== btnEl) {
          menu.classList.remove('show');
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    },

    // ==========================================
    // Category Actions (Desktop MasterDataController Parity)
    // ==========================================
    openAddCategoryModal() {
      const modal = document.getElementById('modal-add-category');
      const input = document.getElementById('input-new-category-name');
      if (input) input.value = '';
      if (modal) modal.style.display = 'flex';
      if (input) input.focus();
    },

    closeAddCategoryModal() {
      const modal = document.getElementById('modal-add-category');
      if (modal) modal.style.display = 'none';
    },

    async submitAddCategory(e) {
      if (e) e.preventDefault();
      const input = document.getElementById('input-new-category-name');
      const name = (input ? input.value : '').trim().toUpperCase();
      if (!name) {
        window.AppDialogService.showToast('Category name cannot be empty', 'error');
        return;
      }

      try {
        await window.MasterService.addCategory(name);
        this.closeAddCategoryModal();
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast(`Category "${name}" created successfully!`, 'success');
        currentCategory = name;
        await this.loadMastersData();
      } catch (err) {
        window.AppDialogService.showToast(`Failed to add category: ${err.message}`, 'error');
      }
    },

    openRenameCategoryModal() {
      if (!currentCategory) return;
      const modal = document.getElementById('modal-rename-category');
      const inputOld = document.getElementById('input-rename-old-category');
      const inputNew = document.getElementById('input-rename-new-category');
      if (inputOld) inputOld.value = currentCategory;
      if (inputNew) { inputNew.value = currentCategory; inputNew.focus(); }
      if (modal) modal.style.display = 'flex';
    },

    closeRenameCategoryModal() {
      const modal = document.getElementById('modal-rename-category');
      if (modal) modal.style.display = 'none';
    },

    async submitRenameCategory(e) {
      if (e) e.preventDefault();
      const inputNew = document.getElementById('input-rename-new-category');
      const newName = (inputNew ? inputNew.value : '').trim().toUpperCase();
      if (!newName || newName === currentCategory) {
        this.closeRenameCategoryModal();
        return;
      }

      try {
        await window.MasterService.renameCategory(currentCategory, newName);
        this.closeRenameCategoryModal();
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast(`Category renamed to "${newName}"!`, 'success');
        currentCategory = newName;
        await this.loadMastersData();
      } catch (err) {
        window.AppDialogService.showToast(`Rename failed: ${err.message}`, 'error');
      }
    },

    async deactivateCurrentCategory() {
      if (!currentCategory) return;
      if (!confirm(`Are you sure you want to deactivate lookup category "${currentCategory}"?\nThis category will be archived.`)) return;

      try {
        await window.MasterService.setCategoryActive(currentCategory, false);
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast(`Category "${currentCategory}" deactivated.`, 'success');
        currentCategory = null;
        await this.loadMastersData();
      } catch (err) {
        window.AppDialogService.showToast(`Deactivation failed: ${err.message}`, 'error');
      }
    },

    // ==========================================
    // Lookup Values CRUD Actions
    // ==========================================
    async openAddLookupModal() {
      const modal = document.getElementById('modal-add-lookup');
      const catField = document.getElementById('m-lookup-category');
      const codeField = document.getElementById('m-lookup-code');
      const valField = document.getElementById('m-lookup-value');
      const descField = document.getElementById('m-lookup-desc');
      const sortField = document.getElementById('m-lookup-sort');
      const titleEl = document.getElementById('modal-lookup-title');

      const category = currentCategory || 'GENERAL';
      if (titleEl) titleEl.innerText = `Add Lookup (${category})`;
      if (catField) catField.value = category;
      if (codeField) {
        codeField.value = 'Generating...';
        codeField.readOnly = true;
      }
      if (valField) valField.value = '';
      if (descField) descField.value = '';
      if (sortField) sortField.value = currentLookups.length + 1;
      if (modal) modal.style.display = 'flex';
      if (valField) valField.focus();

      try {
        const res = await window.MasterService.getNextLookupCode(category);
        const nextCode = (res && typeof res === 'object') ? (res.code || '') : (res || '');
        if (codeField && codeField.value === 'Generating...') {
          codeField.value = nextCode;
        }
      } catch (err) {
        console.warn('Failed to fetch next lookup code:', err);
        if (codeField && codeField.value === 'Generating...') {
          codeField.value = '';
        }
      }
      if (valField) valField.focus();
    },

    submitLookupSave(e) {
      return this.submitSaveLookup(e);
    },

    closeLookupModal() {
      const modal = document.getElementById('modal-add-lookup');
      if (modal) modal.style.display = 'none';
      selectedLookupId = null;
    },

    openEditSelectedLookup() {
      const menu = document.getElementById('masters-row-actions-menu');
      if (menu) menu.classList.remove('show');

      const item = currentLookups.find(l => String(l.id) === String(selectedLookupId) || String(l.lookupCode) === String(selectedLookupId));
      if (!item) return;

      const modal = document.getElementById('modal-add-lookup');
      const catField = document.getElementById('m-lookup-category');
      const codeField = document.getElementById('m-lookup-code');
      const valField = document.getElementById('m-lookup-value');
      const descField = document.getElementById('m-lookup-desc');
      const sortField = document.getElementById('m-lookup-sort');
      const titleEl = document.getElementById('modal-lookup-title');

      if (titleEl) titleEl.innerText = `Edit Lookup (${item.lookupCode || item.code})`;
      if (catField) catField.value = currentCategory || '';
      if (codeField) { codeField.value = item.lookupCode || item.code || ''; codeField.disabled = true; }
      if (valField) valField.value = item.lookupValue || item.name || item.value || '';
      if (descField) descField.value = item.description || '';
      if (sortField) sortField.value = item.sortOrder || 1;
      if (modal) modal.style.display = 'flex';
      if (valField) valField.focus();
    },

    async submitSaveLookup(e) {
      if (e) e.preventDefault();
      const code = document.getElementById('m-lookup-code')?.value?.trim();
      const val = document.getElementById('m-lookup-value')?.value?.trim();
      const desc = document.getElementById('m-lookup-desc')?.value?.trim() || '';
      const sort = parseInt(document.getElementById('m-lookup-sort')?.value, 10) || 1;

      if (!code || !val) {
        window.AppDialogService.showToast('Lookup Code and Value are required!', 'error');
        return;
      }

      const payload = {
        type: currentCategory,
        categoryCode: currentCategory,
        lookupCode: code,
        lookupValue: val,
        description: desc,
        sortOrder: sort,
        active: true
      };

      try {
        if (selectedLookupId) {
          payload.id = selectedLookupId;
          await window.MasterService.updateLookup(payload);
          window.AppDialogService.showToast(`Lookup "${val}" updated successfully!`, 'success');
        } else {
          await window.MasterService.saveLookup(payload);
          window.AppDialogService.showToast(`Lookup "${val}" created successfully!`, 'success');
        }

        this.closeLookupModal();
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        await this.selectCategory(currentCategory);
      } catch (err) {
        window.AppDialogService.showToast(`Save failed: ${err.message}`, 'error');
      }
    },

    async toggleSelectedLookupActive() {
      const menu = document.getElementById('masters-row-actions-menu');
      if (menu) menu.classList.remove('show');

      const item = currentLookups.find(l => String(l.id) === String(selectedLookupId));
      if (!item) return;

      const newStatus = !(item.active !== false);
      try {
        await window.MasterService.setLookupActive(item.id, newStatus);
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast(`Lookup status updated to ${newStatus ? 'ACTIVE' : 'INACTIVE'}`, 'success');
        await this.selectCategory(currentCategory);
      } catch (err) {
        window.AppDialogService.showToast(`Status change failed: ${err.message}`, 'error');
      }
    },

    toggleLookupStatus() {
      return this.toggleSelectedLookupActive();
    },

    deleteLookup() {
      window.AppDialogService.showToast('Master lookups with business transaction history cannot be deleted. Deactivating record instead.', 'warning');
      return this.toggleSelectedLookupActive();
    },

    async deleteSelectedLookup() {
      const menu = document.getElementById('masters-row-actions-menu');
      if (menu) menu.classList.remove('show');

      const item = currentLookups.find(l => String(l.id) === String(selectedLookupId));
      if (!item) return;

      if (!confirm(`Are you sure you want to delete lookup "${item.lookupValue || item.name}"?`)) return;

      try {
        await window.MasterService.deleteLookup(item.id);
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast('Lookup deleted successfully.', 'success');
        await this.selectCategory(currentCategory);
      } catch (err) {
        window.AppDialogService.showToast(`Delete failed: ${err.message}`, 'error');
      }
    },

    exportLookup() {
      if (!currentLookups || currentLookups.length === 0) {
        window.AppDialogService.showToast('No lookup records to export.', 'info');
        return;
      }
      const headers = ['Category', 'Code', 'Display Name', 'Description', 'Sort Order', 'Active'];
      const sanitizeCsv = (val) => {
        const s = String(val || '').split('"').join('""');
        return '"' + s + '"';
      };
      const rows = currentLookups.map(l => [
        sanitizeCsv(currentCategory),
        sanitizeCsv(l.lookupCode || l.code || ''),
        sanitizeCsv(l.lookupValue || l.name || ''),
        sanitizeCsv(l.description || ''),
        l.sortOrder != null ? l.sortOrder : 1,
        l.active !== false ? 'YES' : 'NO'
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Master_Lookups_${currentCategory}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.AppDialogService.showToast(`Exported ${currentLookups.length} records to CSV.`, 'success');
    }
  };
})();

// Install escape listener for Master Detail Drawer
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.RegisterUiSupport) {
      window.RegisterUiSupport.installEscapeClose('master-detail-drawer', () => {
        if (window.MasterDataController && window.MasterDataController.closeMasterDrawer) {
          window.MasterDataController.closeMasterDrawer();
        }
      });
    }
  });
}

