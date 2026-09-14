/**
 * Sistema de Estoque de Enfermagem CEET
 * Backend Full-Stack em Express + TypeScript + Persistência (Cap. 8, 9, 13 e 15)
 */

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, GenerateContentResponse, Type, FunctionDeclaration } from '@google/genai';
import Groq from 'groq-sdk';
import cors from 'cors';
import { db as firebaseDb, storage as firebaseStorage } from './firebase/admin';
import { createFirebaseUser, updateFirebaseUser, disableFirebaseUser, deleteFirebaseUser, signInFirebaseUser, changeFirebaseUserPassword } from './firebase/adminAuth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
  Patrimony,
  Maintenance,
  InstitutionalLocation as Location,
  Student,
  ClassGroup,
  Lesson,
  LessonItem,
  Loan,
  LoanItem,
  Occurrence,
  SupportTicket,
  SupportMessage,
  RemoteAccessRequest,
  Attachment,
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
  initialLocations,
  initialPatrimonies,
  initialClassGroups,
} from './src/server/seedData';

export const app = express();
app.use(cors());
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ceet-enfermagem-secret-key-2026';
const JWT_EXPIRES_IN = '8h';

// Helper para upload no Firebase Storage (RN-050)
async function uploadToFirebase(buffer: Buffer, path: string, contentType: string): Promise<string> {
  const storage = firebaseStorage();
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, buffer, { contentType });
  return getDownloadURL(storageRef);
}

const DB_TABLES = [
  'users', 'categories', 'manufacturers', 'suppliers', 'units', 'products', 
  'batches', 'movements', 'auditLogs', 'entries', 'outputs', 'inventories',
  'patrimonies', 'maintenances', 'locations', 'students', 'class_groups',
  'lessons', 'loans', 'occurrences', 'support_tickets', 'support_messages',
  'remote_access_requests'
];

// Helper para sanitizar usuário (remover senha) (RN-050)
function sanitizeUser(user: User) {
  const { password, temporary_password, ...sanitized } = user;
  return sanitized;
}

// Middleware de Autenticação Real (CEET-F0)
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Acesso negado. Token não fornecido.', code: 'UNAUTHORIZED' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: User['role'] };
    const user = db.users.find(u => u.id === decoded.id);
    
    if (!user || !user.active || user.status !== 'Ativo') {
      return res.status(401).json({ success: false, message: 'Sessão inválida ou conta inativa.', code: 'UNAUTHORIZED' });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Sessão expirada. Por favor, faça login novamente.', code: 'TOKEN_EXPIRED' });
  }
};

// Middleware de Autorização RBAC (CEET-F0)
const authorize = (roles: User['role'][]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as User;
    if (!roles.includes(user.role)) {
      await addAuditLog(user.id, user.name, user.role, req.ip || '127.0.0.1', 'ACESSO_NEGADO', 'Recurso', req.path, `Tentativa de acesso sem permissão [Role: ${user.role}]`, 'FALHA');
      return res.status(403).json({ success: false, message: 'Acesso negado. Você não tem permissão para realizar esta operação.', code: 'FORBIDDEN' });
    }
    next();
  };
};

// Aplicar autenticação global em todas as rotas /api/v1/*, exceto Login (RN-050)
app.use('/api/v1', (req: Request, res: Response, next: NextFunction) => {
  // Rotas públicas que não exigem Token
  const publicPaths = ['/auth/login', '/health'];
  if (publicPaths.includes(req.path)) {
    return next();
  }
  authenticate(req, res, next);
});

app.get('/api/v1/health', async (req: Request, res: Response) => {
  res.json({ success: true, message: 'CEET Server Online', version: '1.0.0' });
});

app.use(express.json({ limit: '20mb' }));

// Configurar pasta de uploads
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Rota de Upload Real (CEET-V5) - Protegida e Validada (Fase 0)
app.post('/api/v1/upload', async (req: Request, res: Response) => {
  const { fileName, fileType, base64 } = req.body;
  const user = (req as any).user as User;
  
  if (!base64 || !fileName) {
    return res.status(400).json({ success: false, message: 'Arquivo não enviado ou corrompido.' });
  }

  // Validação básica de tipo de arquivo (Fase 0)
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    'application/pdf', 
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    'application/zip', 'application/x-zip-compressed'
  ];
  if (!allowedTypes.includes(fileType)) {
    return res.status(400).json({ success: false, message: 'Tipo de arquivo não permitido.' });
  }

  // Limite de tamanho (ex: 10MB para comportar base64)
  const base64Data = base64.split(';base64,').pop() || '';
  const buffer = Buffer.from(base64Data, 'base64');
  if (buffer.length > 10 * 1024 * 1024) {
    return res.status(400).json({ success: false, message: 'Arquivo muito grande. Limite de 10MB.' });
  }

  try {
    const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const url = await uploadToFirebase(buffer, `uploads/${safeName}`, fileType);

    const attachment: Attachment = {
      id: `att-${Date.now()}`,
      name: fileName,
      url: url,
      type: fileType,
      size: buffer.length,
      user_id: user.id,
      user_name: user.name,
      created_at: new Date().toISOString()
    };

    await addAuditLog(user.id, user.name, user.role, req.ip || '127.0.0.1', 'UPLOAD_ARQUIVO', 'Arquivo', attachment.id, `Upload de arquivo: ${fileName} (${(buffer.length/1024).toFixed(2)} KB)`);

    res.json({ success: true, data: attachment });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ success: false, message: 'Erro interno ao processar o arquivo.' });
  }
});

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
const DB_FILE = path.join(process.env.VERCEL ? '/tmp' : process.cwd(), 'ceet_database.json');

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
  patrimonies: Patrimony[];
  maintenances: Maintenance[];
  locations: Location[];
  students: Student[];
  class_groups: ClassGroup[];
  lessons: Lesson[];
  loans: Loan[];
  occurrences: Occurrence[];
  support_tickets: SupportTicket[];
  support_messages: SupportMessage[];
  remote_access_requests: RemoteAccessRequest[];
}

let db: CEETDatabase;

async function loadDatabase(): Promise<void> {
  const defaultDb: CEETDatabase = {
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
    patrimonies: [...initialPatrimonies],
    maintenances: [],
    locations: [...initialLocations],
    students: [],
    class_groups: [...initialClassGroups],
    lessons: [],
    loans: [],
    occurrences: [],
    support_tickets: [],
    support_messages: [],
    remote_access_requests: [],
  };

  try {
    console.log('[FIREBASE] Tentando carregar dados do Cloud Firestore...');
    const loadedDb: any = { ...defaultDb };
    let hasDataInFirebase = false;

    const firestore = firebaseDb();

    // Carregar tabelas em paralelo
    const results = await Promise.all(DB_TABLES.map(table => firestore.collection(table).get()));
    
    results.forEach((snapshot, index) => {
      const table = DB_TABLES[index];
      if (!snapshot.empty) {
        loadedDb[table] = snapshot.docs.map(doc => doc.data());
        hasDataInFirebase = true;
      }
    });

    const settingsDoc = await firestore.collection('system_settings').doc('current').get();
    if (settingsDoc.exists) {
      loadedDb.settings = settingsDoc.data();
      hasDataInFirebase = true;
    }

    if (hasDataInFirebase) {
      db = loadedDb;
      console.log('[FIREBASE] Dados carregados com sucesso do Firestore.');
    } else if (fs.existsSync(DB_FILE)) {
      // 2. Fallback para arquivo local se Firebase estiver vazio
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const loaded = JSON.parse(raw);
      db = { ...defaultDb, ...loaded };
      console.log('[CEET-DB] Dados carregados do arquivo local (Firebase vazio).');
      // Sincronizar para o Firebase pela primeira vez
      await saveDatabase();
    } else {
      // 3. Seed inicial se nada existir
      console.log('[CEET-DB] Inicializando com dados padrão...');
      db = defaultDb;
      
      // Hash inicial das senhas do seed
      db.users.forEach(user => {
        if (user.password && !user.password.startsWith('$2')) {
          user.password = bcrypt.hashSync(user.password, 10);
        }
      });

      await saveDatabase();
    }

    // Migração de senhas para Hash (Fase 0 - Segurança Real) se necessário
    let hashCount = 0;
    db.users.forEach(user => {
      if (user.password && !user.password.startsWith('$2')) {
        user.password = bcrypt.hashSync(user.password, 10);
        hashCount++;
      }
    });
    if (hashCount > 0) {
      console.log(`[CEET-SECURITY] ${hashCount} senhas migrando para Hash seguro...`);
      await saveDatabase();
    }

  } catch (error) {
    console.error('[CEET-DB] Erro ao carregar banco de dados:', error);
    db = defaultDb;
  }
}

// Função auxiliar para remover campos 'undefined' que o Firestore não aceita
function sanitizeData(data: any): any {
  if (data === null || typeof data !== 'object') {
    return data === undefined ? null : data;
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  const result: any = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      if (value !== undefined) {
        result[key] = sanitizeData(value);
      }
    }
  }
  return result;
}

