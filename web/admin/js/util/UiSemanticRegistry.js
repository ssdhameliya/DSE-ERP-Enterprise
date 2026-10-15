/**
 * Jasvi Industries ERP - UiSemanticRegistry
 * Canonical Semantic Presentation Registry matching desktop UiSemanticRegistry.java
 * and semantic-registry.properties.
 *
 * Centralizes all icon identities, color families, and vocabulary mappings
 * so every screen shares the exact same visual language.
 */
window.UiSemanticRegistry = (function() {
  'use strict';

  // 1. Color Palette Definitions (matching desktop CSS & AppDialogRenderer)
  const COLOURS = {
    blue: { name: 'blue', hex: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)' },
    purple: { name: 'purple', hex: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)', border: 'rgba(167, 139, 250, 0.35)' },
    green: { name: 'green', hex: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.35)' },
    indigo: { name: 'indigo', hex: '#818cf8', bg: 'rgba(129, 140, 248, 0.15)', border: 'rgba(129, 140, 248, 0.35)' },
    orange: { name: 'orange', hex: '#fb923c', bg: 'rgba(251, 146, 60, 0.15)', border: 'rgba(251, 146, 60, 0.35)' },
    pink: { name: 'pink', hex: '#f472b6', bg: 'rgba(244, 114, 182, 0.15)', border: 'rgba(244, 114, 182, 0.35)' },
    teal: { name: 'teal', hex: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.15)', border: 'rgba(45, 212, 191, 0.35)' },
    yellow: { name: 'yellow', hex: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.35)' },
    red: { name: 'red', hex: '#f87171', bg: 'rgba(248, 113, 113, 0.15)', border: 'rgba(248, 113, 113, 0.35)' },
    neutral: { name: 'neutral', hex: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.25)' }
  };

  // 2. Semantic Vocabulary to Icon & Color Mapping
  // Exact desktop parity mapping
  const SEMANTICS = {
    'document': { icon: '📄', colour: 'purple', label: 'Document' },
    'invoice': { icon: '📄', colour: 'purple', label: 'Invoice' },
    'purchase': { icon: '📦', colour: 'indigo', label: 'Purchase' },
    'quotation': { icon: '📝', colour: 'blue', label: 'Quotation' },
    'return': { icon: '🔄', colour: 'orange', label: 'Return' },
    'date': { icon: '📅', colour: 'purple', label: 'Date' },
    'calendar': { icon: '📅', colour: 'purple', label: 'Calendar' },
    'time': { icon: '⏰', colour: 'teal', label: 'Time' },
    'customer': { icon: '🏢', colour: 'blue', label: 'Customer' },
    'supplier': { icon: '🏭', colour: 'indigo', label: 'Supplier' },
    'party': { icon: '👥', colour: 'blue', label: 'Party' },
    'user': { icon: '👤', colour: 'teal', label: 'User' },
    'contact': { icon: '📇', colour: 'teal', label: 'Contact' },
    'phone': { icon: '📞', colour: 'teal', label: 'Phone' },
    'mobile': { icon: '📱', colour: 'teal', label: 'Mobile' },
    'email': { icon: '✉️', colour: 'teal', label: 'Email' },
    'whatsapp': { icon: '💬', colour: 'green', label: 'WhatsApp' },
    'address': { icon: '📍', colour: 'pink', label: 'Address' },
    'location': { icon: '📍', colour: 'pink', label: 'Location' },
    'amount': { icon: '💰', colour: 'green', label: 'Amount' },
    'total': { icon: '₹', colour: 'green', label: 'Total' },
    'balance': { icon: '💼', colour: 'orange', label: 'Balance' },
    'paid': { icon: '💳', colour: 'green', label: 'Paid' },
    'due': { icon: '⏳', colour: 'yellow', label: 'Due' },
    'tax': { icon: '🏷️', colour: 'orange', label: 'Tax' },
    'gst': { icon: '🏷️', colour: 'orange', label: 'GST' },
    'gstin': { icon: '🏷️', colour: 'orange', label: 'GSTIN' },
    'hsn': { icon: '🔢', colour: 'indigo', label: 'HSN' },
    'item': { icon: '🏷️', colour: 'blue', label: 'Item' },
    'sku': { icon: '🔖', colour: 'indigo', label: 'SKU' },
    'description': { icon: '📋', colour: 'purple', label: 'Description' },
    'quantity': { icon: '📦', colour: 'orange', label: 'Quantity' },
    'unit': { icon: '📏', colour: 'teal', label: 'Unit' },
    'rate': { icon: '💲', colour: 'green', label: 'Rate' },
    'discount': { icon: '🏷️', colour: 'orange', label: 'Discount' },
    'status': { icon: '🏷️', colour: 'purple', label: 'Status' },
    'actions': { icon: '⚙️', colour: 'purple', label: 'Actions' },
    'category': { icon: '📁', colour: 'orange', label: 'Category' },
    'bank': { icon: '🏦', colour: 'blue', label: 'Bank' },
    'account': { icon: '💳', colour: 'indigo', label: 'Account' },
    'reference': { icon: '🔗', colour: 'indigo', label: 'Reference' },
    'security': { icon: '🛡️', colour: 'purple', label: 'Security' },
    'notes': { icon: '📝', colour: 'neutral', label: 'Notes' },
    'transporter': { icon: '🚚', colour: 'orange', label: 'Transporter' },
    'delivery': { icon: '🚚', colour: 'orange', label: 'Delivery' },
    'vehicle': { icon: '🚛', colour: 'orange', label: 'Vehicle' },
    'e-way': { icon: '🚚', colour: 'cyan', label: 'E-Way Bill' },
    'payment-mode': { icon: '💳', colour: 'indigo', label: 'Payment Mode' },
    'print': { icon: '🖨️', colour: 'blue', label: 'Print' },
    'barcode': { icon: '|||', colour: 'indigo', label: 'Barcode' },
    'link': { icon: '🔗', colour: 'blue', label: 'Link' },
    'audit': { icon: '📜', colour: 'neutral', label: 'Audit' },
    'salesperson': { icon: '👔', colour: 'teal', label: 'Salesperson' },
    'check': { icon: '☑️', colour: 'blue', label: 'Select' }
  };

  function normalize(str) {
    if (!str) return '';
    return str.toString().toLowerCase().trim()
      .replace(/&amp;/g, 'and')
      .replace(/&/g, 'and')
      .replace(/₹/g, 'amount')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  return {
    COLOURS,
    SEMANTICS,

    /**
     * Resolves header icon and colour theme based on column heading text
     */
    headerSemantic(headingText, columnId) {
      const text = normalize(headingText);
      const id = normalize(columnId);
      const combined = (text + ' ' + id).trim();

      if (!text && !id) return { icon: '📋', colour: 'neutral', label: '' };

      // Exact & substring priority matching (matching Desktop ProfessionalUiEnhancer.java)
      if (text === '#' || text === 'no' || text === 'sr no' || text === 'select' || id.includes('select') || id.includes('checkbox')) {
        return { icon: '☑️', colour: 'blue', label: headingText, isCheckbox: true };
      }
      if (combined.includes('invoice') || combined.includes('bill no') || combined.includes('voucher') || combined.includes('doc no') || combined.includes('document')) {
        return { icon: '📄', colour: 'purple', label: headingText };
      }
      if (combined.includes('purchase no') || combined.includes('po no') || combined.includes('inward no')) {
        return { icon: '📦', colour: 'indigo', label: headingText };
      }
      if (combined.includes('quotation') || combined.includes('quote no')) {
        return { icon: '📝', colour: 'blue', label: headingText };
      }
      if (combined.includes('return no') || combined.includes('debit note') || combined.includes('credit note')) {
        return { icon: '🔄', colour: 'orange', label: headingText };
      }
      if (combined.includes('date') || combined.includes('valid upto') || combined.includes('period')) {
        return { icon: '📅', colour: 'purple', label: headingText };
      }
      if (combined.includes('customer') || combined.includes('client')) {
        return { icon: '🏢', colour: 'blue', label: headingText };
      }
      if (combined.includes('supplier') || combined.includes('vendor')) {
        return { icon: '🏭', colour: 'indigo', label: headingText };
      }
      if (combined.includes('party')) {
        return { icon: '👥', colour: 'blue', label: headingText };
      }
      if (combined.includes('phone') || combined.includes('mobile') || combined.includes('contact')) {
        return { icon: '📞', colour: 'teal', label: headingText };
      }
      if (combined.includes('email')) {
        return { icon: '✉️', colour: 'teal', label: headingText };
      }
      if (combined.includes('whatsapp')) {
        return { icon: '💬', colour: 'green', label: headingText };
      }
      if (combined.includes('gstin') || combined.includes('tax no')) {
        return { icon: '🏷️', colour: 'orange', label: headingText };
      }
      if (combined.includes('place of supply') || combined.includes('pos') || combined.includes('state') || combined.includes('city') || combined.includes('address')) {
        return { icon: '📍', colour: 'pink', label: headingText };
      }
      if (combined.includes('item code') || combined.includes('sku') || combined.includes('part no')) {
        return { icon: '🔖', colour: 'indigo', label: headingText };
      }
      if (combined.includes('item') || combined.includes('product') || combined.includes('description') || combined.includes('goods')) {
        return { icon: '🏷️', colour: 'blue', label: headingText };
      }
      if (combined.includes('hsn') || combined.includes('sac')) {
        return { icon: '🔢', colour: 'indigo', label: headingText };
      }
      if (combined.includes('qty') || combined.includes('quantity') || combined.includes('stock')) {
        return { icon: '📦', colour: 'orange', label: headingText };
      }
      if (combined.includes('unit') || combined.includes('uom')) {
        return { icon: '📏', colour: 'teal', label: headingText };
      }
      if (combined.includes('rate') || combined.includes('price') || combined.includes('unit price')) {
        return { icon: '💲', colour: 'green', label: headingText };
      }
      if (combined.includes('discount')) {
        return { icon: '🏷️', colour: 'orange', label: headingText };
      }
      if (combined.includes('taxable') || combined.includes('tax value') || combined.includes('gst amount')) {
        return { icon: '🏷️', colour: 'orange', label: headingText };
      }
      if (combined.includes('paid amount') || combined.includes('received') || combined.includes('paid')) {
        return { icon: '💳', colour: 'green', label: headingText };
      }
      if (combined.includes('pending') || combined.includes('due amount') || combined.includes('balance')) {
        return { icon: '⏳', colour: 'yellow', label: headingText };
      }
      if (combined.includes('total') || combined.includes('grand total') || combined.includes('amount') || combined.includes('value') || combined.includes('net amount')) {
        return { icon: '💰', colour: 'green', label: headingText };
      }
      if (combined.includes('payment status') || combined.includes('payment due') || combined.includes('pay status')) {
        return { icon: '💳', colour: 'teal', label: headingText };
      }
      if (combined.includes('return status')) {
        return { icon: '🔄', colour: 'orange', label: headingText };
      }
      if (combined.includes('document status') || combined.includes('doc status') || combined.includes('status')) {
        return { icon: '🏷️', colour: 'purple', label: headingText };
      }
      if (combined.includes('actions') || combined.includes('action') || combined.includes('operations')) {
        return { icon: '⚙️', colour: 'purple', label: headingText };
      }
      if (combined.includes('salesperson') || combined.includes('agent') || combined.includes('rep')) {
        return { icon: '👔', colour: 'teal', label: headingText };
      }
      if (combined.includes('created by') || combined.includes('user') || combined.includes('author')) {
        return { icon: '👤', colour: 'teal', label: headingText };
      }
      if (combined.includes('transporter') || combined.includes('vehicle') || combined.includes('lr no')) {
        return { icon: '🚚', colour: 'orange', label: headingText };
      }
      if (combined.includes('bank') || combined.includes('account')) {
        return { icon: '🏦', colour: 'blue', label: headingText };
      }

      return { icon: '🏷️', colour: 'blue', label: headingText };
    },

    /**
     * Resolves status badge style and icon (matching Desktop SemanticTableCells.java)
     */
    statusSemantic(rawValue) {
      if (rawValue === null || rawValue === undefined) return null;
      const v = rawValue.toString().trim().toUpperCase();
      if (!v || v === '-' || v === 'N/A') return null;

      // SUCCESS (Green)
      if (v === 'APPROVED' || v === 'PAID' || v === 'SETTLED' || v === 'COMPLETE' || v === 'COMPLETED' ||
          v === 'ACTIVE' || v === 'SENT' || v === 'DELIVERED' || v === 'ACCEPTED' || v === 'CLOSED' ||
          v === 'POSTED' || v === 'IN STOCK' || v === 'VERIFIED' || v === 'MATCHED' || v === 'SUCCESS') {
        let icon = '✔';
        if (v === 'PAID') icon = '💳';
        if (v === 'SENT') icon = '✈';
        if (v === 'DELIVERED') icon = '📦';
        return { state: 'success', color: 'green', icon, text: v };
      }

      // DANGER / ERROR (Red)
      if (v === 'CANCELLED' || v === 'CANCELED' || v === 'REJECTED' || v === 'OVERDUE' || v === 'EXPIRED' ||
          v === 'INACTIVE' || v === 'FAILED' || v === 'ERROR' || v === 'DELETED' || v === 'OUT OF STOCK' ||
          v === 'LOCKED' || v === 'BLOCKED') {
        return { state: 'danger', color: 'red', icon: '✕', text: v };
      }

      // WARNING / PENDING (Amber)
      if (v === 'PENDING' || v === 'UNPAID' || v === 'OPEN' || v === 'DRAFT' || v === 'SOON' ||
          v === 'WAITING' || v === 'REVIEW' || v === 'NOT SENT' || v === 'UNSENT' || v === 'LOW STOCK' ||
          v === 'PARTIALLY_PAID' || v === 'PARTIAL' || v === 'IN PROGRESS') {
        let icon = '⏱';
        if (v.includes('PARTIAL')) icon = '◐';
        if (v === 'DRAFT') icon = '📝';
        if (v.includes('SENT')) icon = '✉';
        return { state: 'warning', color: 'yellow', icon, text: v };
      }

      // INFO / BLUE
      if (v === 'FULLY_RETURNED' || v === 'RETURNED' || v === 'RECONCILED' || v === 'IMPORTED' || v === 'PROCESSING') {
        return { state: 'info', color: 'blue', icon: '🔄', text: v };
      }

      // Default: Not a recognized status string - do not decorate
      return null;
    },

    /**
     * Resolves KPI Card icon and accent colour based on card title
     */
    kpiSemantic(label) {
      const text = normalize(label);
      if (text.includes('revenue') || text.includes('sales') || text.includes('collection') || text.includes('turnover')) {
        return { icon: '💰', colour: 'green', glow: 'rgba(52, 211, 153, 0.25)' };
      }
      if (text.includes('purchase') || text.includes('expense') || text.includes('spending')) {
        return { icon: '📦', colour: 'indigo', glow: 'rgba(129, 140, 248, 0.25)' };
      }
      if (text.includes('pending') || text.includes('due') || text.includes('receivable')) {
        return { icon: '⏳', colour: 'yellow', glow: 'rgba(251, 191, 36, 0.25)' };
      }
      if (text.includes('overdue') || text.includes('critical') || text.includes('rejected') || text.includes('cancel')) {
        return { icon: '🚨', colour: 'red', glow: 'rgba(248, 113, 113, 0.25)' };
      }
      if (text.includes('customer') || text.includes('client') || text.includes('party')) {
        return { icon: '👥', colour: 'blue', glow: 'rgba(56, 189, 248, 0.25)' };
      }
      if (text.includes('inventory') || text.includes('stock') || text.includes('sku') || text.includes('material')) {
        return { icon: '🏭', colour: 'orange', glow: 'rgba(251, 146, 60, 0.25)' };
      }
      if (text.includes('gst') || text.includes('tax') || text.includes('compliance')) {
        return { icon: '⚖️', colour: 'purple', glow: 'rgba(167, 139, 250, 0.25)' };
      }
      return { icon: '📊', colour: 'blue', glow: 'rgba(56, 189, 248, 0.25)' };
    },

    /**
     * Resolves form label icon based on label text or input id
     */
    fieldSemantic(labelText, inputId) {
      const text = normalize(labelText);
      const id = normalize(inputId);
      const combined = (text + ' ' + id).trim();

      if (combined.includes('customer') || combined.includes('client')) return '🏢';
      if (combined.includes('supplier') || combined.includes('vendor')) return '🏭';
      if (combined.includes('party')) return '👥';
      if (combined.includes('invoice') || combined.includes('bill no') || combined.includes('document')) return '📄';
      if (combined.includes('date')) return '📅';
      if (combined.includes('phone') || combined.includes('mobile')) return '📞';
      if (combined.includes('email')) return '✉️';
      if (combined.includes('password')) return '🔑';
      if (combined.includes('username') || combined.includes('user')) return '👤';
      if (combined.includes('address') || combined.includes('city') || combined.includes('state') || combined.includes('pincode')) return '📍';
      if (combined.includes('gstin') || combined.includes('tax')) return '🏷️';
      if (combined.includes('item') || combined.includes('sku') || combined.includes('product')) return '🏷️';
      if (combined.includes('hsn') || combined.includes('sac')) return '🔢';
      if (combined.includes('quantity') || combined.includes('qty')) return '📦';
      if (combined.includes('rate') || combined.includes('price')) return '💲';
      if (combined.includes('total') || combined.includes('amount')) return '💰';
      if (combined.includes('discount')) return '🏷️';
      if (combined.includes('transporter') || combined.includes('vehicle')) return '🚚';
      if (combined.includes('payment') || combined.includes('mode') || combined.includes('bank')) return '💳';
      if (combined.includes('notes') || combined.includes('remarks') || combined.includes('terms')) return '📝';
      if (combined.includes('search')) return '🔍';
      return null;
    }
  };
})();
