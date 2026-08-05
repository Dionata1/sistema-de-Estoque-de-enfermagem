/**
 * Sistema de Estoque de Enfermagem CEET
 * Serviço de comunicação com a API REST (/api/v1/*)
 */

import {
  Product,
  Category,
  Manufacturer,
  Supplier,
  Unit,
  StockEntry,
  StockOutput,
  StockMovement,
  Inventory,
  AuditLog,
  User,
  Settings,
  DashboardStats,
} from '../types';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  code?: string;
  errors?: { field: string; message: string }[];
}

class ApiService {
  private baseUrl = '/api/v1';

  private getHeaders(): HeadersInit {
    const userId = localStorage.getItem('ceet_active_user_id') || '1';
    return {
      'Content-Type': 'application/json',
      'x-user-id': userId,
    };
  }

  async login(email: string, password: string):Promise<ApiResponse<{ accessToken: string; user: User }>> {
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${this.baseUrl}/dashboard`, { headers: this.getHeaders() });
    const json = await res.json();
    return json.data;
  }

  async getProducts(params?: {
    search?: string;
    category_id?: number;
    manufacturer_id?: number;
    status?: string;
  }): Promise<Product[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category_id) query.append('category_id', String(params.category_id));
    if (params?.manufacturer_id) query.append('manufacturer_id', String(params.manufacturer_id));
    if (params?.status) query.append('status', params.status);

    const res = await fetch(`${this.baseUrl}/products?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    const json = await res.json();
    return json.data || [];
  }

  async getProductById(id: number): Promise<Product | null> {
    const res = await fetch(`${this.baseUrl}/products/${id}`, { headers: this.getHeaders() });
    const json = await res.json();
    return json.data || null;
  }

  async createProduct(product: Partial<Product>): Promise<ApiResponse<Product>> {
    const res = await fetch(`${this.baseUrl}/products`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(product),
    });
    return res.json();
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<ApiResponse<Product>> {
    const res = await fetch(`${this.baseUrl}/products/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(product),
    });
    return res.json();
  }

  async deleteProduct(id: number): Promise<ApiResponse<void>> {
    const res = await fetch(`${this.baseUrl}/products/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  async getCategories(): Promise<Category[]> {
    const res = await fetch(`${this.baseUrl}/categories`, { headers: this.getHeaders() });
    const json = await res.json();
    return json.data || [];
  }

  async createCategory(cat: { name: string; description?: string; color?: string; icon?: string }): Promise<ApiResponse<Category>> {
    const res = await fetch(`${this.baseUrl}/categories`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(cat),
    });
    return res.json();
  }

  async getManufacturers(): Promise<Manufacturer[]> {
    const res = await fetch(`${this.baseUrl}/manufacturers`, { headers: this.getHeaders() });
    const json = await res.json();
    return json.data || [];
  }

  async createManufacturer(m: Partial<Manufacturer>): Promise<ApiResponse<Manufacturer>> {
    const res = await fetch(`${this.baseUrl}/manufacturers`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(m),
    });
    return res.json();
  }

  async getSuppliers(): Promise<Supplier[]> {
    const res = await fetch(`${this.baseUrl}/suppliers`, { headers: this.getHeaders() });
    const json = await res.json();
    return json.data || [];
  }