async function saveDatabase(): Promise<void> {
  try {
    // 1. Salvar localmente por segurança/cache
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    
    // 2. Sincronizar com Firestore
    const firestore = firebaseDb();

    for (const table of DB_TABLES) {
      const tableData = db[table as keyof CEETDatabase] as any[];
      if (tableData && tableData.length > 0) {
        // Firestore batches têm limite de 500 operações. Vamos chunkar.
        const CHUNK_SIZE = 450;
        for (let i = 0; i < tableData.length; i += CHUNK_SIZE) {
          const chunk = tableData.slice(i, i + CHUNK_SIZE);
          const batch = firestore.batch();
          
          chunk.forEach(item => {
            const docId = item.id ? String(item.id) : undefined;
            if (docId) {
              const docRef = firestore.collection(table).doc(docId);
              // Sanitizar o item antes de salvar no Firestore
              batch.set(docRef, sanitizeData(item));
            }
          });
          
          await batch.commit();
        }
      }
    }

    // Configurações (settings)
    await firestore.collection('system_settings').doc('current').set(sanitizeData(db.settings));

  } catch (error) {
    console.error('[CEET-DB] Falha ao salvar no banco de dados:', error);
  }
}



async function persistUserProfileToFirestore(user: User): Promise<void> {
  const firestore = firebaseDb();
  await firestore.collection('users').doc(String(user.id)).set(sanitizeData(user));
}

// Função de auditoria (RN-010, RN-048)
async function addAuditLog(
  userId: number,
  userName: string,
  userRole: User['role'],
  ip: string,
  action: string,
  entity: string,
  entityId: string | number | undefined,
  details: string,
  result: 'SUCESSO' | 'FALHA' = 'SUCESSO'
): Promise<void> {
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
  await saveDatabase();
}

// ==========================================
// ROTAS DA API REST (/api/v1/*) - Cap. 9
// ==========================================

// 1. AUTENTICAÇÃO (/api/v1/auth/login) - TEL-001 / UC-001 / PROMPT MESTRE CEET
app.post('/api/v1/auth/login', async (req: Request, res: Response) => {
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
    await addAuditLog(0, email, 'ADMIN', ip, 'LOGIN', 'Sessão', undefined, 'Tentativa de login recusada: Conta não cadastrada pelo Administrador Geral', 'FALHA');
    return res.status(401).json({
      success: false,
      message: 'Acesso negado. Esta conta não está cadastrada. Somente o Administrador Geral pode autorizar seu acesso ao sistema.',
      code: 'UNAUTHORIZED',
    });
  }

  // Verificar status do usuário (Ativo, Inativo, Bloqueado, Pendente, Afastado, Desligado)
  if (user.status && user.status !== 'Ativo') {
    await addAuditLog(user.id, user.name, user.role, ip, 'LOGIN_RECUSADO', 'Sessão', user.id, `Tentativa em conta com status [${user.status}]`, 'FALHA');
    return res.status(403).json({
      success: false,
      message: `Acesso bloqueado. O status atual da sua conta é "${user.status}". Entre em contato com o Administrador Geral do CEET para liberação.`,
      code: 'ACCOUNT_INACTIVE',
    });
  }

  if (user.active === false) {
    await addAuditLog(user.id, user.name, user.role, ip, 'LOGIN_RECUSADO', 'Sessão', user.id, 'Tentativa de login em conta desativada', 'FALHA');
    return res.status(403).json({
      success: false,
      message: 'Conta desativada pelo Administrador Geral.',
      code: 'ACCOUNT_DISABLED',
    });
  }

  // Verificar se conta está bloqueada (proteção anti-brute force)
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minLeft = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
    await addAuditLog(user.id, user.name, user.role, ip, 'LOGIN_BLOQUEADO', 'Sessão', user.id, `Tentativa em conta temporariamente bloqueada por segurança (${minLeft} min)`, 'FALHA');
    return res.status(403).json({
      success: false,
      message: `Conta temporariamente bloqueada por segurança. Tente novamente em ${minLeft} minutos ou solicite o desbloqueio ao Administrador Geral.`,
      code: 'ACCOUNT_LOCKED',
    });
  }

  // Autenticação principal: Firebase Authentication para contas provisionadas pelo ADMIN.
  // O fallback legado mantém o acesso do Super Admin/instalações antigas durante a migração.
  let firebaseAuthenticated = false;
  if (user.firebase_uid) {
    try {
      const firebaseSession = await signInFirebaseUser(user.email, password);
      firebaseAuthenticated = firebaseSession.localId === user.firebase_uid;
    } catch (firebaseError: any) {
      firebaseAuthenticated = false;
    }
  }

  // Fallback apenas para contas legadas ainda sem vínculo Firebase.
  const isPasswordCorrect = !user.firebase_uid && user.password ? bcrypt.compareSync(password, user.password) : false;
  const isTemporaryCorrect = !user.firebase_uid && user.temporary_password ? (password === user.temporary_password) : false;

  if (!firebaseAuthenticated && !isPasswordCorrect && !isTemporaryCorrect) {
    user.failed_attempts = (user.failed_attempts || 0) + 1;
    if (user.failed_attempts >= 5) {
      user.status = 'Bloqueado';
      user.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // Bloqueia por 15 min
      await addAuditLog(user.id, user.name, user.role, ip, 'BLOQUEIO_SEGURANCA', 'Sessão', user.id, 'Conta bloqueada após 5 tentativas falhas seguidas', 'FALHA');
    } else {
      await addAuditLog(user.id, user.name, user.role, ip, 'LOGIN_FALHA', 'Sessão', user.id, `Senha incorreta (Tentativa ${user.failed_attempts}/5)`, 'FALHA');
    }
    await saveDatabase();
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
  await saveDatabase();

  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  await addAuditLog(user.id, user.name, user.role, ip, 'LOGIN_SUCESSO', 'Sessão', user.id, `Login efetuado com sucesso via JWT (Perfil: ${user.role})`, 'SUCESSO');

  return res.status(200).json({
    success: true,
    message: user.must_change_password
      ? 'Primeiro acesso detectado! É necessário cadastrar sua nova senha individual para prosseguir.'
      : 'Login realizado com sucesso.',
    must_change_password: Boolean(user.must_change_password),
    data: {
      accessToken: token,
      user: sanitizeUser(user),
      expiresIn: 28800, // 8h em segundos
    },
  });
});

app.post('/api/v1/auth/change-password', async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const user = (req as any).user as User;
  const ip = req.ip || '127.0.0.1';

  // Validação de senha forte (mínimo 8 caracteres, maiúscula, minúscula, número e caractere especial)
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=-]).{8,}$/;
  if (!strongRegex.test(newPassword)) {
    return res.status(400).json({
      success: false,
      message: 'A nova senha deve ter no mínimo 8 caracteres, contendo letra maiúscula, minúscula, número e caractere especial (@$!%*?&).',
    });
  }

  if (user.firebase_uid) {
    try {
      await changeFirebaseUserPassword(user.email, currentPassword, newPassword);
    } catch (error: any) {
      return res.status(401).json({ success: false, message: error?.message || 'Senha atual incorreta ou não foi possível atualizar a senha no Firebase Authentication.', code: 'FIREBASE_AUTH_PASSWORD_FAILED' });
    }
  } else {
    const isCorrect = user.password ? bcrypt.compareSync(currentPassword, user.password) : false;
    const isTempCorrect = user.temporary_password ? (currentPassword === user.temporary_password) : false;
    if (!isCorrect && !isTempCorrect) {
      return res.status(401).json({ success: false, message: 'Senha atual incorreta.' });
    }
    user.password = bcrypt.hashSync(newPassword, 10);
  }

  user.temporary_password = undefined;
  user.must_change_password = false;
  user.last_password_change = new Date().toISOString();
  await addAuditLog(user.id, user.name, user.role, ip, 'ALTERAR_SENHA', 'Usuário', user.id, 'Alteração para nova senha forte (Conformidade Institucional CEET)', 'SUCESSO');
  await saveDatabase();

  return res.json({
    success: true,
    message: 'Senha forte atualizada com segurança!',
  });
});

app.get('/api/v1/auth/me', async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  res.json({ success: true, data: sanitizeUser(user) });
});

// BACKUP E RESTAURAÇÃO DO BANCO DE DADOS CEET (/api/v1/backup/*) - Protegido (RN-029)
app.get('/api/v1/backup/export', authorize(['ADMIN']), async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const ip = req.ip || '127.0.0.1';
  
  const exportData = {
    system: 'Sistema de Estoque de Enfermagem CEET',
    version: '1.0.0',
    export_date: new Date().toISOString(),
    institution: 'CEET Giuseppe Altoé',
    database: db,
  };

  await addAuditLog(user.id, user.name, user.role, ip, 'BACKUP_EXPORT', 'Banco de Dados', undefined, 'Exportação de backup do banco de dados institucional realizada por administrador', 'SUCESSO');
  
  res.header('Content-Type', 'application/json');
  res.header('Content-Disposition', `attachment; filename="ceet-backup-${Date.now()}.json"`);
  res.send(JSON.stringify(exportData, null, 2));
});

