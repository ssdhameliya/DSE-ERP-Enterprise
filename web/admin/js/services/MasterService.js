/**
 * Jasvi Industries ERP - MasterService
 * Master Data Lookups, Items, and Parties matching desktop ItemService, PartyService, LookupService
 * Includes high-performance in-memory caching to eliminate redundant AJAX roundtrips.
 */
window.MasterService = (function() {
  'use strict';

  // In-memory lookup and bootstrap cache
  const cache = new Map();
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  function getCached(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(key);
      return null;
    }
    return entry.data;
  }

  function setCached(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
  }

  function invalidateCache(prefix) {
    if (!prefix) {
      cache.clear();
      return;
    }
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) cache.delete(key);
    }
  }

  return {
    clearCache() { invalidateCache(); },
    invalidate(prefix) { invalidateCache(prefix); },

    // Items Master
    async getItems(forceRefresh = false) {
      const cacheKey = 'master_items';
      if (!forceRefresh) {
        const cached = getCached(cacheKey);
        if (cached) return cached;
      }
      const data = await window.ApiService.get('/api/master/items');
      setCached(cacheKey, data);
      return data;
    },

    async searchItems(q = '', limit = 25) {
      return await window.ApiService.get(`/api/master/items/search?q=${encodeURIComponent(q)}&limit=${limit}`);
    },

    async getItemsByCodes(codes = []) {
      return await window.ApiService.post('/api/master/items/by-codes', codes);
    },

    async getNextItemCode() {
      return await window.ApiService.get('/api/master/items/next-code');
    },

    async checkItemExists(code) {
      return await window.ApiService.get(`/api/master/items/exists?code=${encodeURIComponent(code)}`);
    },

    async createItem(itemData) {
      const res = await window.ApiService.post('/api/master/items', itemData);
      invalidateCache('master_items');
      return res;
    },

    async updateItem(itemData) {
      const res = await window.ApiService.put('/api/master/items', itemData);
      invalidateCache('master_items');
      return res;
    },

    async deleteItem(itemCode, rowVersion = -1) {
      const res = await window.ApiService.delete(`/api/master/items/${encodeURIComponent(itemCode)}?rowVersion=${rowVersion}`);
      invalidateCache('master_items');
      return res;
    },

    async bulkDeleteItems(itemCodes = []) {
      const res = await window.ApiService.post('/api/master/items/bulk-delete', { itemCodes });
      invalidateCache('master_items');
      return res;
    },

    async validateBulkDelete(itemCodes = []) {
      return await window.ApiService.post('/api/master/items/bulk-delete/validate', { itemCodes });
    },

    // Categories & Lookups (MasterDataController.java Parity)
    async getCategories(forceRefresh = false) {
      const cacheKey = 'master_categories';
      if (!forceRefresh) {
        const cached = getCached(cacheKey);
        if (cached) return cached;
      }
      const data = await window.ApiService.get('/api/master/categories');
      setCached(cacheKey, data);
      return data;
    },

    async addCategory(name) {
      const res = await window.ApiService.post(`/api/master/categories?name=${encodeURIComponent(name)}`);
      invalidateCache('master_categories');
      return res;
    },

    async createCategory(catData) {
      const res = await window.ApiService.post('/api/master/categories', catData);
      invalidateCache('master_categories');
      return res;
    },

    async renameCategory(oldName, newName, rowVersion = -1) {
      const res = await window.ApiService.put(`/api/master/categories/rename?rowVersion=${rowVersion}`, { oldName, newName });
      invalidateCache('master_categories');
      return res;
    },

    async deleteCategory(name, rowVersion = -1) {
      const res = await window.ApiService.delete(`/api/master/categories?name=${encodeURIComponent(name)}&rowVersion=${rowVersion}`);
      invalidateCache('master_categories');
      return res;
    },

    async setCategoryActive(name, active, rowVersion = -1) {
      const res = await window.ApiService.put(`/api/master/categories/active?name=${encodeURIComponent(name)}&active=${active}&rowVersion=${rowVersion}`);
      invalidateCache('master_categories');
      return res;
    },

    async getLookups(type, forceRefresh = false) {
      const cacheKey = `master_lookups_${type}`;
      if (!forceRefresh) {
        const cached = getCached(cacheKey);
        if (cached) return cached;
      }
      const data = await window.ApiService.get(`/api/master/lookups?type=${encodeURIComponent(type)}`);
      setCached(cacheKey, data);
      return data;
    },

    async getLookupsByCategoryCode(categoryCode) {
      return await window.ApiService.get(`/api/master/lookups/by-category-code?code=${encodeURIComponent(categoryCode)}`);
    },

    async getLookupValues(type, forceRefresh = false) {
      const cacheKey = `master_lookup_values_${type}`;
      if (!forceRefresh) {
        const cached = getCached(cacheKey);
        if (cached) return cached;
      }
      const data = await window.ApiService.get(`/api/master/lookups/values?type=${encodeURIComponent(type)}`);
      const unwrapped = (data && Array.isArray(data.values)) ? data.values : (Array.isArray(data) ? data : []);
      setCached(cacheKey, unwrapped);
      return unwrapped;
    },

    async getLookupValuesByCategoryCode(categoryCode) {
      const res = await window.ApiService.get(`/api/master/lookups/values-by-category-code?code=${encodeURIComponent(categoryCode)}`);
      return (res && Array.isArray(res.values)) ? res.values : (Array.isArray(res) ? res : []);
    },

    async saveLookup(lookupDto) {
      const res = await window.ApiService.post('/api/master/lookups', lookupDto);
      invalidateCache('master_lookup');
      return res;
    },

    async updateLookup(lookupDto) {
      const res = await window.ApiService.put('/api/master/lookups', lookupDto);
      invalidateCache('master_lookup');
      return res;
    },

    async deleteLookup(id, rowVersion = 0) {
      const ver = (rowVersion == null || rowVersion < 0) ? 0 : rowVersion;
      const res = await window.ApiService.delete(`/api/master/lookups/${id}?rowVersion=${ver}`);
      invalidateCache('master_lookup');
      return res;
    },

    async setLookupActive(id, active, rowVersion = 0) {
      const ver = (rowVersion == null || rowVersion < 0) ? 0 : rowVersion;
      const res = await window.ApiService.put(`/api/master/lookups/${id}/active?active=${active}&rowVersion=${ver}`);
      invalidateCache('master_lookup');
      return res;
    },

    async getNextLookupCode(type) {
      return await window.ApiService.get(`/api/master/lookups/next-code?type=${encodeURIComponent(type)}`);
    },

    // Parties (Customer & Supplier)
    async getParties(type = 'CUSTOMER', forceRefresh = false) {
      const cacheKey = `master_parties_${type}`;
      if (!forceRefresh) {
        const cached = getCached(cacheKey);
        if (cached) return cached;
      }
      const data = await window.ApiService.get(`/api/master/parties?type=${encodeURIComponent(type)}`);
      setCached(cacheKey, data);
      return data;
    },

    async searchParties(type = 'CUSTOMER', q = '', limit = 25) {
      return await window.ApiService.get(`/api/master/parties/search?type=${encodeURIComponent(type)}&q=${encodeURIComponent(q)}&limit=${limit}`);
    },

    async getNextPartyCode(type = 'CUSTOMER') {
      return await window.ApiService.get(`/api/master/parties/next-code?type=${encodeURIComponent(type)}`);
    },

    async checkPartyExists(code) {
      return await window.ApiService.get(`/api/master/parties/exists?code=${encodeURIComponent(code)}`);
    },

    async createParty(partyData) {
      const res = await window.ApiService.post('/api/master/parties', partyData);
      invalidateCache('master_parties');
      return res;
    },

    async updateParty(partyData) {
      const res = await window.ApiService.put('/api/master/parties', partyData);
      invalidateCache('master_parties');
      return res;
    },

    async deleteParty(id, rowVersion = -1) {
      const res = await window.ApiService.delete(`/api/master/parties/${id}?rowVersion=${rowVersion}`);
      invalidateCache('master_parties');
      return res;
    },

    // Bootstrap
    async getSalesEntryBootstrap(forceRefresh = false) {
      const cacheKey = 'master_sales_entry_bootstrap';
      if (!forceRefresh) {
        const cached = getCached(cacheKey);
        if (cached) return cached;
      }
      const data = await window.ApiService.get('/api/master/sales-entry-bootstrap');
      setCached(cacheKey, data);
      return data;
    }
  };
})();
