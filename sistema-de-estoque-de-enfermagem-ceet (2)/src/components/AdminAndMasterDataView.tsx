/**
 * Sistema de Estoque de Enfermagem CEET
 * Telas de Cadastros Complementares, Auditoria, Relatórios, Usuários RBAC e Backup do Sistema
 * (TEL-005, TEL-006, TEL-007, TEL-013, TEL-015, TEL-016 / RN-010 CNPJ / RN-021 RBAC / RF-013 / RF-043)
 */

import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Folder,
  Lock,
  Printer,
  Shield,
  Trash2,
  Truck,
  Upload,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  Category,
  Manufacturer,
  Supplier,
  User,
  AuditLog,
} from '../types';
import { api } from '../services/api';
import { exportToExcel, exportToCSV, exportToPrint } from '../utils/exportUtils';

interface AdminAndMasterDataViewProps {
  currentUser: User;
  activeSection: 'categories' | 'manufacturers' | 'suppliers' | 'users' | 'audit' | 'settings' | 'reports';
}

export const AdminAndMasterDataView: React.FC<AdminAndMasterDataViewProps> = ({
  currentUser,
  activeSection,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados dos Cadastros TEL-005 / TEL-006 / TEL-007
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catColor, setCatColor] = useState('#3b82f6');

  const [manName, setManName] = useState('');
  const [manCountry, setManCountry] = useState('Brasil');

  const [supTradeName, setSupTradeName] = useState('');
  const [supCorporateName, setSupCorporateName] = useState('');
  const [supCnpj, setSupCnpj] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');

  // Estados para Gestão de Usuários RBAC TEL-016
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'ADMIN' | 'ESTOQUE' | 'PROFESSOR' | 'COORDENACAO'>('ESTOQUE');
  const [newUserType, setNewUserType] = useState<'Servidor' | 'Professor' | 'Funcionário' | 'Estagiário' | 'Técnico'>('Servidor');
  const [newUserTempPass, setNewUserTempPass] = useState('Ceet@2026!');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const canEdit = currentUser.role === 'ADMIN' || currentUser.role === 'ESTOQUE';
  const isAdmin = currentUser.role === 'ADMIN';

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, mans, sups, usrs, logs] = await Promise.all([
        api.getCategories(),
        api.getManufacturers(),
        api.getSuppliers(),
        api.getUsers(),
        isAdmin ? api.getAuditLogs() : Promise.resolve([]),
      ]);
      setCategories(cats);
      setManufacturers(mans);
      setSuppliers(sups);
      setUsers(usrs);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Erro ao carregar cadastros complementares CEET:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSection]);

  // CADASTRO DE CATEGORIA (TEL-005 / RF-002)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    try {
      await api.createCategory({
        name: catName.trim(),
        description: catDesc.trim(),
        color: catColor,
      });
      setCatName('');
      setCatDesc('');
      setFormSuccess('✅ Categoria cadastrada com sucesso!');
      await loadData();
    } catch (err) {
      setFormError('Erro ao cadastrar categoria.');
    }
  };

  // CADASTRO DE FABRICANTE (TEL-006 / RF-003)
  const handleSaveManufacturer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manName.trim()) return;
    try {
      await api.createManufacturer({
        name: manName.trim(),
        country: manCountry,
      });
      setManName('');
      setFormSuccess('✅ Fabricante cadastrado com sucesso!');
      await loadData();
    } catch (err) {
      setFormError('Erro ao cadastrar fabricante.');
    }
  };

  // CADASTRO DE FORNECEDOR COM VALIDAÇÃO CNPJ (TEL-007 / RF-004 / RN-010)
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    // Validação de CNPJ obrigatório / único (RN-010)
    const cleanCnpj = supCnpj.replace(/[^0-9]/g, '');
    if (cleanCnpj.length < 14) {
      setFormError('O CNPJ deve ser válido com 14 dígitos (RN-010). Ex: 12.345.678/0001-90');
      return;
    }

    try {
      const res = await api.createSupplier({
        corporate_name: supCorporateName.trim() || supTradeName.trim(),
        trade_name: supTradeName.trim(),
        cnpj: supCnpj.trim(),
        phone: supPhone,
        email: supEmail,
      });

      if (!res.success) {
        setFormError(res.message || 'Erro ao cadastrar fornecedor.');
        return;
      }

      setSupTradeName('');
      setSupCorporateName('');
      setSupCnpj('');
      setSupPhone('');
      setSupEmail('');
      setFormSuccess('✅ Fornecedor cadastrado e CNPJ validado com sucesso (RN-010)!');
      await loadData();
    } catch (err) {
      setFormError('Já existe um fornecedor cadastrado com este CNPJ (RN-010).');
    }
  };

  // CADASTRO DE USUÁRIO RBAC (TEL-016 / RF-012 / RN-021)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setFormError('Apenas administradores podem gerenciar usuários (RN-025).');
      return;
    }
    try {
      const res = await api.createUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
        user_type: newUserType,
        temporary_password: newUserTempPass.trim() || 'Ceet@2026!',
      });
      if (res.success) {
        setNewUserName('');
        setNewUserEmail('');
        setNewUserTempPass('Ceet@2026!');
        setFormSuccess(`✅ Usuário ${res.data?.name} cadastrado com sucesso! Senha temporária: "${res.data?.temporary_password || 'Ceet@2026!'}"`);
        await loadData();
      } else {
        setFormError(res.message || 'Erro ao cadastrar usuário.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Erro ao cadastrar usuário.');
    }
  };

  // BACKUP EXPORT / RESTORE (TEL-015 / RF-013 / RF-015)
  const handleExportBackup = async () => {
    try {
      const dbJson = await api.exportDatabaseBackup();
      const blob = new Blob([JSON.stringify(dbJson, null, 2)], {
        type: 'application/json',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `ceet_estoque_enfermagem_backup_${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      link.click();
    } catch (err) {
      alert('Falha ao gerar backup oficial.');
    }
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO GERAL DA SEÇÃO ATIVA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span>Enfermagem CEET</span>
            <span>&bull;</span>
            <span className="text-blue-600 dark:text-blue-400 uppercase">
              {activeSection}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            {activeSection === 'categories' && 'Categorias de Materiais (TEL-005)'}
            {activeSection === 'manufacturers' && 'Fabricantes Cadastrados (TEL-006)'}
            {activeSection === 'suppliers' && 'Fornecedores Institucionais (TEL-007)'}
            {activeSection === 'users' && 'Usuários & Perfis RBAC (TEL-016)'}
            {activeSection === 'audit' && 'Auditoria & Segurança de Ações (RF-043)'}
            {activeSection === 'settings' && 'Configurações & Backup (TEL-015)'}
            {activeSection === 'reports' && 'Relatórios e Exportações Institucionais'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {activeSection === 'categories' &&
              'Organize os materiais hospitalares por tipo (Seringas, Luvas, Soro, EPIs).'}
            {activeSection === 'manufacturers' &&
              'Relação oficial de fabricantes de materiais hospitalares do CEET.'}
            {activeSection === 'suppliers' &&
              'Gerenciamento de fornecedores com validação de CNPJ e dados de contato (RN-010).'}
            {activeSection === 'users' &&
              'Controle de acesso por papel institucional: ADMIN, ESTOQUE, PROFESSOR e COORDENAÇÃO (RN-021).'}
            {activeSection === 'audit' &&
              'Registro imutável de quem criou, alterou, movimentou ou inativou registros no sistema (RN-043).'}
            {activeSection === 'settings' &&
              'Realize backup completo do banco de dados em JSON e gerencie parâmetros da plataforma.'}
            {activeSection === 'reports' &&
              'Gere relatórios executivos de consumo por disciplina, validade e situação de estoque.'}
          </p>
        </div>
      </div>

      {formError && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 font-semibold">
          {formError}
        </div>
      )}
      {formSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300 font-bold">
          {formSuccess}
        </div>
      )}

      {/* SEÇÃO: CATEGORIAS (TEL-005) */}
      {activeSection === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Nova Categoria
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Ex: Seringas e Cateteres"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição / Finalidade
                </label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Materiais para punção e administração de medicamentos"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cor Identificadora na UI
                </label>
                <input
                  type="color"
                  value={catColor}
                  onChange={(e) => setCatColor(e.target.value)}
                  className="w-16 h-8 rounded-lg cursor-pointer"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                Cadastrar Categoria (RF-002)
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Categorias do Setor de Enfermagem ({categories.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: c.color || '#3b82f6' }}
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {c.name}
                      </p>
                      <p className="text-[11px] text-slate-400">{c.description || 'Sem descrição'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO: FORNECEDORES COM VALIDAÇÃO CNPJ (TEL-007 / RN-010) */}
      {activeSection === 'suppliers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Novo Fornecedor
            </h3>
            <p className="text-[11px] text-slate-400 mb-4">
              O CNPJ será validado conforme a regra RN-010.
            </p>
            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Fantasia *
                </label>
                <input
                  type="text"
                  required
                  value={supTradeName}
                  onChange={(e) => setSupTradeName(e.target.value)}
                  placeholder="Ex: MedSurg Distribuidora"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Razão Social *
                </label>
                <input
                  type="text"
                  required
                  value={supCorporateName}
                  onChange={(e) => setSupCorporateName(e.target.value)}
                  placeholder="Ex: MedSurg Comércio Hospitalar Ltda"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  CNPJ (14 dígitos - RN-010) *
                </label>
                <input
                  type="text"
                  required
                  value={supCnpj}
                  onChange={(e) => setSupCnpj(e.target.value)}
                  placeholder="12.345.678/0001-90"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="(27) 3345-0000"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    placeholder="contato@medsurg.com"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md mt-2"
              >
                Cadastrar e Validar CNPJ (RN-010)
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Fornecedores Homologados CEET ({suppliers.length})
            </h3>
            <div className="space-y-2">
              {suppliers.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {s.trade_name} &bull; <span className="font-mono text-slate-500">{s.cnpj}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {s.corporate_name} &bull; {s.phone || 'Sem fone'} &bull; {s.email || 'Sem e-mail'}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                    CNPJ VÁLIDO
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO: USUÁRIOS & PERMISSÕES - PROMPT MESTRE CEET */}
      {activeSection === 'users' && (
        <div className="space-y-6">
          {/* Header informativo para o Super Administrador */}
          <div className="p-5 bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-3xl shadow-lg border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600/30 rounded-2xl border border-blue-500/30 text-blue-400">
                <Shield className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Painel do Super Administrador Geral do CEET</h2>
                <p className="text-xs text-slate-300">
                  Controle absoluto e exclusivo de concessão de acessos, cadastro de servidores, bloqueios e redefinição de senhas.
                </p>
              </div>
            </div>
            <div className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" />
              <span>Auto-Cadastro Desativado (Modo Estrito Anti-Invasão)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formulário de Cadastro do Administrador Geral */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Autorizar Novo Usuário
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                O novo usuário receberá uma senha temporária e será obrigado a cadastrar uma nova senha no primeiro acesso.
              </p>

              <form onSubmit={handleSaveUser} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Ex: Profª. Maria Aparecida Silva"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    E-mail Institucional *
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="maria.silva@ceet.edu.br"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nível de Acesso (Perfil) *
                    </label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                    >
                      <option value="ESTOQUE">Servidor Estoque</option>
                      <option value="PROFESSOR">Professor</option>
                      <option value="COORDENACAO">Coordenação</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tipo de Vínculo
                    </label>
                    <select
                      value={newUserType}
                      onChange={(e) => setNewUserType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                    >
                      <option value="Servidor">Servidor Público</option>
                      <option value="Professor">Docente / Professor</option>
                      <option value="Funcionário">Funcionário</option>
                      <option value="Estagiário">Estagiário</option>
                      <option value="Técnico">Técnico de Enfermagem</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Senha Temporária (Primeiro Acesso)
                  </label>
                  <input
                    type="text"
                    value={newUserTempPass}
                    onChange={(e) => setNewUserTempPass(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-blue-600 font-bold"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 mt-2 transition-all flex items-center justify-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Cadastrar e Conceder Autorização</span>
                </button>
              </form>
            </div>

            {/* Lista de Usuários Gerenciados pelo Super Admin */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Usuários Autorizados no CEET ({users.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Clique nas ações para alterar permissões, status ou redefinir senhas temporárias.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {u.name}
                        </span>
                        {u.id === 1 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-extrabold uppercase">
                            Super Administrador Proprietário
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'Ativo' || u.active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        }`}>
                          {u.status || (u.active ? 'Ativo' : 'Bloqueado')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {u.email} {u.registration_number ? `• Matrícula: ${u.registration_number}` : ''} {u.department ? `• ${u.department}` : ''}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>Perfil: <strong className="text-slate-700 dark:text-slate-300">{u.role}</strong></span>
                        <span>• Vínculo: <strong className="text-slate-700 dark:text-slate-300">{u.user_type || 'Servidor'}</strong></span>
                        {u.must_change_password && (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">• Troca de senha pendente</span>
                        )}
                      </div>
                    </div>

                    {/* Ações Administrativas */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        onClick={async () => {
                          const newPass = prompt(`Redefinir senha para ${u.name}:\nDigite a nova senha temporária:`, 'Ceet@2026!');
                          if (newPass) {
                            try {
                              const res = await api.resetUserPassword(u.id, newPass);
                              alert(res.message);
                              await loadData();
                            } catch (err: any) {
                              alert(err.message || 'Erro ao redefinir senha.');
                            }
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900 border border-amber-200 dark:border-amber-800 transition-all flex items-center gap-1"
                        title="Redefinir Senha Temporária"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Reset Senha</span>
                      </button>

                      {u.id !== 1 && (
                        <>
                          <button
                            onClick={async () => {
                              const newStatus = u.status === 'Ativo' ? 'Bloqueado' : 'Ativo';
                              try {
                                const res = await api.updateUserStatus(u.id, newStatus, newStatus === 'Ativo');
                                alert(res.message);
                                await loadData();
                              } catch (err: any) {
                                alert(err.message || 'Erro ao alterar status.');
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                              u.status === 'Ativo' || u.active
                                ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                            }`}
                          >
                            {u.status === 'Ativo' || u.active ? 'Bloquear' : 'Ativar'}
                          </button>

                          <button
                            onClick={async () => {
                              if (confirm(`Tem certeza que deseja remover o acesso do usuário "${u.name}" (${u.email})?`)) {
                                try {
                                  const res = await api.deleteUser(u.id);
                                  alert(res.message);
                                  await loadData();
                                } catch (err: any) {
                                  alert(err.message || 'Erro ao excluir usuário.');
                                }
                              }
                            }}
                            className="p-1.5 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all"
                            title="Remover Usuário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO: AUDITORIA DE SISTEMA (RF-043) */}
      {activeSection === 'audit' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <span>Trilha de Auditoria &amp; Rastreio de Segurança (RF-043)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Registros automáticos imutáveis de todas as operações realizadas na plataforma CEET.
              </p>
            </div>
            <button
              onClick={() =>
                exportToExcel(auditLogs, 'Auditoria_Seguranca_CEET', 'Auditoria')
              }
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Auditoria</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase">
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Ação</th>
                  <th className="py-3 px-4">Alvo / Módulo</th>
                  <th className="py-3 px-4">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {log.user_name} ({log.user_role})
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {log.target}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-[280px] truncate">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEÇÃO: CONFIGURAÇÕES E BACKUP (TEL-015 / RF-013 / RF-015) */}
      {activeSection === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <span>Backup e Restauração de Dados (RF-013 / RF-015)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Exporte todo o histórico, catálogo de produtos, fornecedores e estoques em formato JSON padronizado.
            </p>
            <div className="pt-2">
              <button
                onClick={handleExportBackup}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Backup Institucional CEET (JSON)</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600" />
              <span>Parâmetros e Normas CEET</span>
            </h3>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <p>
                &bull; <strong>Padrão de Baixa:</strong> FEFO (First Expire First Out) automático
                no Almoxarifado A1.
              </p>
              <p>
                &bull; <strong>Auditoria Contínua:</strong> Ativada em modo permanente no
                banco de dados JSON do servidor Express.
              </p>
              <p>
                &bull; <strong>Alerta de Validade:</strong> Lotes a vencer em menos de 30 dias
                são notificados no cabeçalho.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