app.post('/api/v1/backup/restore', authorize(['ADMIN']), async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const ip = req.ip || '127.0.0.1';
  const { database } = req.body;
  
  if (!database || !database.users || !database.products) {
    return res.status(400).json({ success: false, message: 'Arquivo de backup inválido ou incompatível.' });
  }

  // Backup do estado atual antes de restaurar (Fase 7 requirement)
  try {
    const currentBackupPath = path.join(process.cwd(), `ceet_database_pre_restore_${Date.now()}.json`);
    fs.writeFileSync(currentBackupPath, JSON.stringify(db, null, 2));
    
    db = database;
    await saveDatabase();
    
    await addAuditLog(user.id, user.name, user.role, ip, 'BACKUP_RESTORE', 'Banco de Dados', undefined, 'Restauração de banco de dados concluída com sucesso. Backup prévio salvo.', 'SUCESSO');
    return res.json({ success: true, message: 'Banco de dados restaurado com sucesso!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erro ao restaurar banco de dados.' });
  }
});

// RESET DE ESTOQUE (RN-RESET)
app.post('/api/v1/stock/reset', authorize(['ADMIN', 'ESTOQUE', 'PROFESSOR', 'COORDENACAO']), async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const ip = req.ip || '127.0.0.1';

  console.log(`[CEET-RESET] Reset solicitado por ${user.name} (${user.email})`);
  
  // Reset total: Deletar produtos e todo o acervo operacional
  // Usando splice para garantir que referências em outros lugares (se houver) sejam limpas
  if (db.products) db.products.splice(0, db.products.length);
  if (db.batches) db.batches.splice(0, db.batches.length);
  if (db.movements) db.movements.splice(0, db.movements.length);
  if (db.entries) db.entries.splice(0, db.entries.length);
  if (db.outputs) db.outputs.splice(0, db.outputs.length);
  if (db.inventories) db.inventories.splice(0, db.inventories.length);
  if (db.patrimonies) db.patrimonies.splice(0, db.patrimonies.length);
  if (db.loans) db.loans.splice(0, db.loans.length);
  if (db.occurrences) db.occurrences.splice(0, db.occurrences.length);
  if (db.maintenances) db.maintenances.splice(0, db.maintenances.length);

  await addAuditLog(user.id, user.name, user.role, ip, 'RESETAR_ESTOQUE', 'Estoque', 0, `Realizou o reset total do sistema. Todos os produtos e históricos foram excluídos.`);
  await saveDatabase();

  console.log(`[CEET-RESET] Reset concluído. Itens no banco: ${db.products.length} produtos.`);

  res.json({ success: true, message: 'Sistema resetado com sucesso! Todos os produtos e históricos foram excluídos para um novo cadastro.' });
});

// 2. PRODUTOS (/api/v1/products) - RF-001 / RN-001 a RN-005
app.get('/api/v1/products', async (req: Request, res: Response) => {
  const { search, category_id, manufacturer_id, status } = req.query;

  let filtered = db.products.filter((p) => p.active);

  if (search) {
    const q = String(search).toLowerCase().trim();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.location && p.location.toLowerCase().includes(q))
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
    const loc = db.locations.find((l) => l.id === p.location_id);
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
      location: loc ? loc.name : (p.location || 'Não Definido'),
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

app.get('/api/v1/products/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const p = db.products.find((prod) => prod.id === id);
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

app.post('/api/v1/products', authorize(['ADMIN', 'ESTOQUE']), async (req: Request, res: Response) => {
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
    location_id,
    barcode,
    image,
    attachments,
  } = req.body;
  const ip = req.ip || '127.0.0.1';
  const user = (req as any).user as User;
  const userId = user.id;

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
    location: location ? location.trim() : undefined,
    location_id: location_id ? Number(location_id) : undefined,
    barcode: barcode || undefined,
    image: image || undefined,
    attachments: attachments || [],
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.products.push(newProduct);
  await addAuditLog(user.id, user.name, user.role, ip, 'CADASTRAR_PRODUTO', 'Produto', newProduct.id, `Criou produto [${newProduct.code}] ${newProduct.name}`);
  await saveDatabase();

  res.status(201).json({
    success: true,
    message: 'Produto cadastrado com sucesso!',
    data: newProduct,
  });
});

app.put('/api/v1/products/:id', authorize(['ADMIN', 'ESTOQUE']), async (req: Request, res: Response) => {
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
    location_id,
    barcode,
    image,
    attachments,
  } = req.body;
  const ip = req.ip || '127.0.0.1';
  const user = (req as any).user as User;
  const userId = user.id;

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
  prod.location_id = location_id ? Number(location_id) : prod.location_id;
  prod.barcode = barcode;
  prod.image = image !== undefined ? image : prod.image;
  prod.attachments = attachments !== undefined ? attachments : prod.attachments;
  prod.updated_at = new Date().toISOString();

  await addAuditLog(user.id, user.name, user.role, ip, 'EDITAR_PRODUTO', 'Produto', prod.id, `Atualizou produto [${prod.code}] ${prod.name}`);
  await saveDatabase();

  res.json({ success: true, message: 'Produto atualizado com sucesso!', data: prod });
});

app.delete('/api/v1/products/:id', authorize(['ADMIN', 'ESTOQUE', 'PROFESSOR', 'COORDENACAO']), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const ip = req.ip || '127.0.0.1';
  const user = (req as any).user as User;

  const index = db.products.findIndex((p) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
  }

  const prod = db.products[index];
  
  // Exclusão FÍSICA conforme solicitado pelo usuário ("apague os produtos")
  db.products.splice(index, 1);
  
  // Limpar lotes vinculados também para não deixar lixo
  db.batches = db.batches.filter(b => b.product_id !== id);

  await addAuditLog(user.id, user.name, user.role, ip, 'EXCLUIR_PRODUTO', 'Produto', id, `Exclusão definitiva do produto [${prod.code}] ${prod.name}`);
  await saveDatabase();

  res.json({ success: true, message: 'Produto excluído permanentemente do sistema.' });
});

// 3. CATEGORIAS (/api/v1/categories) - RF-002
app.get('/api/v1/categories', async (_req: Request, res: Response) => {
  const enriched = db.categories.map((c) => ({
    ...c,
    products_count: db.products.filter((p) => p.category_id === c.id && p.active).length,
  }));
  res.json({ success: true, data: enriched });
});

app.post('/api/v1/categories', async (req: Request, res: Response) => {
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
  await saveDatabase();
  res.status(201).json({ success: true, message: 'Categoria cadastrada com sucesso!', data: newCat });
});

app.put('/api/v1/categories/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name, description, color, active } = req.body;
  const idx = db.categories.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Categoria não encontrada.' });
  
  db.categories[idx] = { ...db.categories[idx], name: name || db.categories[idx].name, description, color, active: active !== undefined ? active : db.categories[idx].active };
  await saveDatabase();
  res.json({ success: true, message: 'Categoria atualizada com sucesso!', data: db.categories[idx] });
});

app.delete('/api/v1/categories/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const idx = db.categories.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Categoria não encontrada.' });
  
  // Inativação ao invés de exclusão física para manter integridade
  db.categories[idx].active = false;
  await saveDatabase();
  res.json({ success: true, message: 'Categoria inativada com sucesso.' });
});

// 4. FABRICANTES (/api/v1/manufacturers) - RF-003
app.get('/api/v1/manufacturers', async (_req: Request, res: Response) => {
  res.json({ success: true, data: db.manufacturers });
});

app.post('/api/v1/manufacturers', async (req: Request, res: Response) => {
  const { name, cnpj, phone, email, address, country } = req.body;
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
    country: country || 'Brasil',
    active: true,
  };
  db.manufacturers.push(newMan);
  await saveDatabase();
  res.status(201).json({ success: true, message: 'Fabricante adicionado com sucesso!', data: newMan });
});

app.put('/api/v1/manufacturers/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const idx = db.manufacturers.findIndex(m => m.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Fabricante não encontrado.' });
  
  db.manufacturers[idx] = { ...db.manufacturers[idx], ...req.body };
  await saveDatabase();
  res.json({ success: true, message: 'Fabricante atualizado com sucesso!', data: db.manufacturers[idx] });
});

app.delete('/api/v1/manufacturers/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const idx = db.manufacturers.findIndex(m => m.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Fabricante não encontrado.' });
  
  db.manufacturers[idx].active = false;
  await saveDatabase();
  res.json({ success: true, message: 'Fabricante inativado com sucesso.' });
});

// 5. FORNECEDORES (/api/v1/suppliers) - RF-004
app.get('/api/v1/suppliers', async (_req: Request, res: Response) => {
  res.json({ success: true, data: db.suppliers.filter((s) => s.active) });
});

app.post('/api/v1/suppliers', async (req: Request, res: Response) => {
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
  await saveDatabase();
  res.status(201).json({ success: true, message: 'Fornecedor cadastrado com sucesso!', data: newSup });
});

app.put('/api/v1/suppliers/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const idx = db.suppliers.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Fornecedor não encontrado.' });
  
  db.suppliers[idx] = { ...db.suppliers[idx], ...req.body };
  await saveDatabase();
  res.json({ success: true, message: 'Fornecedor atualizado com sucesso!', data: db.suppliers[idx] });
});

app.delete('/api/v1/suppliers/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const idx = db.suppliers.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Fornecedor não encontrado.' });
  
  db.suppliers[idx].active = false;
  await saveDatabase();
  res.json({ success: true, message: 'Fornecedor inativado com sucesso.' });
});

// 6. UNIDADES DE MEDIDA (/api/v1/units)
app.get('/api/v1/units', async (_req: Request, res: Response) => {
  res.json({ success: true, data: db.units });
});

