/**
 * Jasvi Industries ERP - MasterService
 * Master Data Lookups, Items, and Parties matching desktop ItemService, PartyService, LookupService
 */
window.MasterService = {
  // Items Master
  async getItems() {
    return await window.ApiService.get('/api/master/items');
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
    return await window.ApiService.post('/api/master/items', itemData);
  },
  async updateItem(itemData) {
    return await window.ApiService.put('/api/master/items', itemData);
  },
  async deleteItem(itemCode, rowVersion = -1) {
    return await window.ApiService.delete(`/api/master/items/${encodeURIComponent(itemCode)}?rowVersion=${rowVersion}`);
  },
  async bulkDeleteItems(itemCodes = []) {
    return await window.ApiService.post('/api/master/items/bulk-delete', { itemCodes });
  },
  async validateBulkDelete(itemCodes = []) {
    return await window.ApiService.post('/api/master/items/bulk-delete/validate', { itemCodes });
  },

  // Categories & Lookups (MasterDataController.java Parity)
  async getCategories() {
    return await window.ApiService.get('/api/master/categories');
  },
  async addCategory(name) {
    return await window.ApiService.post(`/api/master/categories?name=${encodeURIComponent(name)}`);
  },
  async createCategory(catData) {
    return await window.ApiService.post('/api/master/categories', catData);
  },
  async renameCategory(oldName, newName, rowVersion = -1) {
    return await window.ApiService.put(`/api/master/categories/rename?rowVersion=${rowVersion}`, { oldName, newName });
  },
  async deleteCategory(name, rowVersion = -1) {
    return await window.ApiService.delete(`/api/master/categories?name=${encodeURIComponent(name)}&rowVersion=${rowVersion}`);
  },
  async setCategoryActive(name, active, rowVersion = -1) {
    return await window.ApiService.put(`/api/master/categories/active?name=${encodeURIComponent(name)}&active=${active}&rowVersion=${rowVersion}`);
  },
  async getLookups(type) {
    return await window.ApiService.get(`/api/master/lookups?type=${encodeURIComponent(type)}`);
  },
  async getLookupsByCategoryCode(categoryCode) {
    return await window.ApiService.get(`/api/master/lookups/by-category-code?code=${encodeURIComponent(categoryCode)}`);
  },
  async getLookupValues(type) {
    return await window.ApiService.get(`/api/master/lookups/values?type=${encodeURIComponent(type)}`);
  },
  async getLookupValuesByCategoryCode(categoryCode) {
    return await window.ApiService.get(`/api/master/lookups/values-by-category-code?code=${encodeURIComponent(categoryCode)}`);
  },
  async saveLookup(lookupDto) {
    return await window.ApiService.post('/api/master/lookups', lookupDto);
  },
  async updateLookup(lookupDto) {
    return await window.ApiService.put('/api/master/lookups', lookupDto);
  },
  async deleteLookup(id, rowVersion = -1) {
    return await window.ApiService.delete(`/api/master/lookups/${id}?rowVersion=${rowVersion}`);
  },
  async setLookupActive(id, active, rowVersion = -1) {
    return await window.ApiService.put(`/api/master/lookups/${id}/active?active=${active}&rowVersion=${rowVersion}`);
  },
  async getNextLookupCode(type) {
    return await window.ApiService.get(`/api/master/lookups/next-code?type=${encodeURIComponent(type)}`);
  },

  // Parties (Customer & Supplier)
  async getParties(type = 'CUSTOMER') {
    return await window.ApiService.get(`/api/master/parties?type=${encodeURIComponent(type)}`);
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
    return await window.ApiService.post('/api/master/parties', partyData);
  },
  async updateParty(partyData) {
    return await window.ApiService.put('/api/master/parties', partyData);
  },
  async deleteParty(id, rowVersion = -1) {
    return await window.ApiService.delete(`/api/master/parties/${id}?rowVersion=${rowVersion}`);
  },

  // Bootstrap
  async getSalesEntryBootstrap() {
    return await window.ApiService.get('/api/master/sales-entry-bootstrap');
  }
};
