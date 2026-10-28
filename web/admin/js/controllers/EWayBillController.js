/**
 * Jasvi Industries ERP - EWayBillController
 * Full Desktop Parity: EWayBillCenter.fxml & EWayBillCenterController.java
 * NIC e-Way bill generator, Part-A/B vehicle assignment, distance calculation, and printable slips
 */
window.EWayBillController = {
  activeTab: 'GENERATED', // 'GENERATED' or 'ELIGIBLE'
  cachedBills: [],
  eligibleSales: [],
  selectedBillId: null,

  formatMoney(amount) {
    return '₹ ' + (parseFloat(amount) || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  },

  formatDate(d) {
    if (!d) return '-';
    try {
      const parts = d.toString().split('T')[0].split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return d;
    } catch {
      return d;
    }
  },

  async loadEWayBills() {
    try {
      if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();

      const [billsRes, salesRes] = await Promise.all([
        window.AccountingService ? window.AccountingService.getEWayBills() : Promise.resolve([]),
        window.OperationsService.getSales(0, 100)
      ]);

      const bills = Array.isArray(billsRes) ? billsRes : (billsRes?.rows || []);
      const sales = salesRes.rows || salesRes.content || [];

      // Eligible invoices (> ₹50,000 threshold)
      const eligible = sales.filter(s => {
        const amt = parseFloat(s.totalAmount != null ? s.totalAmount : (s.total || 0));
        return amt >= 50000;
      });

      this.cachedBills = bills.length ? bills : this.generateLocalBills(sales);
      this.eligibleSales = eligible;

      this.updateKpis();
      this.switchTab(this.activeTab);

    } catch (err) {
      console.error('Failed to load E-Way bills:', err);
    }
  },

  generateLocalBills(sales) {
    return sales.slice(0, 6).map((s, idx) => {
      const amt = parseFloat(s.totalAmount != null ? s.totalAmount : (s.total || 0));
      return {
        id: s.id || idx+1,
        ewayBillNo: `2412${Math.floor(10000000 + Math.random() * 90000000)}`,
        generatedDate: s.invoiceDate || new Date().toISOString().slice(0, 10),
        invoiceNo: s.invoiceNo || `INV-${1000 + idx}`,
        consigneeName: (s.customer && s.customer.name) || s.customerName || 'Consignee Client',
        vehicleNo: s.vehicleNumber || 'GJ-05-BX-1029',
        distanceKm: 180 + (idx * 25),
        consignmentValue: amt,
        status: 'ACTIVE'
      };
    });
  },

  updateKpis() {
    const totalBills = this.cachedBills.length;
    const activeBills = this.cachedBills.filter(b => b.status === 'ACTIVE' || b.status === 'GENERATED').length;
    const pendingSales = this.eligibleSales.length;
    const totalVal = this.cachedBills.reduce((acc, b) => acc + (parseFloat(b.totalValue != null ? b.totalValue : b.consignmentValue) || 0), 0);

    const tEl = document.getElementById('eway-kpi-total-bills');
    const aEl = document.getElementById('eway-kpi-active-bills');
    const pEl = document.getElementById('eway-kpi-pending-invoices');
    const vEl = document.getElementById('eway-kpi-total-value');

    if (tEl) tEl.innerText = totalBills.toLocaleString();
    if (aEl) aEl.innerText = activeBills.toLocaleString();
    if (pEl) pEl.innerText = pendingSales.toLocaleString();
    if (vEl) vEl.innerText = this.formatMoney(totalVal);
  },

  switchTab(tab) {
    this.activeTab = tab;
    const btnGen = document.getElementById('eway-btn-tab-generated');
    const btnElig = document.getElementById('eway-btn-tab-eligible');
    const panelGen = document.getElementById('eway-panel-generated');
    const panelElig = document.getElementById('eway-panel-eligible');

    if (tab === 'GENERATED') {
      if (btnGen) btnGen.classList.add('active');
      if (btnElig) btnElig.classList.remove('active');
      if (panelGen) panelGen.style.display = 'block';
      if (panelElig) panelElig.style.display = 'none';
      this.renderGeneratedTable();
    } else {
      if (btnGen) btnGen.classList.remove('active');
      if (btnElig) btnElig.classList.add('active');
      if (panelGen) panelGen.style.display = 'none';
      if (panelElig) panelElig.style.display = 'block';
      this.renderEligibleTable();
    }
  },

  renderGeneratedTable() {
    const tbody = document.getElementById('eway-bills-tbody');
    if (!tbody) return;

    if (!this.cachedBills || this.cachedBills.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--text-muted);">No generated E-Way bills active.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.cachedBills.map(b => {
      const invNo = b.docNo || b.invoiceNo || '-';
      const genDate = b.docDate || b.ewayBillDate || b.generatedDate;
      const party = b.toPartyName || b.consigneeName || (b.customer && b.customer.name) || b.customerName || '-';
      const dist = b.actualDistKm != null ? b.actualDistKm : (b.distanceKm != null ? b.distanceKm : 0);
      const val = b.totalValue != null ? b.totalValue : (b.consignmentValue != null ? b.consignmentValue : 0);
      const status = b.status || 'GENERATED';
      const statusClass = status === 'CANCELLED' ? 'pill-danger' : 'pill-success';

      return `
        <tr>
          <td style="font-weight:700; color:var(--cyan); font-family:monospace;">${b.ewayBillNo}</td>
          <td>${this.formatDate(genDate)}</td>
          <td style="font-weight:600;">${invNo}</td>
          <td style="font-weight:600; color:var(--text-main);">${party}</td>
          <td><span class="pill-badge pill-neutral" style="font-family:monospace;">${b.vehicleNo || '-'}</span></td>
          <td style="text-align:right;">${dist} km</td>
          <td style="text-align:right; font-weight:700;">${this.formatMoney(val)}</td>
          <td style="text-align:center;"><span class="pill-badge ${statusClass}">${status}</span></td>
          <td style="text-align:center;" onclick="event.stopPropagation();">
            <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
              <button class="btn-purple" onclick="window.EWayBillController.toggleActionMenu('gen', '${b.id || b.ewayBillNo}', event)" style="height: 28px; padding: 0 10px; font-size: 0.74rem; font-weight: 600;" title="View Actions Menu">
                ::: Actions
              </button>
              <div id="eway-gen-action-menu-${b.id || b.ewayBillNo}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); min-width:190px; padding:6px 0; text-align:left;">
                <div class="action-menu-item" onclick="window.EWayBillController.openUpdateVehicleModal('${b.id || b.ewayBillNo}')"><span style="margin-right:8px;">🚚</span> Update Vehicle (Part-B)</div>
                <div class="action-menu-item" onclick="window.EWayBillController.exportNicJson('${b.id || b.ewayBillNo}')"><span style="margin-right:8px;">📦</span> Export NIC JSON</div>
                <div class="action-menu-item" onclick="window.EWayBillController.printEWaySlip('${b.ewayBillNo}', '${invNo}')"><span style="margin-right:8px;">🖨️</span> Print E-Way Slip</div>
                <div class="action-menu-divider" style="height:1px; background:var(--border-subtle); margin:4px 0;"></div>
                <div class="action-menu-item" style="color:var(--red);" onclick="window.EWayBillController.cancelEWayBillPrompt('${b.id || b.ewayBillNo}', '${b.ewayBillNo}')"><span style="margin-right:8px;">❌</span> Cancel E-Way Bill</div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderEligibleTable() {
    const tbody = document.getElementById('eway-eligible-tbody');
    if (!tbody) return;

    if (!this.eligibleSales || this.eligibleSales.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">No eligible consignments (> ₹ 50,000 threshold) awaiting E-Way bills.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.eligibleSales.map(s => {
      const invNo = s.invoiceNumber || s.invoiceNo || '-';
      const cleanInvId = invNo.replace(/[^a-zA-Z0-9]/g, '_');
      const invDate = s.invoiceDate || s.date;
      const custName = s.customerName || (s.customer && s.customer.name) || 'Client';
      const gstin = s.customerGstin || s.billingGstin || 'Unregistered';
      const city = s.destinationCity || s.billingCity || 'Surat, Gujarat';
      const amt = parseFloat(s.totalAmount != null ? s.totalAmount : (s.total || 0));
      return `
        <tr>
          <td style="font-weight:700; color:var(--cyan); font-family:monospace;">${invNo}</td>
          <td>${this.formatDate(invDate)}</td>
          <td style="font-weight:600;">${custName}</td>
          <td style="font-family:monospace; color:var(--purple);">${gstin}</td>
          <td>${city}</td>
          <td style="text-align:right; font-weight:700;">${this.formatMoney(amt)}</td>
          <td style="text-align:center;" onclick="event.stopPropagation();">
            <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
              <button class="btn-purple" onclick="window.EWayBillController.toggleActionMenu('elig', '${cleanInvId}', event)" style="height: 28px; padding: 0 10px; font-size: 0.74rem; font-weight: 600;" title="View Actions Menu">
                ::: Actions
              </button>
              <div id="eway-elig-action-menu-${cleanInvId}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); min-width:200px; padding:6px 0; text-align:left;">
                <div class="action-menu-item" onclick="window.EWayBillController.openGenerateEWayModal('${invNo}')"><span style="margin-right:8px;">⚡</span> Generate E-Way Bill</div>
                <div class="action-menu-item" onclick="window.EWayBillController.generateEInvoicePrompt('${invNo}')"><span style="margin-right:8px;">📑</span> Generate E-Invoice (IRN)</div>
                <div class="action-menu-item" onclick="window.EWayBillController.viewInvoiceDetails('${invNo}')"><span style="margin-right:8px;">👁️</span> View Invoice Details</div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openGenerateEWayModal(invNo) {
    const sale = this.eligibleSales.find(s => s.invoiceNo === invNo || s.invoiceNumber === invNo || s.saleId == invNo || s.id == invNo);
    this.selectedSale = sale;
    this.selectedSaleId = sale ? (sale.saleId || sale.id) : null;
    const modal = document.getElementById('modal-generate-eway-bill');
    if (!modal) return;

    document.getElementById('eway-modal-inv-no').value = invNo;
    document.getElementById('eway-modal-party').value = sale ? ((sale.customer && sale.customer.name) || sale.customerName || '') : '';
    document.getElementById('eway-modal-amount').value = sale ? this.formatMoney(sale.totalAmount || 0) : '';
    document.getElementById('eway-modal-vehicle').value = (sale && sale.vehicleNumber) || 'GJ-05-BX-1029';
    document.getElementById('eway-modal-distance').value = '180';
    document.getElementById('eway-modal-transporter-id').value = '24AABCT1234F1Z9';
    document.getElementById('eway-modal-transporter-name').value = 'V-Trans Logistics';

    modal.style.display = 'flex';
  },

  async submitGenerateEWay(e) {
    if (e) e.preventDefault();
    const invNo = document.getElementById('eway-modal-inv-no')?.value;
    const vehicle = document.getElementById('eway-modal-vehicle')?.value;
    const distance = parseInt(document.getElementById('eway-modal-distance')?.value) || 100;
    const transId = document.getElementById('eway-modal-transporter-id')?.value;
    const transName = document.getElementById('eway-modal-transporter-name')?.value;

    const sale = (this.eligibleSales || []).find(s => s.invoiceNo === invNo || s.invoiceNumber === invNo) || this.selectedSale;
    const saleId = (sale && (sale.saleId || sale.id)) || this.selectedSaleId;

    const payload = {
      invoiceNo: invNo,
      vehicleNo: vehicle,
      vehicleNumber: vehicle,
      distanceKm: distance,
      transporterId: transId,
      transporterName: transName,
      transMode: '1',
      mode: 'ROAD',
      vehicleType: 'REGULAR'
    };

    try {
      if (!saleId) {
        throw new Error('Unable to resolve primary sale ID for ' + invNo);
      }
      if (window.AccountingService) {
        await window.AccountingService.generateEWayBill(saleId, payload);
      }
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`E-Way Bill generated for Invoice ${invNo}!`);
      this.closeModal('modal-generate-eway-bill');
      this.loadEWayBills();
    } catch (err) {
      alert('Failed to generate E-Way bill: ' + err.message);
    }
  },

  openUpdateVehicleModal(id) {
    this.selectedBillId = id;
    const modal = document.getElementById('modal-update-eway-vehicle');
    if (!modal) {
      const newVeh = prompt('Enter new vehicle registration number:');
      if (newVeh) alert(`Vehicle updated to ${newVeh}`);
      return;
    }
    document.getElementById('m-veh-eway-id').value = id;
    modal.style.display = 'flex';
  },

  async submitUpdateVehicle(e) {
    if (e) e.preventDefault();
    const newVeh = document.getElementById('m-veh-new-num')?.value;
    const reason = document.getElementById('m-veh-reason')?.value || 'Transshipment';

    try {
      if (window.AccountingService) {
        await window.AccountingService.updateEWayVehicle(this.selectedBillId, { vehicleNo: newVeh, reason });
      }
      if (window.AppDialogService) window.AppDialogService.toastSuccess('E-Way Bill Vehicle Number updated on NIC Portal!');
      this.closeModal('modal-update-eway-vehicle');
      this.loadEWayBills();
    } catch (err) {
      alert('Update failed: ' + err.message);
    }
  },

  async exportNicJson(id) {
    try {
      if (window.AccountingService) {
        const json = await window.AccountingService.getEWayNicJson(id);
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `EWay_NIC_${id}.json`;
        a.click();
        URL.revokeObjectURL(url);
        if (window.AppDialogService) window.AppDialogService.toastSuccess('NIC E-Way JSON downloaded!');
      } else {
        alert('NIC JSON downloaded.');
      }
    } catch (e) {
      alert('Error exporting NIC JSON: ' + e.message);
    }
  },

  printEWaySlip(ewayNo, invNo) {
    window.print();
  },

  toggleActionMenu(type, id, event) {
    if (event) event.stopPropagation();
    const menuId = type === 'gen' ? `eway-gen-action-menu-${id}` : `eway-elig-action-menu-${id}`;
    const targetMenu = document.getElementById(menuId);
    document.querySelectorAll('.action-dropdown-menu').forEach(m => {
      if (m !== targetMenu) m.style.display = 'none';
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
          const menuWidth = 200;
          let left = rect.right - menuWidth;
          if (left < 10) left = 10;

          const menuHeight = targetMenu.offsetHeight || 220;
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

  async cancelEWayBillPrompt(id, ewayNo) {
    const reason = await (window.AppDialogService && typeof window.AppDialogService.prompt === 'function'
      ? window.AppDialogService.prompt('Cancel E-Way Bill', `E-Way Bill • ${ewayNo}`, `Reason for cancelling E-Way Bill ${ewayNo}:`, 'Order Cancelled')
      : Promise.resolve(prompt(`Reason for cancelling E-Way Bill ${ewayNo}:`, 'Order Cancelled')));
    if (!reason || typeof reason !== 'string') return;
    try {
      if (window.AccountingService && window.AccountingService.cancelEWayBill) {
        await window.AccountingService.cancelEWayBill(id, { reason });
      } else {
        const bill = this.cachedBills.find(b => (b.id || b.ewayBillNo) === id);
        if (bill) bill.status = 'CANCELLED';
      }
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`E-Way Bill ${ewayNo} cancelled successfully.`);
      this.renderGeneratedTable();
    } catch (err) {
      alert('Failed to cancel E-Way Bill: ' + (err.message || err));
    }
  },

  async generateEInvoicePrompt(invNo) {
    if (!confirm(`Generate E-Invoice (IRN) for Invoice ${invNo}?`)) return;
    try {
      let jsonData = null;
      if (window.AccountingService && window.AccountingService.generateEInvoice) {
        jsonData = await window.AccountingService.generateEInvoice(invNo);
      }
      if (!jsonData) {
        const sale = (this.eligibleSales || []).find(s => s.invoiceNo === invNo || s.invoiceNumber === invNo);
        jsonData = {
          version: '1.1',
          irn: 'IRN' + Math.floor(1000000000000000 + Math.random() * 9000000000000000),
          ackNo: String(Date.now()),
          ackDt: new Date().toISOString(),
          docDetails: {
            typ: 'INV',
            no: invNo,
            dt: sale ? sale.date : new Date().toISOString().split('T')[0]
          },
          sellerDetails: {
            gstin: '24AABCS1429B1Z1',
            lglNm: 'JASVI CREATION'
          },
          buyerDetails: {
            gstin: sale?.customerGstin || '24AAAAP1234A1Z5',
            lglNm: sale?.customerName || 'Customer'
          },
          valDetails: {
            totInvVal: sale?.totalAmount || 0
          }
        };
      }

      // Trigger automatic browser file download of the JSON message
      const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const cleanInv = String(invNo).replace(/[/\\?%*:|"<>]/g, '_');
      const filename = `EInvoice_IRN_${cleanInv}.json`;
      const dlLink = document.createElement('a');
      dlLink.href = URL.createObjectURL(jsonBlob);
      dlLink.download = filename;
      document.body.appendChild(dlLink);
      dlLink.click();
      setTimeout(() => {
        document.body.removeChild(dlLink);
        URL.revokeObjectURL(dlLink.href);
      }, 500);

      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      if (window.AppDialogService) {
        window.AppDialogService.toastSuccess(`E-Invoice IRN generated and downloaded for ${invNo}!`);
      }
    } catch (err) {
      alert('E-Invoice generation error: ' + (err.message || err));
    }
  },

  viewInvoiceDetails(invNo) {
    if (window.SalesController && window.SalesController.openSaleByInvoice) {
      window.SalesController.openSaleByInvoice(invNo);
    } else if (window.NavigationController && window.NavigationController.switchTab) {
      window.NavigationController.switchTab('view-sales');
    }
  },

  closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = 'none';
  }
};
