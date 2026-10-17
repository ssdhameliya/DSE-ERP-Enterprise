/**
 * Jasvi Industries ERP - ApiService
 * Centralized HTTP Client with Bearer Token Injection & Binary Octet-Stream Uploads
 * 100% Server Authoritative - Zero Mock Poisoning
 */
window.ApiService = (function() {
  const BASE_URL = ''; // Relative path communicates directly with the current host/proxy

  return {
    async request(endpoint, options = {}) {
      const token = localStorage.getItem('dse_access_token');
      const isBinaryUpload = options.isBinaryUpload === true;
      const headers = isBinaryUpload ? {} : { 'Content-Type': 'application/json', 'Accept': 'application/json' };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Merge additional headers if provided
      if (options.headers) {
        Object.assign(headers, options.headers);
      }

      const fetchOptions = {
        credentials: 'same-origin',
        ...options,
        headers
      };
      delete fetchOptions.isBinaryUpload;

      try {
        const url = endpoint.startsWith('http') ? endpoint : (BASE_URL + endpoint);
        const res = await fetch(url, fetchOptions);

        if (res.status === 401) {
          console.warn(`[ApiService] 401 Unauthorized on ${endpoint}`);
          const errData = await res.json().catch(() => ({}));
          const errorMsg = errData.message || errData.error || 'Authentication session expired. Please sign in again.';

          if (!endpoint.includes('/api/auth/')) {
            localStorage.removeItem('dse_access_token');
            const formMfa = document.getElementById('form-mfa');
            const isMfaActive = (window.AuthService && window.AuthService.getPendingMfaChallenge()) ||
                                (formMfa && formMfa.style.display !== 'none');
            if (!isMfaActive && window.showAuthOverlay) {
              window.showAuthOverlay();
            }
          }
          const error = new Error(errorMsg);
          error.status = 401;
          error.data = errData;
          throw error;
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.warn(`[ApiService] HTTP ${res.status} on ${endpoint}:`, errData);
          const errorMsg = errData.message || errData.error || `Server error (${res.status})`;
          const error = new Error(errorMsg);
          error.status = res.status;
          error.data = errData;
          throw error;
        }

        // Check if response is JSON or binary blob/text
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          return await res.json();
        } else if (contentType.includes('application/octet-stream') || contentType.includes('application/pdf')) {
          return await res.blob();
        }
        return await res.text();
      } catch (err) {
        console.error(`[ApiService] Network/API error on ${endpoint}:`, err);
        throw err;
      }
    },

    get(endpoint) {
      return this.request(endpoint, { method: 'GET' });
    },

    post(endpoint, data) {
      return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) });
    },

    put(endpoint, data) {
      return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) });
    },

    delete(endpoint) {
      return this.request(endpoint, { method: 'DELETE' });
    },

    /**
     * Upload raw binary file bytes matching Desktop SupportApiClient:
     * PUT /api/support/.../attachment-file?filename=...
     * Content-Type: application/octet-stream
     */
    async uploadBinary(endpoint, filename, fileBlobOrArrayBuffer) {
      const encName = encodeURIComponent(filename || 'attachment');
      const separator = endpoint.includes('?') ? '&' : '?';
      const targetUrl = `${endpoint}${separator}filename=${encName}`;

      return this.request(targetUrl, {
        method: 'PUT',
        isBinaryUpload: true,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Accept': 'application/json'
        },
        body: fileBlobOrArrayBuffer
      });
    },

    /**
     * Fetch document PDF from canonical server generator and open in browser viewer/tab
     */
    async openPdfPreview(type, number) {
      return this.downloadDocumentPdf(type, number);
    },

    /**
     * Download document PDF directly
     */
    async downloadDocumentPdf(type, number) {
      try {
        const token = localStorage.getItem('erp_token') || sessionStorage.getItem('erp_token');
        const url = `${this.BASE_URL}/api/documents/render?type=${encodeURIComponent(type)}&number=${encodeURIComponent(number)}&format=PDF`;
        const res = await fetch(url, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error(`Failed to download PDF (HTTP ${res.status})`);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${type}-${number}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
      } catch (err) {
        console.error('[ApiService] downloadDocumentPdf failed:', err);
        if (window.AppDialogService) window.AppDialogService.toastError(err.message || 'Could not download PDF');
      }
    }
  };
})();
