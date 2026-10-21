/**
 * Jasvi Industries ERP - ApiService
 * Centralized HTTP Client with Bearer Token Injection & Binary Octet-Stream Uploads
 * 100% Server Authoritative - Zero Mock Poisoning
 */
window.ApiService = (function() {
  const BASE_URL = (function() {
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      return 'https://erp.jasviindustries.in';
    }
    return ''; // Relative path communicates directly with the current host/proxy
  })();

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
          let errorMsg = errData.message || errData.error || errData.details || `Server error (${res.status})`;
          if (errData.details && errData.details !== errorMsg && !errorMsg.includes(errData.details)) {
            errorMsg = `${errorMsg} • ${errData.details}`;
          }
          if (Array.isArray(errData.errors) && errData.errors.length > 0) {
            errorMsg = `${errorMsg} (${errData.errors.join(', ')})`;
          }
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
     * POST raw binary file bytes matching Desktop SupportApiClient:
     * POST /api/support/documents/.../attachments?filename=...
     * Content-Type: application/octet-stream
     */
    async postBinary(endpoint, filename, fileBlobOrArrayBuffer) {
      const encName = encodeURIComponent(filename || 'attachment');
      const separator = endpoint.includes('?') ? '&' : '?';
      const targetUrl = `${endpoint}${separator}filename=${encName}`;

      return this.request(targetUrl, {
        method: 'POST',
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

        // Parse authentic filename from server response headers if available
        let resolvedFilename = '';
        const xAttachmentName = res.headers.get('X-Attachment-Name') || '';
        if (xAttachmentName) {
          try { resolvedFilename = decodeURIComponent(xAttachmentName); } catch (_) { resolvedFilename = xAttachmentName; }
        }
        if (!resolvedFilename) {
          const disposition = res.headers.get('Content-Disposition') || '';
          if (disposition) {
            const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
            if (utf8Match && utf8Match[1]) {
              try { resolvedFilename = decodeURIComponent(utf8Match[1]); } catch (_) { resolvedFilename = utf8Match[1]; }
            } else {
              const stdMatch = disposition.match(/filename="?([^";]+)"?/i);
              if (stdMatch && stdMatch[1]) {
                resolvedFilename = stdMatch[1].trim();
              }
            }
          }
        }
        if (!resolvedFilename) resolvedFilename = filename || 'download';
        resolvedFilename = resolvedFilename.split('/').pop().split('\\').pop();

        let blob = await res.blob();
        // Sniff magic bytes if filename lacks a known extension or is token 'FILE'
        const hasValidExt = /\.(pdf|xlsx|xls|csv|png|jpg|jpeg|docx|doc|txt)$/i.test(resolvedFilename);
        if (!hasValidExt || resolvedFilename.toUpperCase() === 'FILE') {
          const buffer = await blob.slice(0, 8).arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let ext = '';
          let mime = '';
          if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
            ext = '.pdf'; mime = 'application/pdf';
          } else if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
            ext = '.png'; mime = 'image/png';
          } else if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
            ext = '.jpg'; mime = 'image/jpeg';
          } else if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
            ext = '.xlsx'; mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          }
          if (ext) {
            const base = (resolvedFilename.toUpperCase() === 'FILE' || !resolvedFilename) ? 'document' : resolvedFilename;
            resolvedFilename = base.endsWith(ext) ? base : (base + ext);
            if (mime) blob = new Blob([blob], { type: mime });
          } else if (!resolvedFilename.includes('.')) {
            // Default fallback based on response Content-Type
            const cType = res.headers ? (res.headers.get('content-type') || '') : '';
            if (cType.includes('pdf')) resolvedFilename += '.pdf';
            else if (cType.includes('excel') || cType.includes('spreadsheet')) resolvedFilename += '.xlsx';
            else if (cType.includes('csv')) resolvedFilename += '.csv';
          }
        }

        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = resolvedFilename;
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
     * Open any authenticated file stream in browser tab or in-app preview modal using typed blob URL
     */
    async viewFile(endpoint, previewTitle) {
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

        let blob = await res.blob();
        let mime = blob.type;
        // Determine real MIME type by inspecting magic bytes
        const buffer = await blob.slice(0, 8).arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let ext = '';
        if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
          mime = 'application/pdf';
          ext = '.pdf';
        } else if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
          mime = 'image/png';
          ext = '.png';
        } else if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
          mime = 'image/jpeg';
          ext = '.jpg';
        } else if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
          mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          ext = '.xlsx';
        }

        let titleWithExt = previewTitle || 'Document';
        if (ext && !titleWithExt.toLowerCase().endsWith(ext)) {
          // If title has a trailing space or token like 'PDF' or 'Excel', strip it cleanly
          titleWithExt = titleWithExt.replace(/\s+(PDF|EXCEL|XLSX|CSV)$/i, '') + ext;
        }

        const typedBlob = mime ? new Blob([blob], { type: mime }) : blob;
        const blobUrl = URL.createObjectURL(typedBlob);

        // If in-app lightbox modal is available, show modal; otherwise open in new tab
        if (typeof window.showUniversalPreviewModal === 'function') {
          window.showUniversalPreviewModal(blobUrl, mime, titleWithExt);
        } else {
          window.open(blobUrl, '_blank');
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
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
      return this.viewFile(endpoint, `${type}_${number}.pdf`);
    },

    /**
     * Download document PDF directly using valid JWT credentials
     */
    async downloadDocumentPdf(type, number) {
      const filename = `${type}-${number}.pdf`;
      const endpoint = `/api/documents/render?type=${encodeURIComponent(type)}&number=${encodeURIComponent(number)}&format=PDF`;
      return this.downloadFile(endpoint, filename);
    },

    /**
     * Download document Excel directly using valid JWT credentials (100% Desktop Parity)
     */
    async downloadDocumentExcel(type, number) {
      const filename = `${type}-${number}.xlsx`;
      const endpoint = `/api/documents/render?type=${encodeURIComponent(type)}&number=${encodeURIComponent(number)}&format=XLSX`;
      return this.downloadFile(endpoint, filename);
    },

    /**
     * Fetch document blob for email/WhatsApp attachments
     */
    async fetchDocumentBlob(type, number, format = 'PDF') {
      const endpoint = `/api/documents/render?type=${encodeURIComponent(type)}&number=${encodeURIComponent(number)}&format=${format}`;
      const token = localStorage.getItem('dse_access_token');
      const url = endpoint.startsWith('http') ? endpoint : (BASE_URL + endpoint);
      const res = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        let errorMsg = `Document render failed (${res.status})`;
        try {
          const err = await res.json();
          if (err && (err.message || err.error)) errorMsg = err.message || err.error;
        } catch (_) {}
        throw new Error(errorMsg);
      }
      return await res.blob();
    }
  };

  /**
   * Universal Lightbox Modal Helper for PDFs, Images, and Documents
   */
  window.showUniversalPreviewModal = function(blobUrl, mime, title) {
    const modal = document.getElementById('modal-universal-preview');
    const titleEl = document.getElementById('universal-preview-title');
    const iconEl = document.getElementById('universal-preview-icon');
    const bodyEl = document.getElementById('universal-preview-body');
    const dlBtn = document.getElementById('universal-preview-download-btn');

    if (!modal || !bodyEl) {
      window.open(blobUrl, '_blank');
      return;
    }

    let defaultExt = '.pdf';
    if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mime === 'application/vnd.ms-excel') {
      defaultExt = '.xlsx';
    } else if (mime === 'text/csv') {
      defaultExt = '.csv';
    } else if (mime === 'image/png') {
      defaultExt = '.png';
    } else if (mime === 'image/jpeg') {
      defaultExt = '.jpg';
    }

    let cleanTitle = (title || 'document').trim();
    if (!cleanTitle.includes('.')) {
      cleanTitle = cleanTitle.replace(/\s+(PDF|EXCEL|XLSX|CSV)$/i, '') + defaultExt;
    }

    if (titleEl) titleEl.innerText = cleanTitle;
    const downloadName = cleanTitle.replace(/[^a-zA-Z0-9._-]/g, '_');

    if (dlBtn) {
      dlBtn.href = blobUrl;
      dlBtn.setAttribute('download', downloadName);
    }

    const isPdf = (mime === 'application/pdf' || cleanTitle.toLowerCase().endsWith('.pdf'));
    const isImage = (mime && mime.startsWith('image/')) || (cleanTitle.toLowerCase().endsWith('.png') || cleanTitle.toLowerCase().endsWith('.jpg') || cleanTitle.toLowerCase().endsWith('.jpeg'));

    if (iconEl) {
      iconEl.innerText = isPdf ? '📄' : (isImage ? '🖼️' : '📊');
    }

    if (isPdf) {
      bodyEl.innerHTML = `<iframe src="${blobUrl}#toolbar=1" style="width:100%; height:100%; border:none;" title="PDF Preview"></iframe>`;
    } else if (isImage) {
      bodyEl.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; padding:20px;"><img src="${blobUrl}" style="max-width:96%; max-height:96%; object-fit:contain; border-radius:6px; box-shadow:0 10px 30px rgba(0,0,0,0.5);" alt="Image Preview" /></div>`;
    } else {
      bodyEl.innerHTML = `
        <div style="text-align:center; padding:40px; color:#94a3b8;">
          <div style="font-size:3rem; margin-bottom:12px;">📊</div>
          <div style="font-size:1rem; font-weight:600; color:#fff; margin-bottom:8px;">${cleanTitle}</div>
          <div style="font-size:0.8rem; margin-bottom:16px;">This file type cannot be previewed inline. Click below to download in standard format.</div>
          <a href="${blobUrl}" download="${downloadName}" class="btn btn-primary" style="text-decoration:none;">Download ${cleanTitle}</a>
        </div>
      `;
    }

    modal.style.display = 'flex';
  };

  window.closeUniversalPreviewModal = function() {
    const modal = document.getElementById('modal-universal-preview');
    if (modal) modal.style.display = 'none';
    const bodyEl = document.getElementById('universal-preview-body');
    if (bodyEl) bodyEl.innerHTML = '';
  };
})();
