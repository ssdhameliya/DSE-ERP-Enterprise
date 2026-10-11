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
  }
};
