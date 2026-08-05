/**
 * Sistema de Estoque de Enfermagem CEET
 * Tipos e interfaces principais do domínio (Conforme Cap. 8 - Modelo de Dados e Cap. 9 - APIs)
 */

export type Role = 'ADMIN' | 'ESTOQUE' | 'PROFESSOR' | 'COORDENACAO' | 'FUNCIONARIO' | 'ESTAGIARIO' | 'TECNICO';

export type UserType = 'Professor' | 'Servidor' | 'Funcionário' | 'Estagiário' | 'Técnico' | 'Administrador' | 'Outro';

export type UserStatus = 'Ativo' | 'Inativo' | 'Bloqueado' | 'Pendente' | 'Afastado' | 'Desligado';

export interface User {
  id: number;
  name: string; // Nome completo
  email: string; // E-mail institucional
  role: Role; // Nível de Acesso (RBAC)
  cpf?: string; // CPF
  registration_number?: string; // Matrícula
  phone?: string; // Telefone
  department?: string; // Departamento
  function_title?: string; // Função
  user_type?: UserType; // Tipo de Usuário (Professor, Servidor, Funcionário, Estagiário, Técnico, Administrador, Outro)
  status: UserStatus; // Status (Ativo, Inativo, Bloqueado, Pendente, Afastado, Desligado)
  active: boolean; // para compatibilidade boolean
  created_at: string;
  last_login?: string;
  password?: string;
  temporary_password?: string;
  must_change_password?: boolean; // Obrigatório primeiro acesso
  notes?: string; // Observações
  photo_url?: string;
  failed_attempts?: number;
  locked_until?: string;
  last_password_change?: string;
  permissions?: string[]; // Permissões customizadas
}

export interface Category {
  id: number;
  name: string;
  description: string;
  color: string;
  icon: string;
  active: boolean;
  created_at: string;
  products_count?: number;
}

export interface Manufacturer {
  id: number;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  country?: string;
  active: boolean;
}

export interface Supplier {
  id: number;
  corporate_name: string;
  trade_name: string;
  cnpj: string;
  phone?: string;
  email?: string;
  address?: string;
  active: boolean;
}

export interface Unit {
  id: number;
  name: string;
  abbreviation: string;
}

export interface Batch {
  id: number;
  batch_number: string;
  manufacturing_date: string;
  expiration_date: string;
  quantity: number;
  product_id: number;
  created_at: string;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  category_id: number;
  manufacturer_id: number;
  supplier_id?: number;
  unit_id: number;
  minimum_stock: number;
  current_stock: number;
  location: string;
  barcode?: string;
  qr_code?: string;
  image?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  // Campos desnormalizados para exibição na UI
  category_name?: string;
  category_color?: string;
  manufacturer_name?: string;
  unit_abbreviation?: string;
  batches?: Batch[];
  status_label?: 'CRITICO' | 'REGULAR' | 'ESGOTADO';
}

export interface StockEntryItem {
  product_id: number;
  product_name?: string;
  product_code?: string;
  batch_number: string;
  manufacturing_date: string;
  expiration_date: string;
  quantity: number;
  unit_price?: number;
}

export interface StockEntry {
  id: number;
  supplier_id: number;
  supplier_name?: string;
  invoice_number: string;
  user_id: number;
  user_name?: string;
  received_at: string;
  observations?: string;
  items: StockEntryItem[];
}

export interface StockOutputItem {
  product_id: number;
  product_name?: string;
  product_code?: string;
  batch_number?: string;
  quantity: number;
}

export interface StockOutput {
  id: number;
  destination_sector: string;
  reason: string;
  user_id: number;
  user_name?: string;
  output_date: string;
  items: StockOutputItem[];
}

export interface StockMovement {
  id: number;
  movement_type: 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'INVENTARIO';
  product_id: number;
  product_name: string;
  product_code: string;
  quantity: number;
  balance_before: number;
  balance_after: number;
  user_id: number;
  user_name: string;
  reason?: string;
  batch_number?: string;
  created_at: string;
}

export interface InventoryItem {
  product_id: number;
  product_name: string;
  product_code: string;
  expected_quantity: number;
  counted_quantity: number;
  difference: number;
  adjustment_generated: boolean;
}

export interface Inventory {
  id: number;
  inventory_date: string;
  responsible_user: string;
  user_id: number;
  observations?: string;
  items: InventoryItem[];
}

export interface AuditLog {
  id: number;
  user_id: number;
  user_name: string;
  user_role: Role;
  ip: string;
  action: string;
  entity: string;
  entity_id?: string | number;
  details: string;
  result: 'SUCESSO' | 'FALHA';
  created_at: string;
}

export interface Settings {
  institution_name: string;
  logo: string;
  theme: 'light' | 'dark' | 'system';
  expiration_alert_days: number;
  backup_retention_days: number;
  fifo_mode: boolean; // FIFO (First In First Out) vs FEFO (First Expire First Out)
}

export interface DashboardStats {
  total_products: number;
  total_stock_items: number;
  critical_products_count: number;
  expired_batches_count: number;
  expiring_soon_count: number;
  monthly_entries_count: number;
  monthly_outputs_count: number;
  top_consumed_products: { name: string; code: string; quantity: number }[];
  category_distribution: { name: string; color: string; count: number; value: number }[];
  monthly_flow_chart: { month: string; entradas: number; saidas: number }[];
}

export interface PurchaseSuggestion {
  product_id: number;
  code: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
  suggested_purchase_qty: number;
  estimated_unit_cost: number;
  total_estimated_cost: number;
  priority: 'ALTA' | 'MEDIA' | 'BAIXA';
}