// 7. ENTRADAS DE ESTOQUE (/api/v1/stock/entries) - RF-005 / TEL-008
app.post('/api/v1/stock/entries', authorize(['ADMIN', 'ESTOQUE']), async (req: Request, res: Response) => {
  const { supplier_id, invoice_number, items, observations } = req.body;
  const ip = req.ip || '127.0.0.1';
  const user = (req as any).user as User;
  const userId = user.id;

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

  await addAuditLog(user.id, user.name, user.role, ip, 'REGISTRAR_ENTRADA', 'Estoque', entry.id, `Entrada NF ${entry.invoice_number} com ${items.length} produto(s)`);
  await saveDatabase();

  res.status(201).json({
    success: true,
    message: 'Entrada de estoque registrada com sucesso!',
    data: entry,
  });
});

app.get('/api/v1/stock/entries', async (_req: Request, res: Response) => {
  res.json({ success: true, data: db.entries });
});

// 8. SAÍDAS DE ESTOQUE (/api/v1/stock/outputs) - RF-006 / RN-005 / TEL-009
app.post('/api/v1/stock/outputs', authorize(['ADMIN', 'ESTOQUE', 'PROFESSOR']), async (req: Request, res: Response) => {
  const { destination_sector, reason, items } = req.body;
  const ip = req.ip || '127.0.0.1';
  const user = (req as any).user as User;
  const userId = user.id;

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
      await addAuditLog(
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
      // Abater automaticamente pelo FEFO / FIFO (Conforme RN-016 e Configurações)
      const sortedBatches = db.batches
        .filter((b) => b.product_id === prod.id && b.quantity > 0)
        .sort((a, b) => {
          if (db.settings.fifo_mode) {
            return a.id - b.id; // FIFO: Primeiro que entra, primeiro que sai
          }
          return new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime(); // FEFO: Primeiro que vence, primeiro que sai
        });
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

  await addAuditLog(user.id, user.name, user.role, ip, 'REGISTRAR_SAIDA', 'Estoque', output.id, `Saída para setor ${destination_sector} com ${items.length} produto(s)`);
  await saveDatabase();

  res.status(201).json({
    success: true,
    message: 'Saída de estoque registrada com sucesso!',
    data: output,
  });
});

app.get('/api/v1/stock/outputs', async (_req: Request, res: Response) => {
  res.json({ success: true, data: db.outputs });
});

// 9. HISTÓRICO DE MOVIMENTAÇÕES (/api/v1/stock/movements) - TEL-011 / RN-042 / RN-043
app.get('/api/v1/stock/movements', async (req: Request, res: Response) => {
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
app.get('/api/v1/inventories', async (_req: Request, res: Response) => {
  res.json({ success: true, data: db.inventories });
});

app.post('/api/v1/inventories', authorize(['ADMIN', 'ESTOQUE']), async (req: Request, res: Response) => {
  const { observations, items } = req.body;
  const ip = req.ip || '127.0.0.1';
  const user = (req as any).user as User;
  const userId = user.id;

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

  await addAuditLog(user.id, user.name, user.role, ip, 'REALIZAR_INVENTARIO', 'Estoque', inventory.id, `Inventário físico #${inventory.id} realizado (${items.length} itens conferidos)`);
  await saveDatabase();

  res.status(201).json({ success: true, message: 'Conferência de Inventário salva com sucesso!', data: inventory });
});

// 11. DASHBOARD E INDICADORES (/api/v1/dashboard) - TEL-002
app.get('/api/v1/dashboard', async (_req: Request, res: Response) => {
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

  // Fluxo de movimentação mensal REAL (últimos 6 meses)
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const nowMonth = new Date().getMonth();
  const monthly_flow_chart = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(nowMonth - i);
    const mLabel = months[d.getMonth()];
    const mYear = d.getFullYear();
    const mMonth = d.getMonth();

    const monthEntries = db.movements.filter(m => {
      const md = new Date(m.created_at);
      return md.getMonth() === mMonth && md.getFullYear() === mYear && m.movement_type === 'ENTRADA';
    }).reduce((acc, m) => acc + m.quantity, 0);

    const monthOutputs = db.movements.filter(m => {
      const md = new Date(m.created_at);
      return md.getMonth() === mMonth && md.getFullYear() === mYear && m.movement_type === 'SAIDA';
    }).reduce((acc, m) => acc + m.quantity, 0);

    monthly_flow_chart.push({ month: mLabel, entradas: monthEntries, saidas: monthOutputs });
  }

  const total_patrimony_items = db.patrimonies.length;
  const active_loans_count = db.loans.filter(l => l.status === 'Ativo' || l.status === 'Atrasado' || l.status === 'Devolução parcial').length;
  const pending_maintenances_count = db.maintenances.filter(m => m.status !== 'Atendido' && m.status !== 'Cancelado').length;

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
    total_patrimony_items,
    active_loans_count,
    pending_maintenances_count,
  };

  res.json({ success: true, data: stats });
});

// 12. SUGESTÃO DE COMPRAS (/api/v1/purchases/suggestions) - TEL-012 / RN-020
app.get('/api/v1/purchases/suggestions', async (_req: Request, res: Response) => {
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
app.get('/api/v1/audit', authorize(['ADMIN']), async (req: Request, res: Response) => {
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

  // Ordenar decrescente (mais recentes primeiro)
  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({ success: true, data: filtered });
});


// IA CEET CORE - Centralização de Inteligência Artificial (Ollama Local com Fallback Cloud)
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

let geminiClient: GoogleGenAI | null = null;
let groqClient: Groq | null = null;

function getGroqClient() {
  if (!groqClient) {
    const apiKey = process.env.enfermagemceet || process.env.GROQ_API_KEY;
    if (apiKey && apiKey !== 'undefined' && apiKey.trim()) {
      console.log('[AI Core] Inicializando Groq SDK...');
      groqClient = new Groq({ apiKey });
    }
  }
  return groqClient;
}

function getGeminiClient() {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'undefined' || !apiKey.trim()) {
      throw new Error('GEMINI_API_KEY não configurada ou inválida no ambiente.');
    }
    
    // Se a chave começar com AQ., tratamos como um accessToken (comum em alguns ambientes do AI Studio)
    const isToken = apiKey.startsWith('AQ.');
    
    geminiClient = new GoogleGenAI({
      apiKey: isToken ? "" : apiKey, // Omitir apiKey se for token para não conflitar com Authorization header
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
          ...(isToken ? { 'Authorization': `Bearer ${apiKey}` } : {})
        }
      }
    });
  }
  return geminiClient;
}

async function callAI(messages: any[], context: string, data: any, user: User) {
  // 1. Tentar Ollama primeiro (IA Local solicitada)
  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: messages,
        stream: false,
        options: { temperature: 0.2 }
      })
    });

    if (response.ok) {
      const result = await response.json();
      return `[Engine: Ollama/${OLLAMA_MODEL}]\n\n${result.message.content}`;
    }
  } catch (ollamaError) {
    // Falha silenciosa para o Ollama
  }

  // 2. Tentar Groq (IA solicitada via chave 'enfermagemceet')
  try {
    const groq = getGroqClient();
    if (groq) {
      console.log('[AI Core] Chamando Groq (Qwen)...');
      const systemMsg = messages.find(m => m.role === 'system')?.content || '';
      const userMsg = messages.find(m => m.role === 'user')?.content || '';
      
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userMsg }
        ],
        model: 'qwen/qwen3.6-27b',
        temperature: 0.5,
      });

      if (chatCompletion.choices[0]?.message?.content) {
        console.log('[AI Core] Resposta recebida via Groq.');
        return `[Engine: Groq/Qwen]\n\n${chatCompletion.choices[0].message.content}`;
      }
    }
  } catch (groqError: any) {
    console.error('[AI Core] Erro no Groq:', groqError.message);
  }

  // 3. Fallback para Gemini se os outros falharem
  try {
    const aiInstance = getGeminiClient();
    const systemInstruction = messages.find(m => m.role === 'system')?.content || '';
    const userPrompt = messages.find(m => m.role === 'user')?.content || '';
 
    // Lista de modelos para tentar (do mais novo/potente para o mais estável)
    const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        const result = await aiInstance.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          config: {
            systemInstruction: systemInstruction,
            tools: [{
              functionDeclarations: [{
                name: "create_support_ticket",
                description: "Abre um novo chamado de suporte técnico no sistema CEET quando o usuário relata um problema ou dúvida.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "Título curto do problema." },
                    description: { type: Type.STRING, description: "Descrição detalhada." },
                    category: { 
                      type: Type.STRING, 
                      description: "Categoria do chamado.",
                      enum: ["Sistema", "Cadastro", "Relatórios", "Estoque", "Login", "Hardware"]
                    },
                    priority: {
                      type: Type.STRING,
                      description: "Prioridade do chamado.",
                      enum: ["Baixa", "Média", "Alta", "Crítica"]
                    }
                  },
                  required: ["title", "description"]
                }
              }]
            }]
          }
        });

        const functionCalls = result.functionCalls;

        if (functionCalls && functionCalls.length > 0) {
          const call = functionCalls[0];
          if (call.name === 'create_support_ticket') {
            const args = call.args as any;
            
            const newTicket: SupportTicket = {
              id: db.support_tickets.length ? Math.max(...db.support_tickets.map(t => t.id)) + 1 : 1,
              ticket_number: `SUP-${new Date().getFullYear()}-${(db.support_tickets.length + 1).toString().padStart(6, '0')}`,
              user_id: user.id,
              user_name: user.name,
              title: args.title,
              description: args.description,
              category: args.category || 'Sistema',
              priority: args.priority || 'Média',
              status: 'Aberto',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            db.support_tickets.push(newTicket);
            await addAuditLog(user.id, user.name, user.role, '127.0.0.1', 'ABRIR_CHAMADO', 'Suporte', newTicket.id, `Chamado [${newTicket.ticket_number}] aberto via IA Assistant`);
            await saveDatabase();

            const followUp = await aiInstance.models.generateContent({
              model: modelName,
              contents: [
                { role: 'user', parts: [{ text: userPrompt }] },
                { role: 'model', parts: [{ functionCall: call }] },
                {
                  role: 'user',
                  parts: [{
                    functionResponse: {
                      name: 'create_support_ticket',
                      response: { success: true, ticket_number: newTicket.ticket_number, message: "Chamado aberto com sucesso." }
                    }
                  }]
                }
              ],
              config: { systemInstruction }
            });
            
            return `[Engine: Gemini ${modelName}]\n\n${followUp.text}`;
          }
        }

        if (result.text) {
          return `[Engine: Gemini ${modelName}]\n\n${result.text}`;
        }
      } catch (err: any) {
        lastError = err;
        console.error(`Erro com modelo ${modelName}:`, err.message);
        // Se for erro de autenticação/bloqueio, não adianta tentar outros modelos, mas vamos tentar mesmo assim por precaução
        if (err.message.includes("401") || err.message.includes("blocked")) continue;
      }
    }

    throw lastError || new Error('Não foi possível obter resposta de nenhum modelo Gemini.');
  } catch (geminiError: any) {
    console.error('Erro crítico no Gemini:', geminiError);
    throw new Error(`Falha na IA: ${geminiError.message}`);
  }
}

