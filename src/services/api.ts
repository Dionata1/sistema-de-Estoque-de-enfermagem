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
  Patrimony,
  Maintenance,
  Lesson,
  Loan,
  Occurrence,
  SupportTicket,
  SupportMessage,
  RemoteAccessRequest,
  InstitutionalLocation as Location,
  ClassGroup,
  Student,
  Attachment,
} from '../types';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  code?: string;
  errors?: { field: string; message: string }[];
}

class ApiService {
  private get baseUrl(): string {
    const savedIp = localStorage.getItem('ceet_server_ip');
    const savedPort = localStorage.getItem('ceet_server_port');
    
    if (savedIp && savedPort) {
      const cleanIp = savedIp.trim();
      const cleanPort = savedPort.trim();
      if (cleanIp) {
        return `http://${cleanIp}:${cleanPort}/api/v1`;
      }
    }
    
    // Se estiver acessando via IP mas não configurou manualmente, usar o IP atual
    const hostname = window.location.hostname;
    const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname);
    if (isIp && window.location.port === '3000') {
      return `http://${hostname}:3000/api/v1`;
    }
    
    return '/api/v1';
  }

  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('ceet_auth_token');
    const headers: any = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private resolveUrls(data: any): any {
    if (!data || typeof data !== 'object') return data;
    
    const savedIp = localStorage.getItem('ceet_server_ip');
    const savedPort = localStorage.getItem('ceet_server_port');
    if (!savedIp || !savedPort) return data;
    
    const serverUrl = `http://${savedIp.trim()}:${savedPort.trim()}`;

    const traverse = (obj: any): any => {
      if (typeof obj === 'string') {
        // Corrigir tanto caminhos relativos quanto caminhos absolutos que apontam para localhost
        if (obj.startsWith('/uploads/')) {
          return `${serverUrl}${obj}`;
        }
        if (obj.startsWith('http://localhost:3000/uploads/')) {
          return obj.replace('http://localhost:3000', serverUrl);
        }
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map(traverse);
      }
      if (obj !== null && typeof obj === 'object') {
        if (obj instanceof Date || (typeof Blob !== 'undefined' && obj instanceof Blob)) return obj;
        
        const newObj: any = {};
        for (const key in obj) {
          newObj[key] = traverse(obj[key]);
        }
        return newObj;
      }
      return obj;
    };

    return traverse(data);
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...(options.headers || {}),
        },
      });

      // Se for 401 ou 403 em certas condições, pode-se forçar logout
      if (response.status === 401 && !url.includes('/auth/login')) {
        this.logout();
        return {
          success: false,
          message: 'Sessão expirada. Por favor, faça login novamente.',
          code: 'UNAUTHORIZED',
        };
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const json = await response.json();
        return this.resolveUrls(json);
      }

      // Se não for JSON (como um erro HTML), retornar erro formatado
      return {
        success: false,
        message: `Servidor retornou resposta inesperada (${response.status} ${response.statusText}).`,
        code: 'UNEXPECTED_RESPONSE',
      };
    } catch (error) {
      console.error(`Erro na requisição ${url}:`, error);
      return {
        success: false,
        message: 'Falha na comunicação com o servidor. Verifique sua conexão.',
        code: 'FETCH_ERROR',
      };
    }
  }

  logout() {
    localStorage.removeItem('ceet_auth_token');
    localStorage.removeItem('ceet_active_user_id');
    // Em um app React real, usaríamos um hook de navigation, 
    // mas como o Layout e App reagem ao localStorage ou estado, isso pode bastar.
    // Para garantir, redirecionamos se não estiver na página de login.
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }

  async login(email: string, password: string): Promise<ApiResponse<{ accessToken: string; user: User }>> {
    const res = await this.request<{ accessToken: string; user: User; expiresIn: number }>(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (res.success && res.data?.accessToken) {
      localStorage.setItem('ceet_auth_token', res.data.accessToken);
      localStorage.setItem('ceet_active_user_id', String(res.data.user.id));
    }

    return res;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const res = await this.request<DashboardStats>(`${this.baseUrl}/dashboard`);
    return res.data || {
      total_products: 0,
      total_stock_items: 0,
      critical_products_count: 0,
      expired_batches_count: 0,
      expiring_soon_count: 0,
      monthly_entries_count: 0,
      monthly_outputs_count: 0,
      top_consumed_products: [],
      category_distribution: [],
      monthly_flow_chart: [],
      total_patrimony_items: 0,
      active_loans_count: 0,
      pending_maintenances_count: 0,
    };
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

    const res = await this.request<Product[]>(`${this.baseUrl}/products?${query.toString()}`);
    return res.data || [];
  }

  async getProductById(id: number): Promise<Product | null> {
    const res = await this.request<Product>(`${this.baseUrl}/products/${id}`);
    return res.data || null;
  }

  async createProduct(product: Partial<Product>): Promise<ApiResponse<Product>> {
    return this.request(`${this.baseUrl}/products`, {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<ApiResponse<Product>> {
    return this.request(`${this.baseUrl}/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  }

  async deleteProduct(id: number): Promise<ApiResponse<void>> {
    return this.request(`${this.baseUrl}/products/${id}`, {
      method: 'DELETE',
    });
  }

  async getCategories(): Promise<Category[]> {
    const res = await this.request<Category[]>(`${this.baseUrl}/categories`);
    return res.data || [];
  }

  async createCategory(cat: { name: string; description?: string; color?: string; icon?: string }): Promise<ApiResponse<Category>> {
    return this.request(`${this.baseUrl}/categories`, {
      method: 'POST',
      body: JSON.stringify(cat),
    });
  }

  async getManufacturers(): Promise<Manufacturer[]> {
    const res = await this.request<Manufacturer[]>(`${this.baseUrl}/manufacturers`);
    return res.data || [];
  }

  async createManufacturer(m: Partial<Manufacturer>): Promise<ApiResponse<Manufacturer>> {
    return this.request(`${this.baseUrl}/manufacturers`, {
      method: 'POST',
      body: JSON.stringify(m),
    });
  }

  async updateManufacturer(id: number, m: Partial<Manufacturer>): Promise<ApiResponse<Manufacturer>> {
    return this.request(`${this.baseUrl}/manufacturers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(m),
    });
  }

  async deleteManufacturer(id: number): Promise<ApiResponse<void>> {
    return this.request(`${this.baseUrl}/manufacturers/${id}`, {
      method: 'DELETE',
    });
  }

  async getSuppliers(): Promise<Supplier[]> {
    const res = await this.request<Supplier[]>(`${this.baseUrl}/suppliers`);
    return res.data || [];
  }

  async createSupplier(s: Partial<Supplier>): Promise<ApiResponse<Supplier>> {
    return this.request(`${this.baseUrl}/suppliers`, {
      method: 'POST',
      body: JSON.stringify(s),
    });
  }

  async getUnits(): Promise<Unit[]> {
    const res = await this.request<Unit[]>(`${this.baseUrl}/units`);
    return res.data || [];
  }

  async createUnit(unit: Partial<Unit>): Promise<ApiResponse<Unit>> {
    return this.request(`${this.baseUrl}/units`, {
      method: 'POST',
      body: JSON.stringify(unit),
    });
  }

  async createStockEntry(entryData: Partial<StockEntry>): Promise<ApiResponse<StockEntry>> {
    return this.request(`${this.baseUrl}/stock/entries`, {
      method: 'POST',
      body: JSON.stringify(entryData),
    });
  }

  async getStockEntries(): Promise<StockEntry[]> {
    const res = await this.request<StockEntry[]>(`${this.baseUrl}/stock/entries`);
    return res.data || [];
  }

  async createStockOutput(outputData: Partial<StockOutput>): Promise<ApiResponse<StockOutput>> {
    return this.request(`${this.baseUrl}/stock/outputs`, {
      method: 'POST',
      body: JSON.stringify(outputData),
    });
  }

  async getStockOutputs(): Promise<StockOutput[]> {
    const res = await this.request<StockOutput[]>(`${this.baseUrl}/stock/outputs`);
    return res.data || [];
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

    const res = await this.request<StockMovement[]>(`${this.baseUrl}/stock/movements?${query.toString()}`);
    return res.data || [];
  }

  async getInventories(): Promise<Inventory[]> {
    const res = await this.request<Inventory[]>(`${this.baseUrl}/inventories`);
    return res.data || [];
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
    return this.request(`${this.baseUrl}/inventories`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPurchaseSuggestions(): Promise<any[]> {
    const res = await this.request<any[]>(`${this.baseUrl}/purchases/suggestions`);
    return res.data || [];
  }

  async getAuditLogs(params?: { action?: string; search?: string; user_id?: number }): Promise<AuditLog[]> {
    const query = new URLSearchParams();
    if (params?.action) query.append('action', params.action);
    if (params?.search) query.append('search', params.search);
    if (params?.user_id) query.append('user_id', String(params.user_id));

    const res = await this.request<AuditLog[]>(`${this.baseUrl}/audit?${query.toString()}`);
    return res.data || [];
  }

  async analyzeWithAI(category: string, context: string, data: any, prompt?: string): Promise<ApiResponse<{ analysis: string }>> {
    return this.request(`${this.baseUrl}/ai/analyze`, {
      method: 'POST',
      body: JSON.stringify({ category, context, data, prompt }),
    });
  }

  async getUsers(): Promise<User[]> {
    const res = await this.request<User[]>(`${this.baseUrl}/users`);
    return res.data || [];
  }

  async createUser(userData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request(`${this.baseUrl}/users`, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: number, userData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request(`${this.baseUrl}/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async updateUserStatus(id: number, status: string, active?: boolean): Promise<ApiResponse<void>> {
    return this.request(`${this.baseUrl}/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, active }),
    });
  }

  async resetUserPassword(id: number, newPassword?: string): Promise<ApiResponse<void>> {
    return this.request(`${this.baseUrl}/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  }

  async deleteUser(id: number): Promise<ApiResponse<void>> {
    return this.request(`${this.baseUrl}/users/${id}`, {
      method: 'DELETE',
    });
  }

  async getSettings(): Promise<Settings> {
    const res = await this.request<Settings>(`${this.baseUrl}/settings`);
    return res.data || { 
      institution_name: 'CEET Giuseppe Altoé', 
      logo: '', 
      theme: 'light', 
      expiration_alert_days: 30, 
      backup_retention_days: 30, 
      fifo_mode: true 
    };
  }

  async updateSettings(settings: Partial<Settings>): Promise<ApiResponse<Settings>> {
    return this.request(`${this.baseUrl}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async exportDatabaseBackup(): Promise<any> {
    const res = await this.request<any>(`${this.baseUrl}/backup/export`);
    return res.data;
  }

  async restoreDatabaseBackup(database: any): Promise<ApiResponse<void>> {
    return this.request(`${this.baseUrl}/backup/restore`, {
      method: 'POST',
      body: JSON.stringify({ database }),
    });
  }
  
  async resetStock(): Promise<ApiResponse<void>> {
    return this.request(`${this.baseUrl}/stock/reset`, {
      method: 'POST',
    });
  }

  async testConnection(ip: string, port: string): Promise<ApiResponse<void>> {
    const url = `http://${ip.trim()}:${port.trim()}/api/v1/health`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        return { success: true, message: 'Servidor conectado com sucesso.' };
      }
      return { success: false, message: 'Servidor retornou erro ou não é um servidor CEET.' };
    } catch (err) {
      return { success: false, message: 'Não foi possível conectar ao servidor. Verifique o IP, a porta e a conexão de rede.' };
    }
  }

  // --- Módulo: Patrimônio ---
  async getPatrimonies(params?: { search?: string; category_id?: number; location_id?: number; status?: string }): Promise<Patrimony[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category_id) query.append('category_id', String(params.category_id));
    if (params?.location_id) query.append('location_id', String(params.location_id));
    if (params?.status) query.append('status', params.status);

    const res = await this.request<Patrimony[]>(`${this.baseUrl}/patrimonies?${query.toString()}`);
    return res.data || [];
  }

  async createPatrimony(data: Partial<Patrimony>): Promise<ApiResponse<Patrimony>> {
    return this.request(`${this.baseUrl}/patrimonies`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePatrimony(id: number, data: Partial<Patrimony>): Promise<ApiResponse<Patrimony>> {
    return this.request(`${this.baseUrl}/patrimonies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // --- Módulo: Manutenção ---
  async getMaintenances(): Promise<Maintenance[]> {
    const res = await this.request<Maintenance[]>(`${this.baseUrl}/maintenances`);
    return res.data || [];
  }

  async createMaintenance(data: Partial<Maintenance>): Promise<ApiResponse<Maintenance>> {
    return this.request(`${this.baseUrl}/maintenances`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMaintenance(id: number, data: Partial<Maintenance>): Promise<ApiResponse<Maintenance>> {
    return this.request(`${this.baseUrl}/maintenances/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // --- Módulo: Aulas Práticas ---
  async getLessons(): Promise<Lesson[]> {
    const res = await this.request<Lesson[]>(`${this.baseUrl}/lessons`);
    return res.data || [];
  }

  async createLesson(data: Partial<Lesson>): Promise<ApiResponse<Lesson>> {
    return this.request(`${this.baseUrl}/lessons`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLesson(id: number, data: Partial<Lesson>): Promise<ApiResponse<Lesson>> {
    return this.request(`${this.baseUrl}/lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // --- Módulo: Empréstimos ---
  async getLoans(): Promise<Loan[]> {
    const res = await this.request<Loan[]>(`${this.baseUrl}/loans`);
    return res.data || [];
  }

  async createLoan(data: Partial<Loan>): Promise<ApiResponse<Loan>> {
    return this.request(`${this.baseUrl}/loans`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLoan(id: number, data: Partial<Loan>): Promise<ApiResponse<Loan>> {
    return this.request(`${this.baseUrl}/loans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // --- Módulo: Ocorrências ---
  async getOccurrences(): Promise<Occurrence[]> {
    const res = await this.request<Occurrence[]>(`${this.baseUrl}/occurrences`);
    return res.data || [];
  }

  async createOccurrence(data: Partial<Occurrence>): Promise<ApiResponse<Occurrence>> {
    return this.request(`${this.baseUrl}/occurrences`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOccurrence(id: number, data: Partial<Occurrence>): Promise<ApiResponse<Occurrence>> {
    return this.request(`${this.baseUrl}/occurrences/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // --- Módulo: Suporte Técnico ---
  async getSupportTickets(): Promise<SupportTicket[]> {
    const res = await this.request<SupportTicket[]>(`${this.baseUrl}/support`);
    return res.data || [];
  }

  async createSupportTicket(data: Partial<SupportTicket>): Promise<ApiResponse<SupportTicket>> {
    return this.request(`${this.baseUrl}/support`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSupportTicket(id: number): Promise<SupportTicket | null> {
    const res = await this.request<SupportTicket>(`${this.baseUrl}/support/${id}`);
    return res.data || null;
  }

  async updateSupportTicket(id: number, data: Partial<SupportTicket>): Promise<ApiResponse<SupportTicket>> {
    return this.request(`${this.baseUrl}/support/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getSupportMessages(ticketId: number): Promise<SupportMessage[]> {
    const res = await this.request<SupportMessage[]>(`${this.baseUrl}/support/${ticketId}/messages`);
    return res.data || [];
  }

  async sendSupportMessage(ticketId: number, text: string, attachments?: Attachment[]): Promise<ApiResponse<SupportMessage>> {
    return this.request(`${this.baseUrl}/support/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, attachments }),
    });
  }

  async requestRemoteAccess(ticketId: number, reason: string): Promise<ApiResponse<RemoteAccessRequest>> {
    return this.request(`${this.baseUrl}/support/${ticketId}/remote-access`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async updateRemoteAccessStatus(ticketId: number, requestId: number, status: string): Promise<ApiResponse<RemoteAccessRequest>> {
    return this.request(`${this.baseUrl}/support/${ticketId}/remote-access/${requestId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // --- Módulo: Localizações ---
  async getLocations(): Promise<Location[]> {
    const res = await this.request<Location[]>(`${this.baseUrl}/locations`);
    return res.data || [];
  }

  async createLocation(location: Partial<Location>): Promise<ApiResponse<Location>> {
    return this.request(`${this.baseUrl}/locations`, {
      method: 'POST',
      body: JSON.stringify(location),
    });
  }

  async upload(file: File, userId: number): Promise<ApiResponse<Attachment>> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const res = await this.request<Attachment>(`${this.baseUrl}/upload`, {
            method: 'POST',
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type,
              base64: reader.result,
              userId: userId
            }),
          });
          resolve(res);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (error) => reject(error);
    });
  }

  async getClassGroups(): Promise<ClassGroup[]> {
    const res = await this.request<ClassGroup[]>(`${this.baseUrl}/class-groups`);
    return res.data || [];
  }

  async getStudents(): Promise<Student[]> {
    const res = await this.request<Student[]>(`${this.baseUrl}/students`);
    return res.data || [];
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return this.request(`${this.baseUrl}/auth/change-password`, {
      method: 'POST',
      body: JSON.stringify({ userId, currentPassword, newPassword }),
    });
  }
}

export const api = new ApiService();
