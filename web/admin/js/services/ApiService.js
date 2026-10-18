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
     * Download any file from server with Bearer auth, verifying HTTP status before saving
     */
    async downloadFile(endpoint, filename) {
      try {
        const token = localStorage.getItem('dse_access_token');
        const url = endpoint.startsWith('http') ? endpoint : (BASE_URL + endpoint);
        const res = await fetch(url, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!res.ok) {
          let errorMsg = `Download failed (HTTP ${res.status})`;
          try {
            const errData = await res.json();
            if (errData && (errData.message || errData.error)) {
              errorMsg = errData.message || errData.error;
            }
          } catch (_) {
            const text = await res.text().catch(() => '');
            if (text && text.length < 200) errorMsg = text;
          }
          throw new Error(errorMsg);
        }
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename || 'download';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
      } catch (err) {
        console.error('[ApiService] downloadFile failed:', err);
        if (window.AppDialogService) {
          window.AppDialogService.toastError(err.message || 'Could not download file');
        } else {
          alert('Download error: ' + (err.message || 'Could not download file'));
        }
        throw err;
      }
    },

    /**
     * Open any authenticated file stream in a new browser tab using blob URL
     */
    async viewFile(endpoint) {
      try {
        const token = localStorage.getItem('dse_access_token');
        const url = endpoint.startsWith('http') ? endpoint : (BASE_URL + endpoint);
        const res = await fetch(url, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!res.ok) {
          let errorMsg = `Preview failed (HTTP ${res.status})`;
          try {
            const errData = await res.json();
            if (errData && (errData.message || errData.error)) errorMsg = errData.message || errData.error;
          } catch (_) {}
          throw new Error(errorMsg);
        }
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      } catch (err) {
        console.error('[ApiService] viewFile failed:', err);
        if (window.AppDialogService) {
          window.AppDialogService.toastError(err.message || 'Could not preview file');
        } else {
          alert('Preview error: ' + (err.message || 'Could not preview file'));
        }
        throw err;
      }
    },

    /**
     * Fetch document PDF from canonical server generator and open in browser viewer/tab
     */
    async openPdfPreview(type, number) {
      return this.viewDocumentPdf(type, number);
    },

    /**
     * View document PDF in browser tab directly using valid JWT credentials
     */
    async viewDocumentPdf(type, number) {
      const endpoint = `/api/documents/render?type=${encodeURIComponent(type)}&number=${encodeURIComponent(number)}&format=PDF`;
      return this.viewFile(endpoint);
    },

    /**
     * Download document PDF directly using valid JWT credentials
     */
    async downloadDocumentPdf(type, number) {
      const filename = `${type}-${number}.pdf`;
      const endpoint = `/api/documents/render?type=${encodeURIComponent(type)}&number=${encodeURIComponent(number)}&format=PDF`;
      return this.downloadFile(endpoint, filename);
    }
  };
})();