// Mapeamento das funções para os dados reais do banco
const aiTools = {
  consultarEstoque: (args: any) => {
    let list = db.products;
    if (args.filtro) {
      const f = args.filtro.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(f) || (p.category_name && p.category_name.toLowerCase().includes(f)));
    }
    return list.slice(0, 50).map(p => ({
      id: p.id,
      nome: p.name,
      estoque: p.current_stock,
      minimo: p.minimum_stock,
      status: p.current_stock <= p.minimum_stock ? 'CRÍTICO' : 'NORMAL'
    }));
  },
  consultarPatrimonio: (args: any) => {
    let list = db.patrimonies;
    if (args.status) list = list.filter(p => p.condition === args.status);
    return list.slice(0, 50).map(p => ({
      id: p.id,
      tag: p.patrimony_code,
      nome: p.name,
      condicao: p.condition
    }));
  },
  consultarEmprestimos: () => {
    return db.loans.filter(l => l.status === 'Ativo').map(l => ({
      id: l.id,
      codigo: l.loan_code,
      items: l.items.length,
      data: l.loan_date
    }));
  },
  consultarManutencao: () => {
    return db.maintenances.map(m => ({
      id: m.id,
      status: m.status,
      tipo: m.type,
      data_saida: m.send_date
    }));
  },
  consultarAuditoria: (args: any) => {
    return db.auditLogs.slice(-(args.limite || 50));
  }
};

// Endpoint Centralizado - CEET IA CORE
app.post('/api/v1/ai/analyze', authenticate, async (req: Request, res: Response) => {
  const { prompt: userPrompt, category, context, data: initialData } = req.body;

  try {
    const systemInstruction = `
      Você é o "CEET IA Core", o núcleo de inteligência artificial centralizado do Sistema de Enfermagem CEET.
      Sua missão é auxiliar coordenadores, professores e administradores com insights precisos sobre a operação.
      
      Diretrizes:
      - Seja profissional, executivo e técnico.
      - Responda em Português (Brasil) usando Markdown.
      - Se identificar problemas graves (estoque zerado, muitos itens em manutenção), destaque com emojis de alerta.
      - Respeite o contexto: ${context || 'Geral'}.
      - Se o usuário não puder acessar algo (baseado no cargo), você não deve fornecer.
      - Você pode abrir chamados de suporte técnico usando a ferramenta "create_support_ticket" quando necessário.
      
      DADOS DISPONÍVEIS PARA ESTA CONSULTA:
      ${JSON.stringify(initialData || {})}
      
      INFORMAÇÕES ADICIONAIS DO SISTEMA:
      - Estoque Resumo: ${JSON.stringify(aiTools.consultarEstoque({}))}
      - Manutenção Resumo: ${JSON.stringify(aiTools.consultarManutencao())}
      - Empréstimos Ativos: ${JSON.stringify(aiTools.consultarEmprestimos())}
    `;

    const messages = [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: userPrompt || `Analise os dados atuais do contexto ${category}.` }
    ];

    const analysis = await callAI(messages, context, initialData, (req as any).user);

    if (!analysis) {
      throw new Error('O motor de IA não retornou nenhuma análise.');
    }

    res.json({ success: true, analysis: analysis });
  } catch (error: any) {
    console.error('Erro no CEET IA Core:', error);
    const errorMessage = error.message || (typeof error === 'string' ? error : 'Erro desconhecido');
    res.status(500).json({ success: false, message: 'Falha na IA: ' + errorMessage });
  }
});


// 14. GERENCIAMENTO DE USUÁRIOS E AUTORIZAÇÕES (/api/v1/users) - PROMPT MESTRE
app.get('/api/v1/users', authorize(['ADMIN']), async (_req: Request, res: Response) => {
  // Remover senhas das respostas (Fase 0)
  const sanitizedUsers = db.users.map(u => sanitizeUser(u));
  res.json({ success: true, data: sanitizedUsers });
});

app.post('/api/v1/users', authorize(['ADMIN']), async (req: Request, res: Response) => {
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
    photo_url,
  } = req.body;
  const adminUser = (req as any).user as User;
  const ip = req.ip || '127.0.0.1';

  if (!name?.trim() || !email?.trim() || !role) {
    return res.status(400).json({ success: false, message: 'Nome completo, e-mail e nível de acesso são obrigatórios.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ success: false, message: 'Informe um e-mail institucional válido.' });
  }

  if (!['ADMIN', 'ESTOQUE', 'PROFESSOR', 'COORDENACAO', 'FUNCIONARIO', 'ESTAGIARIO', 'TECNICO'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Perfil RBAC inválido.' });
  }

  const existing = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return res.status(409).json({ success: false, message: 'Já existe uma conta cadastrada com este e-mail institucional.' });
  }

  const tempPass = String(temporary_password || 'Ceet@2026!').trim();
  if (tempPass.length < 6) {
    return res.status(400).json({ success: false, message: 'A senha temporária deve possuir pelo menos 6 caracteres.' });
  }

  const userStatus = (status as User['status']) || 'Ativo';
  const active = userStatus === 'Ativo';

  let firebaseUser: any;
  try {
    firebaseUser = await createFirebaseUser({
      email: normalizedEmail,
      password: tempPass,
      displayName: name.trim(),
      photoUrl: photo_url || undefined,
      disabled: !active,
    });
  } catch (error: any) {
    console.error('[FIREBASE-AUTH] Erro ao criar servidor:', error);
    const code = String(error?.code || '');
    if (code.includes('EMAIL_EXISTS')) {
      return res.status(409).json({ success: false, message: 'Este e-mail já possui uma conta no Firebase Authentication. Vincule o usuário existente ou utilize outro e-mail.', code: 'EMAIL_EXISTS' });
    }
    return res.status(503).json({
      success: false,
      message: `Não foi possível criar a conta no Firebase Authentication. ${error?.message || 'Verifique as credenciais do Firebase Admin.'}`,
      code: 'FIREBASE_ADMIN_UNAVAILABLE',
    });
  }

  const newU: User = {
    id: db.users.length ? Math.max(...db.users.map((u) => u.id)) + 1 : 1,
    name: name.trim(),
    email: normalizedEmail,
    role: role as User['role'],
    cpf: cpf ? String(cpf).trim() : undefined,
    registration_number: registration_number ? String(registration_number).trim() : undefined,
    phone: phone ? String(phone).trim() : undefined,
    department: department ? String(department).trim() : undefined,
    function_title: function_title ? String(function_title).trim() : undefined,
    user_type: (user_type as User['user_type']) || 'Servidor',
    status: userStatus,
    active,
    created_at: new Date().toISOString(),
    firebase_uid: firebaseUser.localId,
    // Não armazenar a senha do Firebase no Firestore/local.
    must_change_password: false,
    notes: notes ? String(notes).trim() : undefined,
    failed_attempts: 0,
    permissions: permissions || ['Dashboard', 'Produtos', 'Relatórios'],
    photo_url: photo_url || undefined,
  };

  try {
    db.users.push(newU);
    await persistUserProfileToFirestore(newU);
    await addAuditLog(
      adminUser.id,
      adminUser.name,
      adminUser.role,
      ip,
      'CADASTRAR_USUARIO',
      'Usuário',
      newU.id,
      `ADMIN cadastrou servidor [${newU.name} - ${newU.email}] no Firebase Authentication e Firestore`
    );
    await saveDatabase();

    res.status(201).json({
      success: true,
      message: `Servidor ${newU.name} cadastrado no Firebase e autorizado imediatamente para uso do sistema.`,
      data: sanitizeUser(newU),
    });
  } catch (error: any) {
    // Se Firestore falhar depois do Auth, não deixe uma conta órfã no Authentication.
    try { await deleteFirebaseUser(firebaseUser.localId, firebaseUser.idToken); } catch (rollbackError) {
      console.error('[FIREBASE-AUTH] Falha ao desfazer conta órfã:', rollbackError);
    }
    console.error('[USERS] Falha ao persistir perfil:', error);
    return res.status(500).json({ success: false, message: 'Conta criada no Firebase, mas o perfil não pôde ser salvo no Firestore. A operação foi desfeita quando possível.', code: 'USER_PROFILE_SAVE_FAILED' });
  }
});

app.put('/api/v1/users/:id', authorize(['ADMIN']), async (req: Request, res: Response) => {
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
  const adminUser = (req as any).user as User;

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

  if (target.firebase_uid) {
    try {
      await updateFirebaseUser(target.firebase_uid, {
        email: target.email,
        displayName: target.name,
        ...(target.photo_url ? { photoUrl: target.photo_url } : {}),
        ...(status ? { disableUser: target.status !== 'Ativo' } : {}),
      });
    } catch (error: any) {
      return res.status(503).json({ success: false, message: `Não foi possível sincronizar as alterações com o Firebase Authentication: ${error?.message || 'erro desconhecido'}`, code: 'FIREBASE_AUTH_UPDATE_FAILED' });
    }
  }

  await persistUserProfileToFirestore(target);
  await addAuditLog(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    ip,
    'ALTERAR_USUARIO',
    'Usuário',
    target.id,
    `Super Admin atualizou cadastro e privilégios de [${target.email}]`
  );
  await saveDatabase();

  res.json({ success: true, message: 'Cadastro de usuário atualizado com sucesso!', data: sanitizeUser(target) });
});

app.put('/api/v1/users/:id/status', authorize(['ADMIN']), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { status, active } = req.body;
  const ip = req.ip || '127.0.0.1';
  const adminUser = (req as any).user as User;

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

  if (target.firebase_uid) {
    try {
      await disableFirebaseUser(target.firebase_uid, target.status !== 'Ativo');
    } catch (error: any) {
      return res.status(503).json({ success: false, message: `Não foi possível sincronizar o status com o Firebase Authentication: ${error?.message || 'erro desconhecido'}`, code: 'FIREBASE_AUTH_STATUS_FAILED' });
    }
  }

  await persistUserProfileToFirestore(target);
  await addAuditLog(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    ip,
    'STATUS_USUARIO',
    'Usuário',
    target.id,
    `Status de [${target.email}] alterado para [${target.status}] por Super Admin`
  );
  await saveDatabase();

  res.json({ success: true, message: `Status do usuário atualizado para "${target.status}".`, data: sanitizeUser(target) });
});

