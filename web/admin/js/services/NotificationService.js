/**
 * Jasvi Industries ERP - NotificationService
 * Central event broadcaster and persistent notification service matching desktop NotificationService.java.
 * Backed by Spring backend /api/insights/notifications.
 */
window.NotificationService = (function() {
  'use strict';

  return {
    async createNotification(category, title, message, severity = 'INFO', targetView = null, referenceNo = null, moduleKey = null, recordId = null) {
      if (!window.AuthService || !window.AuthService.isAuthenticated()) return;
      try {
        const payload = {
          category: (category || 'SYSTEM').toUpperCase(),
          title: title || 'Notification',
          message: message || '',
          severity: (severity || 'INFO').toUpperCase(),
          targetFxml: targetView, // mapped to web targetView/hash
          referenceNo: referenceNo || null,
          moduleKey: moduleKey || null,
          recordId: recordId || null,
          actionCode: 'VIEW'
        };

        const res = await window.ApiService.post('/api/insights/notifications', payload);

        // Update header notification badge immediately
        if (window.App && window.App.pollShellCounts) {
          window.App.pollShellCounts();
        }

        // If NotificationCenter is open, refresh it
        if (window.NotificationCenterController && window.NotificationCenterController.loadNotifications) {
          window.NotificationCenterController.loadNotifications();
        }

        return res;
      } catch (err) {
        console.warn('[NotificationService] Failed to send notification to backend:', err.message);
      }
    },

    notifySale(invoiceNo, customerName, totalAmount) {
      const formattedAmt = parseFloat(totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
      return this.createNotification(
        'SALES',
        `Sales Invoice Generated: ${invoiceNo}`,
        `Invoice ${invoiceNo} generated for ${customerName} amounting to ₹${formattedAmt}.`,
        'INFO',
        'view-sales-register',
        invoiceNo,
        'SALES'
      );
    },

    notifyPurchase(billNo, supplierName, totalAmount) {
      const formattedAmt = parseFloat(totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
      return this.createNotification(
        'PURCHASES',
        `Purchase Bill Inwarded: ${billNo}`,
        `Inward bill ${billNo} received from ${supplierName} for ₹${formattedAmt}.`,
        'INFO',
        'view-purchase-register',
        billNo,
        'PURCHASES'
      );
    },

    notifyQuotation(quoteNo, partyName, totalAmount) {
      const formattedAmt = parseFloat(totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
      return this.createNotification(
        'QUOTATIONS',
        `Quotation Created: ${quoteNo}`,
        `Proforma quotation ${quoteNo} generated for ${partyName} valuing ₹${formattedAmt}.`,
        'INFO',
        'view-quotations',
        quoteNo,
        'QUOTATIONS'
      );
    },

    notifyReturn(returnNo, partyName, totalAmount, returnType = 'SALES RETURN') {
      const formattedAmt = parseFloat(totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
      const isSales = returnType.toUpperCase().includes('SALES');
      return this.createNotification(
        'RETURNS',
        `${returnType}: ${returnNo}`,
        `Goods return note ${returnNo} processed for ${partyName} totaling ₹${formattedAmt}.`,
        'INFO',
        isSales ? 'view-sales-returns' : 'view-purchase-returns',
        returnNo,
        'RETURNS'
      );
    },

    notifyPayment(voucherNo, partyName, amount) {
      const formattedAmt = parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
      return this.createNotification(
        'PAYMENTS',
        `Payment Voucher Recorded: ${voucherNo}`,
        `Voucher ${voucherNo} settled for ${partyName} with amount ₹${formattedAmt}.`,
        'INFO',
        'view-bank-entry',
        voucherNo,
        'PAYMENTS'
      );
    },

    notifyBackup(filename) {
      return this.createNotification(
        'BACKUP',
        `Database Backup Completed`,
        `Snapshot archive ${filename} successfully verified and cataloged.`,
        'INFO',
        'view-settings-backup',
        filename,
        'BACKUP'
      );
    },

    notifySecurity(title, message, severity = 'WARN') {
      return this.createNotification('SECURITY', title, message, severity, 'view-profile');
    },

    notifyInventory(itemCode, action = 'Stock adjusted', description = '') {
      return this.createNotification(
        'INVENTORY',
        `Inventory: ${itemCode}`,
        `${action} for item ${itemCode}${description ? ` (${description})` : ''}.`,
        'INFO',
        'view-item-master',
        itemCode,
        'ITEMS'
      );
    },

    notifyBanking(actionLabel, amount, ref = '') {
      const formattedAmt = parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
      return this.createNotification(
        'BANKING',
        `Bank Transaction: ${actionLabel}`,
        `${actionLabel} recorded: ₹${formattedAmt}${ref ? ` (Ref: ${ref})` : ''}.`,
        'INFO',
        'view-bank-entry',
        ref,
        'BANKING'
      );
    },

    notifyReminder(title, status = 'created') {
      return this.createNotification(
        'REMINDERS',
        `Reminder: ${title}`,
        `Reminder "${title}" marked as ${status}.`,
        'INFO',
        'view-reminders',
        null,
        'REMINDERS'
      );
    },

    notifyApproval(docNo, type = 'Sale', approved = true) {
      const statusText = approved ? 'approved' : 'rejected';
      return this.createNotification(
        'APPROVAL',
        `${type} ${docNo} ${statusText}`,
        `${type} ${docNo} was ${statusText}.`,
        approved ? 'INFO' : 'WARN',
        type.toUpperCase().includes('PURCHASE') ? 'view-purchase-register' : 'view-sales-register',
        docNo,
        type.toUpperCase().includes('PURCHASE') ? 'PURCHASES' : 'SALES'
      );
    }
  };
})();