  async createSupplier(s: Partial<Supplier>): Promise<ApiResponse<Supplier>> {
    const res = await fetch(`${this.baseUrl}/suppliers`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(s),
    });
    return res.json();
  }

  async getUnits(): Promise<Unit[]> {
    const res = await fetch(`${this.baseUrl}/units`, { headers: this.getHeaders() });
    const json = await res.json();
    return json.data || [];
  }

  async createStockEntry(entryData: Partial<StockEntry>): Promise<ApiResponse<StockEntry>> {
    const res = await fetch(`${this.baseUrl}/stock/entries`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(entryData),
    });
    return res.json();
  }

  async getStockEntries(): Promise<StockEntry[]> {
    const res = await fetch(`${this.baseUrl}/stock/entries`, { headers: this.getHeaders() });
    const json = await res.json();
    return json.data || [];
  }

  async createStockOutput(outputData: Partial<StockOutput>): Promise<ApiResponse<StockOutput>> {
    const res = await fetch(`${this.baseUrl}/stock/outputs`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(outputData),
    });
    return res.json();
  }

  async getStockOutputs(): Promise<StockOutput[]> {
    const res = await fetch(`${this.baseUrl}/stock/outputs`, { headers: this.getHeaders() });
    const json = await res.json();
    return json.data || [];
  }

  async getStockMovements(params?: {
    product_id?: number;
    movement_type?: string;
    search?: string;
  }): Promise<StockMovement[]> {
    const query = new URLSearchParams();
    if (params?.product_id) query.append('product_id', String(params.product_id));
    if (params?.movement_type) query.append('movement_type', params.movement_type);
    if (params?.search) query.append('search', params.search);

    const res = await fetch(`${this.baseUrl}/stock/movements?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    const json = await res.json();
    return json.data || [];
  }

  async getInventories(): Promise<Inventory[]> {
    const res = await fetch(`${this.baseUrl}/inventories`, { headers: this.getHeaders() });
    const json = await res.json();
    return json.data || [];
  }

  async createInventory(data: {
    observations?: string;
    items: {
      product_id: number;
      product_name: string;
      product_code: string;
      expected_quantity: number;
      counted_quantity: number;
      difference: number;
      adjustment_generated: boolean;
    }[];
  }): Promise<ApiResponse<Inventory>> {
    const res = await fetch(`${this.baseUrl}/inventories`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  }

  async getPurchaseSuggestions(): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/purchases/suggestions`, { headers: this.getHeaders() });
    const json = await res.json();
    return json.data || [];
  }

  async getAuditLogs(params?: { action?: string; search?: string; user_id?: number }): Promise<AuditLog[]> {
    const query = new URLSearchParams();
    if (params?.action) query.append('action', params.action);
    if (params?.search) query.append('search', params.search);
    if (params?.user_id) query.append('user_id', String(params.user_id));

    const res = await fetch(`${this.baseUrl}/audit?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    const json = await res.json();
    return json.data || [];
  }

  async getUsers(): Promise<User[]> {
    const res = await fetch(`${this.baseUrl}/users`, { headers: this.getHeaders() });
    const json = await res.json();
    return json.data || [];
  }

  async createUser(userData: Partial<User>): Promise<ApiResponse<User>> {
    const res = await fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });
    return res.json();
  }

  async updateUser(id: number, userData: Partial<User>): Promise<ApiResponse<User>> {
    const res = await fetch(`${this.baseUrl}/users/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });
    return res.json();
  }

  async updateUserStatus(id: number, status: string, active?: boolean): Promise<ApiResponse<void>> {
    const res = await fetch(`${this.baseUrl}/users/${id}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status, active }),
    });
    return res.json();
  }

  async resetUserPassword(id: number, newPassword?: string): Promise<ApiResponse<void>> {
    const res = await fetch(`${this.baseUrl}/users/${id}/reset-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ newPassword }),
    });
    return res.json();
  }

  async deleteUser(id: number): Promise<ApiResponse<void>> {
    const res = await fetch(`${this.baseUrl}/users/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  async getSettings(): Promise<Settings> {
    const res = await fetch(`${this.baseUrl}/settings`, { headers: this.getHeaders() });
    const json = await res.json();
    return json.data;
  }

  async updateSettings(settings: Partial<Settings>): Promise<ApiResponse<Settings>> {
    const res = await fetch(`${this.baseUrl}/settings`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(settings),
    });
    return res.json();
  }

  async exportDatabaseBackup(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/backup/export`, { headers: this.getHeaders() });
    return res.json();
  }

  async restoreDatabaseBackup(database: any): Promise<ApiResponse<void>> {
    const res = await fetch(`${this.baseUrl}/backup/restore`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ database }),
    });
    return res.json();
  }

  async clearInventory(): Promise<ApiResponse<{ productsCount: number; batchesCount: number; movementsCount: number }>> {
    const res = await fetch(`${this.baseUrl}/admin/clear-inventory`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return res.json();
  }


  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    const res = await fetch(`${this.baseUrl}/auth/change-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId, currentPassword, newPassword }),
    });
    return res.json();
  }
}

export const api = new ApiService();