app.post('/api/v1/users/:id/reset-password', authorize(['ADMIN']), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { newPassword } = req.body;
  const ip = req.ip || '127.0.0.1';
  const adminUser = (req as any).user as User;

  const target = db.users.find((u) => u.id === id);
  if (!target) return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });

  const tempPass = newPassword || 'Ceet@2026!';
  if (tempPass.length < 6) {
    return res.status(400).json({ success: false, message: 'A nova senha deve possuir pelo menos 6 caracteres.' });
  }

  if (target.firebase_uid) {
    try {
      await updateFirebaseUser(target.firebase_uid, { password: tempPass });
    } catch (error: any) {
      return res.status(503).json({ success: false, message: `Não foi possível redefinir a senha no Firebase Authentication: ${error?.message || 'erro desconhecido'}`, code: 'FIREBASE_AUTH_PASSWORD_FAILED' });
    }
  } else {
    target.password = bcrypt.hashSync(tempPass, 10);
    target.temporary_password = tempPass;
  }
  target.must_change_password = true;
  target.failed_attempts = 0;
  target.locked_until = undefined;

  await persistUserProfileToFirestore(target);
  await addAuditLog(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    ip,
    'RESET_SENHA_ADMIN',
    'Usuário',
    target.id,
    `Super Admin redefiniu a senha temporária para [${target.email}]`
  );
  await saveDatabase();

  res.json({
    success: true,
    message: `Senha redefinida com sucesso para o usuário ${target.name}. A senha temporária definida é "${tempPass}".`,
  });
});

app.delete('/api/v1/users/:id', authorize(['ADMIN']), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const ip = req.ip || '127.0.0.1';
  const adminUser = (req as any).user as User;

  if (adminUser.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Somente o Administrador Geral pode excluir usuários.' });
  }

  if (id === 1) {
    return res.status(400).json({ success: false, message: 'O Super Administrador Geral proprietário não pode ser excluído do sistema.' });
  }

  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });

  const deletedUser = db.users[idx];
  
  // Regra 10.24 e 46: Inativação em vez de exclusão física
  deletedUser.status = 'Inativo';
  deletedUser.active = false;

  await persistUserProfileToFirestore(deletedUser);
  await addAuditLog(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    ip,
    'INATIVAR_USUARIO',
    'Usuário',
    id,
    `Super Admin inativou o usuário [${deletedUser.name} - ${deletedUser.email}] do sistema (Exclusão Lógica)`
  );
  await saveDatabase();

  res.json({ success: true, message: 'Usuário inativado do sistema com sucesso.' });
});

// ==========================================
// NOVAS ROTAS (PATRIMÔNIO, AULAS, EMPRÉSTIMOS)
// ==========================================

// 16. PATRIMÔNIO (IMOBILIZADO)
app.get('/api/v1/patrimonies', async (req: Request, res: Response) => {
  const { search, category_id, location_id, status } = req.query;
  let filtered = [...db.patrimonies];

  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.patrimony_code.toLowerCase().includes(q) ||
      (p.serial_number && p.serial_number.toLowerCase().includes(q))
    );
  }

  if (category_id) filtered = filtered.filter(p => p.category_id === Number(category_id));
  if (location_id) filtered = filtered.filter(p => p.location_id === Number(location_id));
  if (status) filtered = filtered.filter(p => p.status === status);

  res.json({ success: true, data: filtered });
});

app.post('/api/v1/patrimonies', authorize(['ADMIN', 'ESTOQUE']), async (req: Request, res: Response) => {
  const ip = req.ip || '127.0.0.1';
  const user = (req as any).user as User;
  const userId = user.id;
  
  const newPatrimony: Patrimony = {
    ...req.body,
    id: db.patrimonies.length ? Math.max(...db.patrimonies.map(p => p.id)) + 1 : 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  db.patrimonies.push(newPatrimony);
  await addAuditLog(user.id, user.name, user.role, ip, 'CRIAR_PATRIMONIO', 'Patrimônio', newPatrimony.id, `Patrimônio [${newPatrimony.patrimony_code}] cadastrado`);
  await saveDatabase();
  res.status(201).json({ success: true, data: newPatrimony });
});

app.put('/api/v1/patrimonies/:id', authorize(['ADMIN', 'ESTOQUE']), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const ip = req.ip || '127.0.0.1';
  const user = (req as any).user as User;
  const userId = user.id;
  
  const idx = db.patrimonies.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Patrimônio não encontrado.' });
  
  db.patrimonies[idx] = { ...db.patrimonies[idx], ...req.body, updated_at: new Date().toISOString() };
  
  await addAuditLog(user.id, user.name, user.role, ip, 'ATUALIZAR_PATRIMONIO', 'Patrimônio', id, `Patrimônio [${db.patrimonies[idx].patrimony_code}] atualizado`);
  await saveDatabase();
  res.json({ success: true, data: db.patrimonies[idx] });
});

// 17. MANUTENÇÃO
app.get('/api/v1/maintenances', async (_req: Request, res: Response) => {
  res.json({ success: true, data: db.maintenances });
});

app.post('/api/v1/maintenances', authorize(['ADMIN', 'ESTOQUE']), async (req: Request, res: Response) => {
  const ip = req.ip || '127.0.0.1';
  const user = (req as any).user as User;
  const userId = user.id;
  
  const newMaintenance: Maintenance = {
    ...req.body,
    id: db.maintenances.length ? Math.max(...db.maintenances.map(m => m.id)) + 1 : 1,
    created_at: new Date().toISOString()
  };
  
  db.maintenances.push(newMaintenance);
  
  // Regra: Ao iniciar/agendar manutenção, atualizar status do patrimônio
  const patrimony = db.patrimonies.find(p => p.id === newMaintenance.patrimony_id);
  if (patrimony && (newMaintenance.status === 'Em atendimento')) {
    patrimony.status = 'Em manutenção';
    patrimony.updated_at = new Date().toISOString();
  }

  await addAuditLog(user.id, user.name, user.role, ip, 'REGISTRAR_MANUTENCAO', 'Manutenção', newMaintenance.id, `Manutenção registrada para patrimônio ID [${newMaintenance.patrimony_id}]`);
  await saveDatabase();
  res.status(201).json({ success: true, data: newMaintenance });
});

