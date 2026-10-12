/**
 * Jasvi Industries ERP - MasterService
 * Master Data Lookups, Items, and Parties matching desktop ItemService, PartyService, LookupService
 */
window.MasterService = {
  async getItems() {
    return await window.ApiService.get('/api/master/items');
  },
  async createItem(itemData) {
    return await window.ApiService.post('/api/master/items', itemData);
  },
  async updateItem(itemData) {
    return await window.ApiService.put('/api/master/items', itemData);
  },
  async deleteItem(itemCode) {
    return await window.ApiService.delete(`/api/master/items/${encodeURIComponent(itemCode)}`);
  },
  async getCategories() {
    return await window.ApiService.get('/api/master/categories');
  },
  async createCategory(catData) {
    return await window.ApiService.post('/api/master/categories', catData);
  },
  async getParties(type = 'CUSTOMER') {
    return await window.ApiService.get(`/api/master/parties?type=${type}`);
  },
  async createParty(partyData) {
    return await window.ApiService.post('/api/master/parties', partyData);
  },
  async updateParty(partyData) {
    return await window.ApiService.put('/api/master/parties', partyData);
  },
  async deleteParty(id) {
    return await window.ApiService.delete(`/api/master/parties/${id}`);
  },
  async getSalesEntryBootstrap() {
    return await window.ApiService.get('/api/master/sales-entry-bootstrap');
  },
  async getLookups(categoryCode) {
    return await window.ApiService.get(`/api/master/lookups/by-category-code?code=${encodeURIComponent(categoryCode)}`);
  },
  async getLookupValues(categoryCode) {
    return await window.ApiService.get(`/api/master/lookups/values-by-category-code?code=${encodeURIComponent(categoryCode)}`);
  }
};
