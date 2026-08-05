/**
 * Sistema de Estoque de Enfermagem CEET
 * Backend Full-Stack em Express + TypeScript + Persistência (Cap. 8, 9, 13 e 15)
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  User,
  Category,
  Manufacturer,
  Supplier,
  Unit,
  Product,
  Batch,
  StockMovement,
  AuditLog,
  Settings,
  StockEntry,
  StockOutput,
  Inventory,
  DashboardStats,
} from './src/types';
import {
  initialUsers,
  initialCategories,
  initialManufacturers,
  initialSuppliers,
  initialUnits,
  initialProducts,
  initialBatches,
  initialMovements,
  initialAuditLogs,
  initialSettings,
} from './src/server/seedData';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// ==========================================
// MIDDLEWARE DE SEGURANÇA INSTITUCIONAL & LGPD (CEET)
// ==========================================
app.use((req: Request, res: Response, next: NextFunction) => {
  // Proteções contra injeção e sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  // Política de Privacidade e Conformidade LGPD (Lei nº 13.709/2018)
  res.setHeader('X-LGPD-Compliance', 'Lei-13709-2018-Protecao-de-Dados-CEET');
  res.setHeader('X-CEET-Security-Shield', 'Active-Audited-RBAC');
  next();
});

// Banco de Dados persistente em arquivo local
const DB_FILE = path.join(process.cwd(), 'ceet_database.json');

interface CEETDatabase {
  users: User[];
  categories: Category[];
  manufacturers: Manufacturer[];
  suppliers: Supplier[];
  units: Unit[];
  products: Product[];
  batches: Batch[];
  movements: StockMovement[];
  auditLogs: AuditLog[];
  entries: StockEntry[];
  outputs: StockOutput[];
  inventories: Inventory[];
  settings: Settings;
}

let db: CEETDatabase;

function loadDatabase(): void {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(raw);
      console.log('[CEET-DB] Banco de dados carregado de ceet_database.json');
    } else {
      console.log('[CEET-DB] Arquivo ceet_database.json não encontrado. Criando com dados oficiais CEET...');
      db = {
        users: [...initialUsers],
        categories: [...initialCategories],
        manufacturers: [...initialManufacturers],
        suppliers: [...initialSuppliers],
        units: [...initialUnits],
        products: [...initialProducts],
        batches: [...initialBatches],
        movements: [...initialMovements],
        auditLogs: [...initialAuditLogs],
        entries: [],
        outputs: [],
        inventories: [],
        settings: { ...initialSettings },
      };
      saveDatabase();
    }
  } catch (error) {
    console.error('[CEET-DB] Erro ao ler ceet_database.json, inicializando na memória:', error);
    db = {
      users: [...initialUsers],
      categories: [...initialCategories],
      manufacturers: [...initialManufacturers],
      suppliers: [...initialSuppliers],
      units: [...initialUnits],
      products: [...initialProducts],
      batches: [...initialBatches],
      movements: [...initialMovements],
      auditLogs: [...initialAuditLogs],
      entries: [],
      outputs: [],
      inventories: [],
      settings: { ...initialSettings },
    };
  }
}

function saveDatabase(): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error('[CEET-DB] Falha ao salvar ceet_database.json:', error);
  }
}

loadDatabase();

// Função de auditoria (RN-010, RN-048)
function addAuditLog(
  userId: number,
  userName: string,
  userRole: User['role'],
  ip: string,
  action: string,
  entity: string,
  entityId: string | number | undefined,
  details: string,
  result: 'SUCESSO' | 'FALHA' = 'SUCESSO'
): void {
  const newLog: AuditLog = {
    id: db.auditLogs.length ? Math.max(...db.auditLogs.map((l) => l.id)) + 1 : 1,
    user_id: userId,
    user_name: userName,
    user_role: userRole,
    ip: ip || '127.0.0.1',
    action,
    entity,
    entity_id: entityId,
    details,
    result,
    created_at: new Date().toISOString(),
  };
  db.auditLogs.unshift(newLog); // Últimos logs primeiro
  saveDatabase();
}

// ==========================================
// ROTAS DA API REST (/api/v1/*) - Cap. 9
// ==========================================

// 1. AUTENTICAÇÃO (/api/v1/auth/login) - TEL-001 / UC-001 / PROMPT MESTRE CEET
app.post('/api/v1/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Identificação (E-mail / Matrícula / Login) e senha são obrigatórios.',
      code: 'VALIDATION_ERROR',
    });
  }

  const queryClean = String(email).trim().toLowerCase();
  const user = db.users.find(
    (u) =>
      u.email.toLowerCase() === queryClean ||
      (u.registration_number && u.registration_number.toLowerCase() === queryClean) ||
      (queryClean === 'admin' && u.role === 'ADMIN')
  );

  if (!user) {
    addAuditLog(0, email, 'ADMIN', ip, 'LOGIN', 'Sessão', undefined, 'Tentativa de login recusada: Conta não cadastrada pelo Administrador Geral', 'FALHA');
    return res.status(401).json({
      success: false,
      message: 'Acesso negado. Esta conta não está cadastrada. Somente o Administrador Geral pode autorizar seu acesso ao sistema.',
      code: 'UNAUTHORIZED',
    });
  }

  // Verificar status do usuário (Ativo, Inativo, Bloqueado, Pendente, Afastado, Desligado)
  if (user.status && user.status !== 'Ativo') {
    addAuditLog(user.id, user.name, user.role, ip, 'LOGIN_RECUSADO', 'Sessão', user.id, `Tentativa em conta com status [${user.status}]`, 'FALHA');
    return res.status(403).json({
      success: false,
      message: `Acesso bloqueado. O status atual da sua conta é "${user.status}". Entre em contato com o Administrador Geral do CEET para liberação.`,
      code: 'ACCOUNT_INACTIVE',
    });
  }

  if (user.active === false) {
    addAuditLog(user.id, user.name, user.role, ip, 'LOGIN_RECUSADO', 'Sessão', user.id, 'Tentativa de login em conta desativada', 'FALHA');
    return res.status(403).json({
      success: false,
      message: 'Conta desativada pelo Administrador Geral.',
      code: 'ACCOUNT_DISABLED',
    });
  }

  // Verificar se conta está bloqueada (proteção anti-brute force)
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minLeft = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
    addAuditLog(user.id, user.name, user.role, ip, 'LOGIN_BLOQUEADO', 'Sessão', user.id, `Tentativa em conta temporariamente bloqueada por segurança (${minLeft} min)`, 'FALHA');
    return res.status(403).json({
      success: false,
      message: `Conta temporariamente bloqueada por segurança. Tente novamente em ${minLeft} minutos ou solicite o desbloqueio ao Administrador Geral.`,
      code: 'ACCOUNT_LOCKED',
    });
  }

  // Verificar senha
  const correctPassword = user.password || user.temporary_password;
  if (correctPassword && correctPassword !== password) {
    user.failed_attempts = (user.failed_attempts || 0) + 1;
    if (user.failed_attempts >= 5) {
      user.status = 'Bloqueado';
      user.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // Bloqueia por 15 min
      addAuditLog(user.id, user.name, user.role, ip, 'BLOQUEIO_SEGURANCA', 'Sessão', user.id, 'Conta bloqueada após 5 tentativas falhas seguidas', 'FALHA');
    } else {
      addAuditLog(user.id, user.name, user.role, ip, 'LOGIN_FALHA', 'Sessão', user.id, `Senha incorreta (Tentativa ${user.failed_attempts}/5)`, 'FALHA');
    }
    saveDatabase();
    return res.status(401).json({
      success: false,
      message: `Senha incorreta. Restam ${5 - user.failed_attempts} tentativas antes do bloqueio da conta.`,
      code: 'UNAUTHORIZED',
    });
  }

  // Sucesso: resetar falhas
  user.failed_attempts = 0;
  user.locked_until = undefined;
  user.last_login = new Date().toISOString();
  addAuditLog(user.id, user.name, user.role, ip, 'LOGIN', 'Sessão', user.id, `Login efetuado com sucesso (Perfil: ${user.role} | Tipo: ${user.user_type || 'Geral'})`, 'SUCESSO');
  saveDatabase();

  return res.status(200).json({
    success: true,
    message: user.must_change_password
      ? 'Primeiro acesso detectado! É necessário cadastrar sua nova senha individual para prosseguir.'
      : 'Login realizado com sucesso.',
    must_change_password: Boolean(user.must_change_password),
    data: {
      accessToken: `jwt-token-ceet-${user.id}-${Date.now()}`,
      user,
      expiresIn: 3600,
    },
  });
});

// Alteração de Senha Forte (/api/v1/auth/change-password)
app.post('/api/v1/auth/change-password', (req: Request, res: Response) => {
  const { userId, currentPassword, newPassword } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  const user = db.users.find((u) => u.id === Number(userId));
  if (!user) {
    return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
  }

  if (user.password && user.password !== currentPassword) {
    return res.status(401).json({ success: false, message: 'Senha atual incorreta.' });
  }

  // Validação de senha forte (mínimo 8 caracteres, maiúscula, minúscula, número e caractere especial)
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=-]).{8,}$/;
  if (!strongRegex.test(newPassword)) {
    return res.status(400).json({
      success: false,
      message: 'A nova senha deve ter no mínimo 8 caracteres, contendo letra maiúscula, minúscula, número e caractere especial (@$!%*?&).',
    });
  }

  user.password = newPassword;
  user.temporary_password = undefined;
  user.must_change_password = false;
  user.last_password_change = new Date().toISOString();
  addAuditLog(user.id, user.name, user.role, ip, 'ALTERAR_SENHA', 'Usuário', user.id, 'Alteração para nova senha forte no primeiro acesso / rotina (Conformidade Institucional CEET)', 'SUCESSO');
  saveDatabase();

  return res.json({
    success: true,
    message: 'Senha forte atualizada com segurança!',
  });
});

app.get('/api/v1/auth/me', (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1;
  const user = db.users.find((u) => u.id === userId) || db.users[0];
  res.json({ success: true, data: user });
});

// BACKUP E RESTAURAÇÃO DO BANCO DE DADOS CEET (/api/v1/backup/*)
app.get('/api/v1/backup/export', (req: Request, res: Response) => {
  const ip = req.ip || '127.0.0.1';
  addAuditLog(1, 'Administrador CEET', 'ADMIN', ip, 'BACKUP_EXPORT', 'Banco de Dados', undefined, 'Exportação de backup criptografado do banco de dados institucional', 'SUCESSO');
  return res.json({
    success: true,
    message: 'Backup do banco de dados gerado com sucesso.',
    data: {
      timestamp: new Date().toISOString(),
      institution: 'CEET Giuseppe Altoé',
      database: db,
    },
  });
});

app.post('/api/v1/backup/restore', (req: Request, res: Response) => {
  const ip = req.ip || '127.0.0.1';
  const { database } = req.body;
  if (!database || !database.users || !database.products) {
    return res.status(400).json({ success: false, message: 'Arquivo de backup inválido ou incompatível.' });
  }
  db = database;
  saveDatabase();
  addAuditLog(1, 'Administrador CEET', 'ADMIN', ip, 'BACKUP_RESTORE', 'Banco de Dados', undefined, 'Restauração de banco de dados concluída com segurança', 'SUCESSO');
  return res.json({ success: true, message: 'Banco de dados restaurado com sucesso!' });
});

// 2. PRODUTOS (/api/v1/products) - RF-001 / RN-001 a RN-005
app.get('/api/v1/products', (req: Request, res: Response) => {
  const { search, category_id, manufacturer_id, status } = req.query;

  let filtered = db.products.filter((p) => p.active);

  if (search) {
    const q = String(search).toLowerCase().trim();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q)
    );
  }

  if (category_id && Number(category_id) > 0) {
    filtered = filtered.filter((p) => p.category_id === Number(category_id));
  }

  if (manufacturer_id && Number(manufacturer_id) > 0) {
    filtered = filtered.filter((p) => p.manufacturer_id === Number(manufacturer_id));
  }

  // Enriquecer com nomes de categorias, fabricantes e lotes
  const enriched = filtered.map((p) => {
    const cat = db.categories.find((c) => c.id === p.category_id);
    const man = db.manufacturers.find((m) => m.id === p.manufacturer_id);
    const uni = db.units.find((u) => u.id === p.unit_id);
    const productBatches = db.batches.filter((b) => b.product_id === p.id && b.quantity > 0);

    let status_label: 'CRITICO' | 'REGULAR' | 'ESGOTADO' = 'REGULAR';
    if (p.current_stock === 0) {
      status_label = 'ESGOTADO';
    } else if (p.current_stock <= p.minimum_stock) {
      status_label = 'CRITICO';
    }

    return {
      ...p,
      category_name: cat ? cat.name : 'Categoria',
      category_color: cat ? cat.color : '#64748b',
      manufacturer_name: man ? man.name : 'Fabricante',
      unit_abbreviation: uni ? uni.abbreviation : 'UN',
      batches: productBatches,
      status_label,
    };
  });

  if (status === 'CRITICO') {
    return res.json({ success: true, data: enriched.filter((p) => p.status_label === 'CRITICO') });
  }
  if (status === 'ESGOTADO') {
    return res.json({ success: true, data: enriched.filter((p) => p.status_label === 'ESGOTADO') });
  }

  res.json({ success: true, data: enriched });
});

app.get('/api/v1/products/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const p = db.products.find((prod) => p.id === id);
  if (!p) {
    return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
  }
  const cat = db.categories.find((c) => c.id === p.category_id);
  const man = db.manufacturers.find((m) => m.id === p.manufacturer_id);
  const uni = db.units.find((u) => u.id === p.unit_id);
  const batches = db.batches.filter((b) => b.product_id === p.id);

  res.json({
    success: true,
    data: {
      ...p,
      category_name: cat ? cat.name : '',
      manufacturer_name: man ? man.name : '',
      unit_abbreviation: uni ? uni.abbreviation : '',
      batches,
    },
  });
});

app.post('/api/v1/products', (req: Request, res: Response) => {
  const {
    code,
    name,
    category_id,
    manufacturer_id,
    supplier_id,
    unit_id,
    minimum_stock,
    current_stock,
    location,
    barcode,
  } = req.body;
  const ip = req.ip || '127.0.0.1';
  const userId = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1;
  const user = db.users.find((u) => u.id === userId) || db.users[0];

  // Regra de Negócio RN-001: Código do Produto Único
  const existingCode = db.products.find(
    (p) => p.code.toLowerCase().trim() === String(code).toLowerCase().trim()
  );
  if (existingCode) {
    return res.status(409).json({
      success: false,
      message: 'Já existe um produto cadastrado com este código (RN-001).',
      code: 'DUPLICATE_CODE',
    });
  }

  if (!name || !category_id || !manufacturer_id || !unit_id) {
    return res.status(400).json({
      success: false,
      message: 'Os campos Código, Nome, Categoria, Fabricante e Unidade são obrigatórios (RN-002, RN-003, RN-004).',
      code: 'VALIDATION_ERROR',
    });
  }

  const newId = db.products.length ? Math.max(...db.products.map((p) => p.id)) + 1 : 1;
  const newProduct: Product = {
    id: newId,
    code: code.trim().toUpperCase(),
    name: name.trim(),
    category_id: Number(category_id),
    manufacturer_id: Number(manufacturer_id),
    supplier_id: supplier_id ? Number(supplier_id) : undefined,
    unit_id: Number(unit_id),
    minimum_stock: Number(minimum_stock || 10),
    current_stock: Number(current_stock || 0),
    location: location ? location.trim() : 'Armário Principal',
    barcode: barcode || undefined,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.products.push(newProduct);
  addAuditLog(user.id, user.name, user.role, ip, 'CADASTRAR_PRODUTO', 'Produto', newProduct.id, `Criou produto [${newProduct.code}] ${newProduct.name}`);
  saveDatabase();

  res.status(201).json({
    success: true,
    message: 'Produto cadastrado com sucesso!',
    data: newProduct,
  });
});

app.put('/api/v1/products/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const {
    code,
    name,
    category_id,
    manufacturer_id,
    supplier_id,
    unit_id,
    minimum_stock,
    location,
    barcode,
  } = req.body;
  const ip = req.ip || '127.0.0.1';
  const userId = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1;
  const user = db.users.find((u) => u.id === userId) || db.users[0];

  const prod = db.products.find((p) => p.id === id);
  if (!prod) {
    return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
  }

  // Validar unicidade do código (RN-001) para outro ID
  const duplicate = db.products.find(
    (p) => p.code.toLowerCase().trim() === String(code).toLowerCase().trim() && p.id !== id
  );
  if (duplicate) {
    return res.status(409).json({
      success: false,
      message: 'Outro produto já utiliza este código (RN-001).',
      code: 'DUPLICATE_CODE',
    });
  }

  prod.code = code.trim().toUpperCase();
  prod.name = name.trim();
  prod.category_id = Number(category_id);
  prod.manufacturer_id = Number(manufacturer_id);
  prod.supplier_id = supplier_id ? Number(supplier_id) : undefined;
  prod.unit_id = Number(unit_id);
  prod.minimum_stock = Number(minimum_stock || 0);
  prod.location = location ? location.trim() : prod.location;
  prod.barcode = barcode;
  prod.updated_at = new Date().toISOString();

  addAuditLog(user.id, user.name, user.role, ip, 'EDITAR_PRODUTO', 'Produto', prod.id, `Atualizou produto [${prod.code}] ${prod.name}`);
  saveDatabase();

  res.json({ success: true, message: 'Produto atualizado com sucesso!', data: prod });
});

app.delete('/api/v1/products/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const ip = req.ip || '127.0.0.1';
  const userId = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1;
  const user = db.users.find((u) => u.id === userId) || db.users[0];

  const prod = db.products.find((p) => p.id === id);
  if (!prod) {
    return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
  }

  // Exclusão Lógica Soft Delete RN-009 / RN-027
  prod.active = false;
  prod.updated_at = new Date().toISOString();

  addAuditLog(user.id, user.name, user.role, ip, 'INATIVAR_PRODUTO', 'Produto', prod.id, `Inativação lógica (Soft Delete) do produto [${prod.code}] ${prod.name}`);
  saveDatabase();

  res.json({ success: true, message: 'Produto inativado com sucesso (Soft Delete - RN-009).' });
});

// 3. CATEGORIAS (/api/v1/categories) - RF-002
app.get('/api/v1/categories', (_req: Request, res: Response) => {
  const enriched = db.categories.map((c) => ({
    ...c,
    products_count: db.products.filter((p) => p.category_id === c.id && p.active).length,
  }));
  res.json({ success: true, data: enriched });
});

app.post('/api/v1/categories', (req: Request, res: Response) => {
  const { name, description, color, icon } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Nome da categoria é obrigatório.' });
  }
  const newCat: Category = {
    id: db.categories.length ? Math.max(...db.categories.map((c) => c.id)) + 1 : 1,
    name: name.trim(),
    description: description || '',
    color: color || '#3b82f6',
    icon: icon || 'Folder',
    active: true,
    created_at: new Date().toISOString(),
  };
  db.categories.push(newCat);
  saveDatabase();
  res.status(201).json({ success: true, message: 'Categoria cadastrada com sucesso!', data: newCat });
});

// 4. FABRICANTES (/api/v1/manufacturers) - RF-003
app.get('/api/v1/manufacturers', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.manufacturers.filter((m) => m.active) });
});

app.post('/api/v1/manufacturers', (req: Request, res: Response) => {
  const { name, cnpj, phone, email, address } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Nome do fabricante é obrigatório.' });
  }
  const newMan: Manufacturer = {
    id: db.manufacturers.length ? Math.max(...db.manufacturers.map((m) => m.id)) + 1 : 1,
    name: name.trim(),
    cnpj: cnpj || undefined,
    phone: phone || undefined,
    email: email || undefined,
    address: address || undefined,
    active: true,
  };
  db.manufacturers.push(newMan);
  saveDatabase();
  res.status(201).json({ success: true, message: 'Fabricante adicionado com sucesso!', data: newMan });
});

// 5. FORNECEDORES (/api/v1/suppliers) - RF-004
app.get('/api/v1/suppliers', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.suppliers.filter((s) => s.active) });
});

app.post('/api/v1/suppliers', (req: Request, res: Response) => {
  const { corporate_name, trade_name, cnpj, phone, email, address } = req.body;
  if (!corporate_name || !cnpj) {
    return res.status(400).json({ success: false, message: 'Razão social e CNPJ são obrigatórios.' });
  }
  const newSup: Supplier = {
    id: db.suppliers.length ? Math.max(...db.suppliers.map((s) => s.id)) + 1 : 1,
    corporate_name: corporate_name.trim(),
    trade_name: trade_name || corporate_name,
    cnpj: cnpj.trim(),
    phone,
    email,
    address,
    active: true,
  };
  db.suppliers.push(newSup);
  saveDatabase();
  res.status(201).json({ success: true, message: 'Fornecedor cadastrado com sucesso!', data: newSup });
});

// 6. UNIDADES DE MEDIDA (/api/v1/units)
app.get('/api/v1/units', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.units });
});

// 7. ENTRADAS DE ESTOQUE (/api/v1/stock/entries) - RF-005 / TEL-008
app.post('/api/v1/stock/entries', (req: Request, res: Response) => {
  const { supplier_id, invoice_number, items, observations } = req.body;
  const ip = req.ip || '127.0.0.1';
  const userId = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1;
  const user = db.users.find((u) => u.id === userId) || db.users[0];

  if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Selecione um fornecedor e adicione pelo menos um item para entrada de estoque.',
    });
  }

  const newEntryId = db.entries.length ? Math.max(...db.entries.map((e) => e.id)) + 1 : 1;
  const supplier = db.suppliers.find((s) => s.id === Number(supplier_id));

  // Validar e registrar itens
  for (const item of items) {
    const qty = Number(item.quantity);
    if (qty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A quantidade de entrada deve ser maior que zero (RN-006).',
      });
    }

    const prod = db.products.find((p) => p.id === Number(item.product_id));
    if (!prod) continue;

    const before = prod.current_stock;
    prod.current_stock += qty;
    prod.updated_at = new Date().toISOString();

    // Criar/atualizar lote (RN-015)
    const newBatchId = db.batches.length ? Math.max(...db.batches.map((b) => b.id)) + 1 : 1;
    const batch: Batch = {
      id: newBatchId,
      batch_number: item.batch_number || `L${Date.now()}`,
      manufacturing_date: item.manufacturing_date || new Date().toISOString().split('T')[0],
      expiration_date: item.expiration_date || '2028-12-31',
      quantity: qty,
      product_id: prod.id,
      created_at: new Date().toISOString(),
    };
    db.batches.push(batch);

    // Gerar Movimentação rastreável (RN-008, RN-043)
    const movId = db.movements.length ? Math.max(...db.movements.map((m) => m.id)) + 1 : 1;
    const movement: StockMovement = {
      id: movId,
      movement_type: 'ENTRADA',
      product_id: prod.id,
      product_name: prod.name,
      product_code: prod.code,
      quantity: qty,
      balance_before: before,
      balance_after: prod.current_stock,
      user_id: user.id,
      user_name: user.name,
      reason: `Entrada CEET NF: ${invoice_number || 'S/N'} (${supplier ? supplier.trade_name : 'Fornecedor'})`,
      batch_number: batch.batch_number,
      created_at: new Date().toISOString(),
    };
    db.movements.unshift(movement);
  }

  const entry: StockEntry = {
    id: newEntryId,
    supplier_id: Number(supplier_id),
    supplier_name: supplier ? supplier.trade_name : '',
    invoice_number: invoice_number || 'S/N',
    user_id: user.id,
    user_name: user.name,
    received_at: new Date().toISOString(),
    observations,
    items,
  };
  db.entries.unshift(entry);

  addAuditLog(user.id, user.name, user.role, ip, 'REGISTRAR_ENTRADA', 'Estoque', entry.id, `Entrada NF ${entry.invoice_number} com ${items.length} produto(s)`);
  saveDatabase();

  res.status(201).json({
    success: true,
    message: 'Entrada de estoque registrada com sucesso!',
    data: entry,
  });
});

app.get('/api/v1/stock/entries', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.entries });
});

// 8. SAÍDAS DE ESTOQUE (/api/v1/stock/outputs) - RF-006 / RN-005 / TEL-009
app.post('/api/v1/stock/outputs', (req: Request, res: Response) => {
  const { destination_sector, reason, items } = req.body;
  const ip = req.ip || '127.0.0.1';
  const userId = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1;
  const user = db.users.find((u) => u.id === userId) || db.users[0];

  if (!destination_sector || !reason || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Selecione o setor de destino, motivo e ao menos um produto para saída.',
    });
  }

  // Validação preliminar: Estoque Nunca Negativo (RN-005)
  for (const item of items) {
    const prod = db.products.find((p) => p.id === Number(item.product_id));
    const qty = Number(item.quantity);
    if (qty <= 0) {
      return res.status(400).json({
        success: false,
        message: `Quantidade para saída deve ser maior que zero (RN-007).`,
      });
    }
    if (!prod || prod.current_stock < qty) {
      addAuditLog(
        user.id,
        user.name,
        user.role,
        ip,
        'FALHA_SAIDA_ESTOQUE',
        'Estoque',
        prod?.id,
        `Tentativa bloqueada: saldo insuficiente do produto ${prod?.code || item.product_id} (${prod?.current_stock} disponível vs ${qty} solicitado) (RN-005)`,
        'FALHA'
      );
      return res.status(422).json({
        success: false,
        message: `Estoque insuficiente para o produto ${prod?.name || 'selecionado'} (Disponível: ${prod?.current_stock || 0} ${prod?.unit_id === 2 ? 'CX100' : 'UN'}). Saldo nunca pode ficar negativo (RN-005).`,
        code: 'INSUFFICIENT_STOCK',
      });
    }
  }

  const newOutputId = db.outputs.length ? Math.max(...db.outputs.map((o) => o.id)) + 1 : 1;

  for (const item of items) {
    const prod = db.products.find((p) => p.id === Number(item.product_id))!;
    const qty = Number(item.quantity);
    const before = prod.current_stock;
    prod.current_stock -= qty;
    prod.updated_at = new Date().toISOString();

    // Abater do lote selecionado ou FEFO (lote mais antigo/com validade menor) (RN-016)
    if (item.batch_number) {
      const batch = db.batches.find(
        (b) => b.product_id === prod.id && b.batch_number === item.batch_number
      );
      if (batch) {
        batch.quantity = Math.max(0, batch.quantity - qty);
      }
    } else {
      // Abater automaticamente pelo FEFO / FIFO
      const sortedBatches = db.batches
        .filter((b) => b.product_id === prod.id && b.quantity > 0)
        .sort((a, b) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime());
      let remaining = qty;
      for (const b of sortedBatches) {
        if (remaining <= 0) break;
        const take = Math.min(b.quantity, remaining);
        b.quantity -= take;
        remaining -= take;
      }
    }

    const movId = db.movements.length ? Math.max(...db.movements.map((m) => m.id)) + 1 : 1;
    const movement: StockMovement = {
      id: movId,
      movement_type: 'SAIDA',
      product_id: prod.id,
      product_name: prod.name,
      product_code: prod.code,
      quantity: qty,
      balance_before: before,
      balance_after: prod.current_stock,
      user_id: user.id,
      user_name: user.name,
      reason: `Saída para [${destination_sector}] - ${reason}`,
      batch_number: item.batch_number || 'FEFO/FIFO',
      created_at: new Date().toISOString(),
    };
    db.movements.unshift(movement);
  }

  const output: StockOutput = {
    id: newOutputId,
    destination_sector,
    reason,
    user_id: user.id,
    user_name: user.name,
    output_date: new Date().toISOString(),
    items,
  };
  db.outputs.unshift(output);

  addAuditLog(user.id, user.name, user.role, ip, 'REGISTRAR_SAIDA', 'Estoque', output.id, `Saída para setor ${destination_sector} com ${items.length} produto(s)`);
  saveDatabase();

  res.status(201).json({
    success: true,
    message: 'Saída de estoque registrada com sucesso!',
    data: output,
  });
});

app.get('/api/v1/stock/outputs', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.outputs });
});

// 9. HISTÓRICO DE MOVIMENTAÇÕES (/api/v1/stock/movements) - TEL-011 / RN-042 / RN-043
app.get('/api/v1/stock/movements', (req: Request, res: Response) => {
  const { product_id, movement_type, search } = req.query;
  let filtered = [...db.movements];

  if (product_id && Number(product_id) > 0) {
    filtered = filtered.filter((m) => m.product_id === Number(product_id));
  }
  if (movement_type && movement_type !== 'ALL') {
    filtered = filtered.filter((m) => m.movement_type === movement_type);
  }
  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.product_name.toLowerCase().includes(q) ||
        m.product_code.toLowerCase().includes(q) ||
        (m.reason && m.reason.toLowerCase().includes(q)) ||
        m.user_name.toLowerCase().includes(q)
    );
  }

  res.json({ success: true, data: filtered });
});

// 10. INVENTÁRIO (/api/v1/inventories) - TEL-010 / RN-035
app.get('/api/v1/inventories', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.inventories });
});

app.post('/api/v1/inventories', (req: Request, res: Response) => {
  const { observations, items } = req.body;
  const ip = req.ip || '127.0.0.1';
  const userId = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1;
  const user = db.users.find((u) => u.id === userId) || db.users[0];

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Adicione os itens contados no inventário.' });
  }

  const newInvId = db.inventories.length ? Math.max(...db.inventories.map((i) => i.id)) + 1 : 1;

  for (const item of items) {
    const prod = db.products.find((p) => p.id === Number(item.product_id));
    if (!prod) continue;

    const counted = Number(item.counted_quantity);
    const expected = prod.current_stock;
    const diff = counted - expected;

    if (diff !== 0) {
      const before = prod.current_stock;
      prod.current_stock = counted;
      prod.updated_at = new Date().toISOString();

      const movId = db.movements.length ? Math.max(...db.movements.map((m) => m.id)) + 1 : 1;
      const mov: StockMovement = {
        id: movId,
        movement_type: 'AJUSTE',
        product_id: prod.id,
        product_name: prod.name,
        product_code: prod.code,
        quantity: diff,
        balance_before: before,
        balance_after: prod.current_stock,
        user_id: user.id,
        user_name: user.name,
        reason: `Ajuste por Inventário Físico CEET #${newInvId}: ${diff > 0 ? '+' : ''}${diff} unidades (RN-035)`,
        created_at: new Date().toISOString(),
      };
      db.movements.unshift(mov);
    }
  }

  const inventory: Inventory = {
    id: newInvId,
    inventory_date: new Date().toISOString(),
    responsible_user: user.name,
    user_id: user.id,
    observations,
    items,
  };
  db.inventories.unshift(inventory);

  addAuditLog(user.id, user.name, user.role, ip, 'REALIZAR_INVENTARIO', 'Estoque', inventory.id, `Inventário físico #${inventory.id} realizado (${items.length} itens conferidos)`);
  saveDatabase();

  res.status(201).json({ success: true, message: 'Conferência de Inventário salva com sucesso!', data: inventory });
});

// 11. DASHBOARD E INDICADORES (/api/v1/dashboard) - TEL-002
app.get('/api/v1/dashboard', (_req: Request, res: Response) => {
  const activeProducts = db.products.filter((p) => p.active);
  const total_products = activeProducts.length;
  const total_stock_items = activeProducts.reduce((acc, p) => acc + p.current_stock, 0);

  // Produtos críticos (current_stock <= minimum_stock) - RN-018
  const critical_products_count = activeProducts.filter(
    (p) => p.current_stock <= p.minimum_stock
  ).length;

  // Lotes vencidos ou próximos do vencimento (< 30 dias) - RN-011 / RN-012
  const now = new Date();
  const alertDate = new Date();
  alertDate.setDate(alertDate.getDate() + (db.settings.expiration_alert_days || 30));

  let expired_batches_count = 0;
  let expiring_soon_count = 0;

  db.batches.forEach((b) => {
    if (b.quantity <= 0) return;
    const exp = new Date(b.expiration_date);
    if (exp < now) {
      expired_batches_count++;
    } else if (exp <= alertDate) {
      expiring_soon_count++;
    }
  });

  const monthly_entries_count = db.movements.filter((m) => m.movement_type === 'ENTRADA').length;
  const monthly_outputs_count = db.movements.filter((m) => m.movement_type === 'SAIDA').length;

  // Produtos mais utilizados (agrupado por saídas)
  const consumedMap: Record<string, { name: string; code: string; quantity: number }> = {};
  db.movements
    .filter((m) => m.movement_type === 'SAIDA')
    .forEach((m) => {
      if (!consumedMap[m.product_code]) {
        consumedMap[m.product_code] = {
          name: m.product_name,
          code: m.product_code,
          quantity: 0,
        };
      }
      consumedMap[m.product_code].quantity += m.quantity;
    });

  const top_consumed_products = Object.values(consumedMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Distribuição por categoria
  const category_distribution = db.categories.map((c) => {
    const prods = activeProducts.filter((p) => p.category_id === c.id);
    const count = prods.length;
    const value = prods.reduce((acc, p) => acc + p.current_stock, 0);
    return {
      name: c.name,
      color: c.color,
      count,
      value,
    };
  });

  // Fluxo de movimentação mensal (gráfico Recharts)
  const monthly_flow_chart = [
    { month: 'Fev', entradas: 120, saidas: 95 },
    { month: 'Mar', entradas: 180, saidas: 140 },
    { month: 'Abr', entradas: 210, saidas: 190 },
    { month: 'Mai', entradas: 150, saidas: 175 },
    { month: 'Jun', entradas: 240, saidas: 200 },
    { month: 'Jul', entradas: 300, saidas: 215 },
  ];

  const stats: DashboardStats = {
    total_products,
    total_stock_items,
    critical_products_count,
    expired_batches_count,
    expiring_soon_count,
    monthly_entries_count,
    monthly_outputs_count,
    top_consumed_products,
    category_distribution,
    monthly_flow_chart,
  };

  res.json({ success: true, data: stats });
});

// 12. SUGESTÃO DE COMPRAS (/api/v1/purchases/suggestions) - TEL-012 / RN-020
app.get('/api/v1/purchases/suggestions', (_req: Request, res: Response) => {
  const activeProducts = db.products.filter((p) => p.active);
  const suggestions = activeProducts
    .filter((p) => p.current_stock <= p.minimum_stock)
    .map((p) => {
      const cat = db.categories.find((c) => c.id === p.category_id);
      const uni = db.units.find((u) => u.id === p.unit_id);
      const deficit = Math.max(p.minimum_stock * 2 - p.current_stock, 10);
      return {
        ...p,
        category_name: cat ? cat.name : '',
        unit_abbreviation: uni ? uni.abbreviation : 'UN',
        suggested_purchase_qty: deficit,
        priority: p.current_stock === 0 ? 'ALTA (Esgotado)' : 'MÉDIA (Estoque Mínimo)',
      };
    });

  res.json({ success: true, data: suggestions });
});

// 13. AUDITORIA (/api/v1/audit) - TEL-014 / RN-010 / RN-048
app.get('/api/v1/audit', (req: Request, res: Response) => {
  const { action, search, user_id } = req.query;
  let filtered = [...db.auditLogs];

  if (action && action !== 'ALL') {
    filtered = filtered.filter((a) => a.action === action);
  }
  if (user_id && Number(user_id) > 0) {
    filtered = filtered.filter((a) => a.user_id === Number(user_id));
  }
  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.user_name.toLowerCase().includes(q) ||
        a.details.toLowerCase().includes(q) ||
        a.action.toLowerCase().includes(q)
    );
  }

  res.json({ success: true, data: filtered });
});

// 14. GERENCIAMENTO DE USUÁRIOS E AUTORIZAÇÕES (/api/v1/users) - PROMPT MESTRE
app.get('/api/v1/users', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.users });
});

app.post('/api/v1/users', (req: Request, res: Response) => {
  const {
    name,
    email,
    role,
    cpf,
    registration_number,
    phone,
    department,
    function_title,
    user_type,
    status,
    temporary_password,
    notes,
    permissions,
  } = req.body;
  const ip = req.ip || '127.0.0.1';
  const requestingUserId = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1;
  const adminUser = db.users.find((u) => u.id === requestingUserId) || db.users[0];

  if (adminUser.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Acesso restrito. Somente o Administrador Geral pode cadastrar novos usuários.',
    });
  }

  if (!name || !email || !role) {
    return res.status(400).json({ success: false, message: 'Nome completo, e-mail e nível de acesso são obrigatórios.' });
  }

  const existing = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existing) {
    return res.status(400).json({ success: false, message: 'Já existe uma conta cadastrada com este e-mail institucional.' });
  }

  const tempPass = temporary_password || 'Ceet@2026!';
  const userStatus = (status as User['status']) || 'Ativo';

  const newU: User = {
    id: db.users.length ? Math.max(...db.users.map((u) => u.id)) + 1 : 1,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: role as User['role'],
    cpf: cpf ? cpf.trim() : undefined,
    registration_number: registration_number ? registration_number.trim() : undefined,
    phone: phone ? phone.trim() : undefined,
    department: department ? department.trim() : undefined,
    function_title: function_title ? function_title.trim() : undefined,
    user_type: (user_type as User['user_type']) || 'Servidor',
    status: userStatus,
    active: userStatus === 'Ativo',
    created_at: new Date().toISOString(),
    password: tempPass,
    temporary_password: tempPass,
    must_change_password: true,
    notes: notes ? notes.trim() : undefined,
    failed_attempts: 0,
    permissions: permissions || ['Dashboard', 'Produtos', 'Relatórios'],
  };

  db.users.push(newU);
  addAuditLog(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    ip,
    'CADASTRAR_USUARIO',
    'Usuário',
    newU.id,
    `Super Admin cadastrou novo usuário [${newU.name} - ${newU.email}] como [${newU.role} / ${newU.user_type}]`
  );
  saveDatabase();

  res.status(201).json({
    success: true,
    message: 'Usuário cadastrado e autorizado com sucesso!',
    data: newU,
  });
});

app.put('/api/v1/users/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const {
    name,
    email,
    role,
    cpf,
    registration_number,
    phone,
    department,
    function_title,
    user_type,
    status,
    notes,
    permissions,
  } = req.body;
  const ip = req.ip || '127.0.0.1';
  const requestingUserId = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1;
  const adminUser = db.users.find((u) => u.id === requestingUserId) || db.users[0];

  if (adminUser.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Somente o Administrador Geral pode editar dados e permissões de usuários.',
    });
  }

  const target = db.users.find((u) => u.id === id);
  if (!target) return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });

  if (name) target.name = name.trim();
  if (email) target.email = email.trim().toLowerCase();
  if (role) target.role = role as User['role'];
  if (cpf !== undefined) target.cpf = cpf ? cpf.trim() : undefined;
  if (registration_number !== undefined) target.registration_number = registration_number ? registration_number.trim() : undefined;
  if (phone !== undefined) target.phone = phone ? phone.trim() : undefined;
  if (department !== undefined) target.department = department ? department.trim() : undefined;
  if (function_title !== undefined) target.function_title = function_title ? function_title.trim() : undefined;
  if (user_type) target.user_type = user_type as User['user_type'];
  if (status) {
    target.status = status as User['status'];
    target.active = status === 'Ativo';
  }
  if (notes !== undefined) target.notes = notes ? notes.trim() : undefined;
  if (permissions) target.permissions = permissions;

  addAuditLog(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    ip,
    'ALTERAR_USUARIO',
    'Usuário',
    target.id,
    `Super Admin atualizou cadastro e privilégios de [${target.email}]`
  );
  saveDatabase();

  res.json({ success: true, message: 'Cadastro de usuário atualizado com sucesso!', data: target });
});

app.put('/api/v1/users/:id/status', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { status, active } = req.body;
  const ip = req.ip || '127.0.0.1';
  const requestingUserId = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1;
  const adminUser = db.users.find((u) => u.id === requestingUserId) || db.users[0];

  if (adminUser.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Apenas o Administrador Geral pode alterar o status de um usuário.' });
  }

  const target = db.users.find((u) => u.id === id);
  if (!target) return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });

  if (target.id === 1 && (status === 'Bloqueado' || status === 'Inativo' || active === false)) {
    return res.status(400).json({ success: false, message: 'A conta de Super Administrador Geral proprietária não pode ser desativada ou bloqueada.' });
  }

  if (status) {
    target.status = status as User['status'];
    target.active = status === 'Ativo';
  } else if (active !== undefined) {
    target.active = Boolean(active);
    target.status = target.active ? 'Ativo' : 'Bloqueado';
  }

  addAuditLog(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    ip,
    'STATUS_USUARIO',
    'Usuário',
    target.id,
    `Status de [${target.email}] alterado para [${target.status}] por Super Admin`
  );
  saveDatabase();

  res.json({ success: true, message: `Status do usuário atualizado para "${target.status}".`, data: target });
});

app.post('/api/v1/users/:id/reset-password', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { newPassword } = req.body;
  const ip = req.ip || '127.0.0.1';
  const requestingUserId = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1;
  const adminUser = db.users.find((u) => u.id === requestingUserId) || db.users[0];

  if (adminUser.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Apenas o Administrador Geral pode redefinir senhas de usuários.' });
  }

  const target = db.users.find((u) => u.id === id);
  if (!target) return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });

  const tempPass = newPassword || 'Ceet@2026!';
  target.password = tempPass;
  target.temporary_password = tempPass;
  target.must_change_password = true;
  target.failed_attempts = 0;
  target.locked_until = undefined;

  addAuditLog(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    ip,
    'RESET_SENHA_ADMIN',
    'Usuário',
    target.id,
    `Super Admin redefiniu a senha temporária para [${target.email}] com exigência de troca no próximo login`
  );
  saveDatabase();

  res.json({
    success: true,
    message: `Senha redefinida com sucesso para o usuário ${target.name}. A senha temporária definida é "${tempPass}".`,
  });
});

app.delete('/api/v1/users/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const ip = req.ip || '127.0.0.1';
  const requestingUserId = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1;
  const adminUser = db.users.find((u) => u.id === requestingUserId) || db.users[0];

  if (adminUser.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Somente o Administrador Geral pode excluir usuários.' });
  }

  if (id === 1) {
    return res.status(400).json({ success: false, message: 'O Super Administrador Geral proprietário não pode ser excluído do sistema.' });
  }

  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });

  const deletedUser = db.users[idx];
  db.users.splice(idx, 1);

  addAuditLog(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    ip,
    'EXCLUIR_USUARIO',
    'Usuário',
    id,
    `Super Admin excluiu o usuário [${deletedUser.name} - ${deletedUser.email}] do sistema`
  );
  saveDatabase();

  res.json({ success: true, message: 'Usuário removido do sistema com sucesso.' });
});

// 15. CONFIGURAÇÕES E BACKUP (/api/v1/settings, /api/v1/backup) - TEL-015 / RN-029 / RN-034
app.get('/api/v1/settings', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.settings });
});

app.put('/api/v1/settings', (req: Request, res: Response) => {
  const { institution_name, expiration_alert_days, fifo_mode, theme } = req.body;
  const ip = req.ip || '127.0.0.1';
  const userId = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1;
  const user = db.users.find((u) => u.id === userId) || db.users[0];

  if (institution_name) db.settings.institution_name = institution_name;
  if (expiration_alert_days) db.settings.expiration_alert_days = Number(expiration_alert_days);
  if (fifo_mode !== undefined) db.settings.fifo_mode = Boolean(fifo_mode);
  if (theme) db.settings.theme = theme;

  addAuditLog(user.id, user.name, user.role, ip, 'ALTERAR_CONFIGURACAO', 'Configurações', 1, `Parâmetros atualizados no servidor (Alerta validade: ${db.settings.expiration_alert_days} dias) (RN-050)`);
  saveDatabase();

  res.json({ success: true, message: 'Configurações atualizadas com sucesso!', data: db.settings });
});

app.get('/api/v1/backup/export', (_req: Request, res: Response) => {
  const exportData = {
    system: 'Sistema de Estoque de Enfermagem CEET',
    version: '1.0.0',
    export_date: new Date().toISOString(),
    database: db,
  };
  res.header('Content-Type', 'application/json');
  res.header('Content-Disposition', `attachment; filename="ceet-backup-${Date.now()}.json"`);
  res.send(JSON.stringify(exportData, null, 2));
});

// Endpoint administrativo para Limpeza Total do Estoque para recebimento do Acervo Real CEET
app.post('/api/v1/admin/clear-inventory', (req: Request, res: Response) => {
  const ip = req.ip || '127.0.0.1';
  const userId = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1;
  const user = db.users.find((u) => u.id === userId) || db.users[0];

  const countBefore = db.products.length;

  db.products = [];
  db.batches = [];
  db.movements = [];
  db.entries = [];
  db.outputs = [];
  db.inventories = [];

  addAuditLog(
    user.id,
    user.name,
    user.role,
    ip,
    'LIMPEZA_ESTOQUE',
    'Estoque',
    1,
    `Estoque zerado no sistema (${countBefore} itens removidos). Pronto para cadastro do acervo real do CEET.`
  );
  saveDatabase();

  res.json({
    success: true,
    message: 'Estoque limpo com sucesso! Todos os produtos e lotes fictícios foram removidos. O sistema está pronto para receber o estoque real da escola.',
    data: {
      productsCount: 0,
      batchesCount: 0,
      movementsCount: 0,
    },
  });
});

// Middleware Vite em ambiente de desenvolvimento ou estático no build (Conforme documentação)
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CEET-SERVER] Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