app.put('/api/v1/maintenances/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const ip = req.ip || '127.0.0.1';
  const userId = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1;
  const user = db.users.find((u) => u.id === userId) || db.users[0];
  
  const idx = db.maintenances.findIndex(m => m.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Manutenção não encontrada.' });
  
  const oldStatus = db.maintenances[idx].status;
  db.maintenances[idx] = { ...db.maintenances[idx], ...req.body };
  const newStatus = db.maintenances[idx].status;

  // Lógica de integração com Patrimônio
  const patrimony = db.patrimonies.find(p => p.id === db.maintenances[idx].patrimony_id);
  if (patrimony) {
    if (newStatus === 'Em atendimento') {
      patrimony.status = 'Em manutenção';
    } else if (newStatus === 'Atendido') {
      patrimony.status = 'Disponível';
      db.maintenances[idx].actual_return_date = new Date().toISOString();
    } else if (newStatus === 'Cancelado') {
      patrimony.status = 'Disponível'; // Ou volta para o anterior
    }
    patrimony.updated_at = new Date().toISOString();
  }

  await addAuditLog(user.id, user.name, user.role, ip, 'ATUALIZAR_MANUTENCAO', 'Manutenção', id, `Manutenção atualizada de ${oldStatus} para ${newStatus}`);
  await saveDatabase();
  res.json({ success: true, data: db.maintenances[idx] });
});

// 18. LOCALIZAÇÕES
app.get('/api/v1/locations', async (_req: Request, res: Response) => {
  res.json({ success: true, data: db.locations });
});

app.post('/api/v1/locations', async (req: Request, res: Response) => {
  const newLoc: Location = {
    ...req.body,
    id: db.locations.length ? Math.max(...db.locations.map(l => l.id)) + 1 : 1,
    active: true
  };
  db.locations.push(newLoc);
  await saveDatabase();
  res.status(201).json({ success: true, data: newLoc });
});

// 19. ESTUDANTES E TURMAS
app.get('/api/v1/students', async (_req: Request, res: Response) => {
  res.json({ success: true, data: db.students });
});

app.post('/api/v1/students', async (req: Request, res: Response) => {
  const newStudent: Student = {
    ...req.body,
    id: db.students.length ? Math.max(...db.students.map(s => s.id)) + 1 : 1,
    created_at: new Date().toISOString()
  };
  db.students.push(newStudent);
  await saveDatabase();
  res.status(201).json({ success: true, data: newStudent });
});

app.get('/api/v1/class-groups', async (_req: Request, res: Response) => {
  res.json({ success: true, data: db.class_groups });
});

app.post('/api/v1/class-groups', async (req: Request, res: Response) => {
  const newClass: ClassGroup = {
    ...req.body,
    id: db.class_groups.length ? Math.max(...db.class_groups.map(c => c.id)) + 1 : 1,
    created_at: new Date().toISOString()
  };
  db.class_groups.push(newClass);
  await saveDatabase();
  res.status(201).json({ success: true, data: newClass });
});

// 20. AULAS PRÁTICAS
app.get('/api/v1/lessons', async (_req: Request, res: Response) => {
  res.json({ success: true, data: db.lessons });
});

app.post('/api/v1/lessons', authorize(['ADMIN', 'ESTOQUE', 'COORDENACAO']), async (req: Request, res: Response) => {
  const ip = req.ip || '127.0.0.1';
  const user = (req as any).user as User;
  const userId = user.id;

  const newLesson: Lesson = {
    ...req.body,
    id: db.lessons.length ? Math.max(...db.lessons.map(l => l.id)) + 1 : 1,
    created_at: new Date().toISOString()
  };
  db.lessons.push(newLesson);
  
  await addAuditLog(user.id, user.name, user.role, ip, 'AGENDAR_AULA', 'Aula', newLesson.id, `Aula [${newLesson.title}] agendada para ${newLesson.date}`);
  await saveDatabase();
  res.status(201).json({ success: true, data: newLesson });
});

app.put('/api/v1/lessons/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const ip = req.ip || '127.0.0.1';
  const userId = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1;
  const user = db.users.find((u) => u.id === userId) || db.users[0];
  
  const idx = db.lessons.findIndex(l => l.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Aula não encontrada.' });
  
  const oldStatus = db.lessons[idx].status;
  const updatedLesson = { ...db.lessons[idx], ...req.body };
  const newStatus = updatedLesson.status;

  // Fluxo de Integração com Estoque para Aulas (Cap. 5 do Prompt)
  // PLANEJADA -> MATERIAIS_SEPARADOS -> REALIZADA (Consumo)
  if (oldStatus !== 'MATERIAIS_SEPARADOS' && newStatus === 'MATERIAIS_SEPARADOS') {
    // Registra separação (pode ser apenas informativo ou abaixar reserva)
    await addAuditLog(user.id, user.name, user.role, ip, 'SEPARAR_MATERIAIS', 'Aula', id, `Materiais da aula [${updatedLesson.title}] foram separados`);
  }

  if (newStatus === 'FINALIZADA' && oldStatus !== 'FINALIZADA') {
    // Processar consumo de insumos e devolução de patrimônios
    updatedLesson.items.forEach((item: LessonItem) => {
      if (!item.is_patrimony && item.product_id && item.consumed_quantity) {
        // Debitar do estoque real (ou ajuste se já foi debitado na saída)
        const prod = db.products.find(p => p.id === item.product_id);
        if (prod) {
          const before = prod.current_stock;
          prod.current_stock = Math.max(0, prod.current_stock - item.consumed_quantity);
          
          const movId = db.movements.length ? Math.max(...db.movements.map(m => m.id)) + 1 : 1;
          db.movements.unshift({
            id: movId,
            movement_type: 'SAIDA',
            product_id: prod.id,
            product_name: prod.name,
            product_code: prod.code,
            quantity: item.consumed_quantity,
            balance_before: before,
            balance_after: prod.current_stock,
            user_id: user.id,
            user_name: user.name,
            reason: `Consumo em Aula Prática #${id}: ${updatedLesson.title}`,
            created_at: new Date().toISOString()
          });
        }
      }
    });
  }

  db.lessons[idx] = updatedLesson;
  await addAuditLog(user.id, user.name, user.role, ip, 'ATUALIZAR_AULA', 'Aula', id, `Aula atualizada para status ${newStatus}`);
  await saveDatabase();
  res.json({ success: true, data: db.lessons[idx] });
});

// 21. EMPRÉSTIMOS
app.get('/api/v1/loans', async (_req: Request, res: Response) => {
  res.json({ success: true, data: db.loans });
});

app.post('/api/v1/loans', authorize(['ADMIN', 'ESTOQUE']), async (req: Request, res: Response) => {
  const ip = req.ip || '127.0.0.1';
  const user = (req as any).user as User;
  const userId = user.id;

  const newLoan: Loan = {
    ...req.body,
    id: db.loans.length ? Math.max(...db.loans.map(l => l.id)) + 1 : 1,
    created_at: new Date().toISOString(),
    status: 'Ativo'
  };
  db.loans.push(newLoan);

  // Atualizar status de patrimônios emprestados
  newLoan.items.forEach(item => {
    if (item.is_patrimony && item.patrimony_id) {
      const p = db.patrimonies.find(pat => pat.id === item.patrimony_id);
      if (p) {
        p.status = 'Emprestado';
        p.updated_at = new Date().toISOString();
      }
    }
  });

  await addAuditLog(user.id, user.name, user.role, ip, 'REALIZAR_EMPRESTIMO', 'Empréstimo', newLoan.id, `Empréstimo [${newLoan.loan_code}] realizado`);
  await saveDatabase();
  res.status(201).json({ success: true, data: newLoan });
});

app.put('/api/v1/loans/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const ip = req.ip || '127.0.0.1';
  const userId = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1;
  const user = db.users.find((u) => u.id === userId) || db.users[0];
  
  const idx = db.loans.findIndex(l => l.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Empréstimo não encontrado.' });
  
  const oldStatus = db.loans[idx].status;
  db.loans[idx] = { ...db.loans[idx], ...req.body };
  const newStatus = db.loans[idx].status;

  // Lógica de Devolução
  if (newStatus === 'Devolvido' && oldStatus !== 'Devolvido') {
    db.loans[idx].actual_return_date = new Date().toISOString();
    db.loans[idx].items.forEach(item => {
      if (item.is_patrimony && item.patrimony_id) {
        const p = db.patrimonies.find(pat => pat.id === item.patrimony_id);
        if (p) {
          p.status = 'Disponível';
          p.updated_at = new Date().toISOString();
        }
      }
    });
  }

  await addAuditLog(user.id, user.name, user.role, ip, 'ATUALIZAR_EMPRESTIMO', 'Empréstimo', id, `Empréstimo atualizado para ${newStatus}`);
  await saveDatabase();
  res.json({ success: true, data: db.loans[idx] });
});

// 22. OCORRÊNCIAS
app.get('/api/v1/occurrences', async (_req: Request, res: Response) => {
  res.json({ success: true, data: db.occurrences });
});

