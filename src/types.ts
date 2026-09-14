/**
 * Sistema de Estoque de Enfermagem CEET
 * Tipos e interfaces principais do domínio (Conforme Cap. 8 - Modelo de Dados e Cap. 9 - APIs)
 */

export type Role = 'ADMIN' | 'ESTOQUE' | 'PROFESSOR' | 'COORDENACAO' | 'FUNCIONARIO' | 'ESTAGIARIO' | 'TECNICO';

export type UserType = 'Professor' | 'Servidor' | 'Funcionário' | 'Estagiário' | 'Técnico' | 'Administrador' | 'Outro';

export type UserStatus = 'Ativo' | 'Inativo' | 'Bloqueado' | 'Pendente' | 'Afastado' | 'Desligado';

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string; // mime type
  size: number;
  user_id: number;
  user_name: string;
  created_at: string;
}

export interface User {
  id: number;
  name: string; // Nome completo
  email: string; // E-mail institucional
  firebase_uid?: string; // UID da conta no Firebase Authentication
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
  location?: string;
  location_id?: number;
  barcode?: string;
  qr_code?: string;
  image?: string;
  attachments?: Attachment[];
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
  total_patrimony_items?: number;
  active_loans_count?: number;
  pending_maintenances_count?: number;
  open_support_tickets?: number;
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

// --- Novas Entidades (Patrimônio, Aulas, Empréstimos, Manutenção, etc.) ---
export type SupportCategory = 'Sistema' | 'Computador' | 'Rede' | 'Impressora' | 'Login' | 'Estoque' | 'Cadastro' | 'Relatórios' | 'Erro técnico' | 'Hardware' | 'Outro';
export type SupportPriority = 'Baixa' | 'Média' | 'Alta' | 'Crítica';
export type SupportStatus = 'Aberto' | 'Em atendimento' | 'Atendido' | 'Cancelado';

export interface SupportTicket {
  id: number;
  ticket_number: string;
  user_id: number;
  user_name: string;
  category: SupportCategory;
  priority: SupportPriority;
  title: string;
  description: string;
  status: SupportStatus;
  attachments?: Attachment[];
  technician_id?: number;
  technician_name?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
}

export interface SupportMessage {
  id: number;
  ticket_id: number;
  author_id: number;
  author_name: string;
  author_role: Role;
  text: string;
  attachments?: Attachment[];
  created_at: string;
  read: boolean;
}

export interface RemoteAccessRequest {
  id: number;
  ticket_id: number;
  requester_id: number;
  technician_id: number;
  reason: string;
  status: 'PENDENTE' | 'AUTORIZADO' | 'RECUSADO' | 'CONCLUIDO';
  created_at: string;
  authorized_at?: string;
}

export type PatrimonyCondition = 'Novo' | 'Excelente' | 'Bom' | 'Regular' | 'Danificado' | 'Inservível';
export type PatrimonyStatus = 'Disponível' | 'Em manutenção' | 'Emprestado' | 'Reservado' | 'Indisponível' | 'Baixado' | 'Perdido' | 'Em deslocamento' | 'Fora da instituição';

export interface Patrimony {
  id: number;
  patrimony_code: string; // Ex: PAT-00027
  name: string;
  description?: string;
  category_id?: number;
  manufacturer_id?: number;
  supplier_id?: number;
  serial_number?: string;
  acquisition_date?: string;
  acquisition_value?: number;
  condition: PatrimonyCondition;
  status: PatrimonyStatus;
  location_id?: number; // Referência a um Location
  responsible_id?: number; // Referência a User
  image_url?: string; // Foto principal
  images?: string[]; // Galeria (URLs)
  qr_code?: string;
  attachments?: Attachment[];
  created_at: string;
  updated_at: string;
}

export type MaintenanceType = 'Preventiva' | 'Corretiva' | 'Calibração' | 'Inspeção' | 'Higienização' | 'Substituição de peça' | 'Avaliação técnica' | 'Outro';
export type MaintenancePriority = 'Baixa' | 'Média' | 'Alta' | 'Crítica';
export type MaintenanceStatus = 'Aberto' | 'Em atendimento' | 'Atendido' | 'Aguardando peça' | 'Cancelado' | 'Sem reparo';

export interface Maintenance {
  id: number;
  patrimony_id: number;
  type: MaintenanceType;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  reason: string;
  description?: string;
  send_date: string;
  expected_return_date?: string;
  actual_return_date?: string;
  cost?: number;
  provider?: string; // Nome da assistência técnica ou fornecedor
  responsible_id: number; // Usuário que solicitou/registrou
  observations?: string;
  before_images?: string[];
  during_images?: string[];
  after_images?: string[];
  attachments?: Attachment[];
  created_at: string;
}

export interface InstitutionalLocation {
  id: number;
  name: string; // Ex: Laboratório 1, Almoxarifado
  building?: string; // Bloco A, etc
  room?: string; // Sala 03
  responsible_id?: number;
  active: boolean;
}

export interface Student {
  id: number;
  name: string;
  registration_number: string; // Matrícula
  class_id?: number; // Turma atual
  course?: string;
  status: 'Ativo' | 'Inativo';
  created_at: string;
}

export interface ClassGroup {
  id: number;
  name: string; // Ex: 2º Enfermagem A
  course: string;
  year: number;
  shift: 'Matutino' | 'Vespertino' | 'Noturno' | 'Integral';
  status: 'Ativo' | 'Inativo';
  created_at: string;
}

export type LessonStatus = 'PLANEJADA' | 'AGENDADA' | 'EM_PREPARACAO' | 'MATERIAIS_SEPARADOS' | 'EM_ANDAMENTO' | 'REALIZADA' | 'FINALIZADA' | 'CANCELADA';

export interface LessonItem {
  id: number;
  product_id?: number;
  patrimony_id?: number;
  is_patrimony: boolean;
  planned_quantity: number;
  separated_quantity?: number;
  consumed_quantity?: number; // Apenas para insumos
  returned_quantity?: number; // Apenas para patrimônios ou retornáveis
}

export interface Lesson {
  id: number;
  title: string;
  subject: string;
  class_id: number;
  teacher_id: number;
  location_id: number;
  date: string;
  start_time: string;
  end_time: string;
  students_count?: number;
  status: LessonStatus;
  observations?: string;
  items: LessonItem[];
  created_at: string;
}

export interface LoanItem {
  id: number;
  product_id?: number;
  patrimony_id?: number;
  is_patrimony: boolean;
  quantity: number;
  returned_quantity: number;
  status: 'Ativo' | 'Devolução parcial' | 'Devolvido' | 'Atrasado' | 'Com ocorrência' | 'Perdido';
}

export type LoanStatus = 'Ativo' | 'Devolução parcial' | 'Devolvido' | 'Atrasado' | 'Cancelado';

export interface Loan {
  id: number;
  loan_code: string; // Ex: EMP-000125
  student_id?: number;
  teacher_id?: number;
  class_id?: number;
  responsible_id: number; // Usuário do estoque que emprestou
  loan_date: string;
  expected_return_date: string;
  actual_return_date?: string;
  status: LoanStatus;
  observations?: string;
  items: LoanItem[];
  created_at: string;
}

export type OccurrenceType = 'Dano' | 'Perda' | 'Roubo' | 'Infração' | 'Outro';
export type OccurrenceSeverity = 'Baixa' | 'Média' | 'Alta' | 'Crítica';
export type OccurrenceStatus = 'ABERTA' | 'EM_ANALISE' | 'RESOLVIDA' | 'ARQUIVADA';

export interface Occurrence {
  id: number;
  occurrence_code: string;
  type: OccurrenceType;
  title: string;
  description: string;
  reported_by_id: number;
  severity: OccurrenceSeverity;
  status: OccurrenceStatus;
  patrimony_id?: number;
  product_id?: number;
  loan_id?: number;
  lesson_id?: number;
  images?: string[];
  attachments?: Attachment[];
  created_at: string;
  updated_at: string;
}