app.post('/api/v1/occurrences', async (req: Request, res: Response) => {
  const ip = req.ip || '127.0.0.1';
  const userId = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1;
  const user = db.users.find((u) => u.id === userId) || db.users[0];

  const newOccurrence: Occurrence = {
    ...req.body,
    id: db.occurrences.length ? Math.max(...db.occurrences.map(o => o.id)) + 1 : 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.occurrences.push(newOccurrence);

  await addAuditLog(user.id, user.name, user.role, ip, 'REGISTRAR_OCORRENCIA', 'Ocorrência', newOccurrence.id, `Ocorrência [${newOccurrence.occurrence_code}] registrada: ${newOccurrence.title}`);
  await saveDatabase();
  res.status(201).json({ success: true, data: newOccurrence });
});

app.put('/api/v1/occurrences/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const ip = req.ip || '127.0.0.1';
  const userId = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1;
  const user = db.users.find((u) => u.id === userId) || db.users[0];
  
  const idx = db.occurrences.findIndex(o => o.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Ocorrência não encontrada.' });
  
  db.occurrences[idx] = { ...db.occurrences[idx], ...req.body, updated_at: new Date().toISOString() };
  
  await addAuditLog(user.id, user.name, user.role, ip, 'ATUALIZAR_OCORRENCIA', 'Ocorrência', id, `Ocorrência [${db.occurrences[idx].occurrence_code}] atualizada`);
  await saveDatabase();
  res.json({ success: true, data: db.occurrences[idx] });
});

// 23. SUPORTE TÉCNICO (CENTRAL DE AJUDA)
app.get('/api/v1/support', async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  
  if (!user) {
    return res.status(401).json({ success: false, message: 'Usuário não autenticado.' });
  }

  // ADMIN e TECNICO veem todos, outros veem apenas os seus
  if (user.role === 'ADMIN' || user.role === 'TECNICO') {
    return res.json({ success: true, data: db.support_tickets });
  }
  res.json({ success: true, data: db.support_tickets.filter(t => t.user_id === user.id) });
});

app.post('/api/v1/support', async (req: Request, res: Response) => {
  const ip = req.ip || '127.0.0.1';
  const user = (req as any).user as User;

  if (!user) {
    return res.status(401).json({ success: false, message: 'Usuário não autenticado.' });
  }

  const { title, description, category, priority } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ success: false, message: 'Informe o título do chamado.' });
  }

  if (!description?.trim()) {
    return res.status(400).json({ success: false, message: 'Informe a descrição da dúvida ou problema.' });
  }

  const newTicket: SupportTicket = {
    id: db.support_tickets.length ? Math.max(...db.support_tickets.map(t => t.id)) + 1 : 1,
    ticket_number: `SUP-${new Date().getFullYear()}-${(db.support_tickets.length + 1).toString().padStart(6, '0')}`,
    user_id: user.id,
    user_name: user.name,
    title: title.trim(),
    description: description.trim(),
    category: category || 'Sistema',
    priority: priority || 'Baixa',
    status: 'Aberto',
    attachments: req.body.attachments || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  db.support_tickets.push(newTicket);
  await addAuditLog(user.id, user.name, user.role, ip, 'ABRIR_CHAMADO', 'Suporte', newTicket.id, `Chamado [${newTicket.ticket_number}] aberto pelo usuário`);
  await saveDatabase();
  res.status(201).json({ success: true, data: newTicket });
});

app.get('/api/v1/support/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const ticket = db.support_tickets.find(t => t.id === id);
  if (!ticket) return res.status(404).json({ success: false, message: 'Chamado não encontrado.' });
  res.json({ success: true, data: ticket });
});

app.put('/api/v1/support/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const ip = req.ip || '127.0.0.1';
  const user = (req as any).user as User;
  
  if (!user) {
    return res.status(401).json({ success: false, message: 'Usuário não autenticado.' });
  }

  const idx = db.support_tickets.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Chamado não encontrado.' });
  
  const oldStatus = db.support_tickets[idx].status;
  db.support_tickets[idx] = { ...db.support_tickets[idx], ...req.body, updated_at: new Date().toISOString() };
  const newStatus = db.support_tickets[idx].status;

  if (newStatus === 'Atendido' || newStatus === 'Cancelado') {
    db.support_tickets[idx].closed_at = new Date().toISOString();
    await addAuditLog(user.id, user.name, user.role, ip, 'ENCERRAR_CHAMADO', 'Suporte', id, `Chamado [${db.support_tickets[idx].ticket_number}] finalizado`);
  } else if (newStatus === 'Em atendimento' && oldStatus === 'Aberto') {
    await addAuditLog(user.id, user.name, user.role, ip, 'ATENDER_CHAMADO', 'Suporte', id, `Técnico iniciou atendimento do chamado [${db.support_tickets[idx].ticket_number}]`);
  }

  await saveDatabase();
  res.json({ success: true, data: db.support_tickets[idx] });
});

app.get('/api/v1/support/:id/messages', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const messages = db.support_messages.filter(m => m.ticket_id === id);
  res.json({ success: true, data: messages });
});

app.post('/api/v1/support/:id/messages', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const user = (req as any).user as User;

  if (!user) {
    return res.status(401).json({ success: false, message: 'Usuário não autenticado.' });
  }

  const ticket = db.support_tickets.find(t => t.id === id);
  if (!ticket) {
    return res.status(404).json({ success: false, message: 'Chamado não encontrado.' });
  }
  
  const newMessage: SupportMessage = {
    id: db.support_messages.length ? Math.max(...db.support_messages.map(m => m.id)) + 1 : 1,
    ticket_id: id,
    author_id: user.id,
    author_name: user.name,
    author_role: user.role,
    text: req.body.text,
    created_at: new Date().toISOString(),
    read: false
  };
  
  db.support_messages.push(newMessage);
  await saveDatabase();
  res.status(201).json({ success: true, data: newMessage });
});

app.post('/api/v1/support/:id/remote-access', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const ip = req.ip || '127.0.0.1';
  const userId = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1;
  const user = db.users.find((u) => u.id === userId) || db.users[0];

  const newRequest: RemoteAccessRequest = {
    id: db.remote_access_requests.length ? Math.max(...db.remote_access_requests.map(r => r.id)) + 1 : 1,
    ticket_id: id,
    requester_id: userId,
    technician_id: req.body.technician_id || 0,
    reason: req.body.reason || 'Necessidade de suporte técnico avançado',
    status: 'PENDENTE',
    created_at: new Date().toISOString()
  };
  
  db.remote_access_requests.push(newRequest);
  await addAuditLog(user.id, user.name, user.role, ip, 'SOLICITAR_ACESSO_REMOTO', 'Suporte', id, `Solicitação de acesso remoto para o chamado #${id}`);
  await saveDatabase();
  res.status(201).json({ success: true, data: newRequest });
});

app.put('/api/v1/support/:id/remote-access/:requestId', async (req: Request, res: Response) => {
  const requestId = Number(req.params.requestId);
  const ip = req.ip || '127.0.0.1';
  const userId = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1;
  const user = db.users.find((u) => u.id === userId) || db.users[0];
  
  const idx = db.remote_access_requests.findIndex(r => r.id === requestId);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Solicitação não encontrada.' });
  
  const oldStatus = db.remote_access_requests[idx].status;
  db.remote_access_requests[idx].status = req.body.status;
  
  if (req.body.status === 'AUTORIZADO') {
    db.remote_access_requests[idx].authorized_at = new Date().toISOString();
    await addAuditLog(user.id, user.name, user.role, ip, 'AUTORIZAR_ACESSO_REMOTO', 'Suporte', requestId, `Usuário autorizou acesso remoto para o chamado #${db.remote_access_requests[idx].ticket_id}`);
  }

  await saveDatabase();
  res.json({ success: true, data: db.remote_access_requests[idx] });
});

// 15. CONFIGURAÇÕES E BACKUP (/api/v1/settings, /api/v1/backup) - TEL-015 / RN-029 / RN-034
app.get('/api/v1/settings', async (_req: Request, res: Response) => {
  res.json({ success: true, data: db.settings });
});

app.put('/api/v1/settings', authorize(['ADMIN']), async (req: Request, res: Response) => {
  const { institution_name, expiration_alert_days, fifo_mode, theme } = req.body;
  const ip = req.ip || '127.0.0.1';
  const user = (req as any).user as User;
  const userId = user.id;

  if (institution_name) db.settings.institution_name = institution_name;
  if (expiration_alert_days) db.settings.expiration_alert_days = Number(expiration_alert_days);
  if (fifo_mode !== undefined) db.settings.fifo_mode = Boolean(fifo_mode);
  if (theme) db.settings.theme = theme;

  await addAuditLog(user.id, user.name, user.role, ip, 'ALTERAR_CONFIGURACAO', 'Configurações', 1, `Parâmetros atualizados no servidor (Alerta validade: ${db.settings.expiration_alert_days} dias) (RN-050)`);
  await saveDatabase();

  res.json({ success: true, message: 'Configurações atualizadas com sucesso!', data: db.settings });
});

// Endpoint administrativo para Limpeza Total do Estoque para recebimento do Acervo Real CEET

// Middleware Vite em ambiente de desenvolvimento ou estático no build (Conforme documentação)
export async function initializeServer() {
  await loadDatabase();
}

// Desenvolvimento local: inicia Express normalmente. No Vercel, o adaptador
// serverless (api/index.ts) importa o app e não chama listen().
if (!process.env.VERCEL) {
  async function startServer() {
    await loadDatabase();
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[CEET-SERVER] Servidor rodando em http://localhost:${PORT}`);
    });
  }
  startServer();
}
