/**
 * Sistema de Estoque de Enfermagem CEET
 * Telas de Cadastros Complementares, Auditoria, Relatórios, Usuários RBAC e Backup do Sistema
 * (TEL-005, TEL-006, TEL-007, TEL-013, TEL-015, TEL-016 / RN-010 CNPJ / RN-021 RBAC / RF-013 / RF-043)
 */

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Folder,
  Lock,
  Package,
  Printer,
  Shield,
  Trash2,
  Truck,
  Upload,
  UserCheck,
  Users,
  Sparkles,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  Category,
  Manufacturer,
  Supplier,
  User,
  AuditLog,
  InstitutionalLocation as AppLocation,
  Unit,
} from '../types';
import { api } from '../services/api';
import { exportToExcel, exportToCSV, exportToPrint } from '../utils/exportUtils';

import { AIAssistant } from './common/AIAssistant';

import { ConfirmationModal } from './common/ConfirmationModal';

interface AdminAndMasterDataViewProps {
  currentUser: User;
  activeSection: 'categories' | 'manufacturers' | 'suppliers' | 'users' | 'audit' | 'settings' | 'reports' | 'database' | 'locations' | 'units';
}

export const AdminAndMasterDataView: React.FC<AdminAndMasterDataViewProps> = ({
  currentUser,
  activeSection,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<AppLocation[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [databaseRaw, setDatabaseRaw] = useState<any>(null);
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

  // Estados para Localizações e Unidades
  const [locName, setLocName] = useState('');
  const [locBuilding, setLocBuilding] = useState('');
  const [locRoom, setLocRoom] = useState('');

  const [unitName, setUnitName] = useState('');
  const [unitAbbreviation, setUnitAbbreviation] = useState('');

  // Estados para Gestão de Usuários RBAC TEL-016
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserCpf, setNewUserCpf] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRegistration, setNewUserRegistration] = useState('');
  const [newUserFunction, setNewUserFunction] = useState('');
  const [newUserDepartment, setNewUserDepartment] = useState('');
  const [newUserStatus, setNewUserStatus] = useState<'Ativo' | 'Inativo' | 'Bloqueado'>('Ativo');
  const [newUserRole, setNewUserRole] = useState<'ADMIN' | 'ESTOQUE' | 'PROFESSOR' | 'COORDENACAO'>('ESTOQUE');
  const [newUserType, setNewUserType] = useState<'Servidor' | 'Professor' | 'Funcionário' | 'Estagiário' | 'Técnico'>('Servidor');
  const [newUserTempPass, setNewUserTempPass] = useState('Ceet@2026!');
  const [newUserPhoto, setNewUserPhoto] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const userPhotoInputRef = React.useRef<HTMLInputElement>(null);
  const backupInputRef = React.useRef<HTMLInputElement>(null);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [showResetStockModal, setShowResetStockModal] = useState(false);

  const canEdit = ['ADMIN', 'ESTOQUE', 'PROFESSOR', 'COORDENACAO'].includes(currentUser.role);
  const isAdmin = currentUser.role === 'ADMIN';
  const canManageStock = ['ADMIN', 'ESTOQUE', 'PROFESSOR', 'COORDENACAO'].includes(currentUser.role);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, mans, sups, usrs, logs, dbBackup, locs, unis] = await Promise.all([
        api.getCategories(),
        api.getManufacturers(),
        api.getSuppliers(),
        api.getUsers(),
        isAdmin ? api.getAuditLogs() : Promise.resolve([]),
        isAdmin && activeSection === 'database' ? api.exportDatabaseBackup() : Promise.resolve(null),
        api.getLocations(),
        api.getUnits(),
      ]);
      setCategories(cats);
      setManufacturers(mans);
      setSuppliers(sups);
      setUsers(usrs);
      setAuditLogs(logs);
      setLocations(locs);
      setUnits(unis);
      if (dbBackup) setDatabaseRaw(dbBackup.database);
    } catch (err) {
      console.error('Erro ao carregar cadastros complementares CEET:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSection]);

  const handleUserPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await api.upload(file, currentUser.id);
      if (res.success && res.data) {
        setNewUserPhoto(res.data.url);
      }
    } catch (err) {
      console.error('Erro no upload da foto do usuário:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('ATENÇÃO: Restaurar um backup substituirá TODOS os dados atuais do sistema. Deseja continuar?')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = await api.restoreDatabaseBackup(json);
        if (res.success) {
          alert('✅ Banco de dados restaurado com sucesso! A página será recarregada.');
          window.location.reload();
        } else {
          alert('❌ Erro ao restaurar backup: ' + res.message);
        }
      } catch (err) {
        alert('❌ Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
  };

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
    setFormError('');
    setFormSuccess('');
    try {
      const res = await api.createManufacturer({
        name: manName.trim(),
        country: manCountry,
      });
      if (res.success) {
        setManName('');
        setFormSuccess('✅ Fabricante cadastrado com sucesso!');
        await loadData();
      } else {
        setFormError(res.message || 'Erro ao cadastrar fabricante.');
      }
    } catch (err) {
      setFormError('Erro de conexão ao cadastrar fabricante.');
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
        cpf: newUserCpf.trim() || undefined,
        phone: newUserPhone.trim() || undefined,
        registration_number: newUserRegistration.trim() || undefined,
        function_title: newUserFunction.trim() || undefined,
        department: newUserDepartment.trim() || undefined,
        role: newUserRole,
        user_type: newUserType,
        status: newUserStatus,
        temporary_password: newUserTempPass.trim() || 'Ceet@2026!',
        photo_url: newUserPhoto || undefined,
      });
      if (res.success) {
        setNewUserName('');
        setNewUserEmail('');
        setNewUserCpf('');
        setNewUserPhone('');
        setNewUserRegistration('');
        setNewUserFunction('');
        setNewUserDepartment('');
        setNewUserStatus('Ativo');
        setNewUserTempPass('Ceet@2026!');
        setNewUserPhoto('');
        setFormSuccess(`✅ Usuário ${res.data?.name} cadastrado com sucesso! Senha temporária: "${res.data?.temporary_password || 'Ceet@2026!'}"`);
        await loadData();
      } else {
        setFormError(res.message || 'Erro ao cadastrar usuário.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Erro ao cadastrar usuário.');
    }
  };

  // CADASTRO DE LOCALIZAÇÃO / SETOR (RN-LOCATION)
  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim()) return;
    try {
      await api.createLocation({
        name: locName.trim(),
        building: locBuilding.trim(),
        room: locRoom.trim(),
        active: true,
      });
      setLocName('');
      setLocBuilding('');
      setLocRoom('');
      setFormSuccess('✅ Localização/Setor cadastrado com sucesso!');
      await loadData();
    } catch (err) {
      setFormError('Erro ao cadastrar localização.');
    }
  };

  // CADASTRO DE UNIDADE DE MEDIDA (RN-UNIT)
  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim() || !unitAbbreviation.trim()) return;
    try {
      await api.createUnit({
        name: unitName.trim(),
        abbreviation: unitAbbreviation.trim(),
      });
      setUnitName('');
      setUnitAbbreviation('');
      setFormSuccess('✅ Unidade de medida cadastrada com sucesso!');
      await loadData();
    } catch (err) {
      setFormError('Erro ao cadastrar unidade.');
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

  const handleResetStock = async () => {
    if (!canManageStock) return;
    setShowResetStockModal(true);
  };

  const executeResetStock = async () => {
    setShowResetStockModal(false);
    setLoading(true);
    try {
      const res = await api.resetStock();
      if (res.success) {
        setFormSuccess('✅ Estoque resetado com sucesso! Todos os produtos e históricos foram removidos.');
        await loadData();
      } else {
        setFormError('Erro ao resetar estoque: ' + res.message);
      }
    } catch (err) {
      setFormError('Erro de conexão ao tentar resetar estoque.');
    } finally {
      setLoading(false);
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
            {activeSection === 'database' && 'Explorador de Dados CEET (JSON)'}
            {activeSection === 'reports' && 'Relatórios e Exportações Institucionais'}
            {activeSection === 'locations' && 'Localizações e Setores (Laboratórios)'}
            {activeSection === 'units' && 'Unidades de Medida Cadastradas'}
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
            {activeSection === 'database' &&
              'Visualize a estrutura bruta do banco de dados JSON persistido no servidor.'}
            {activeSection === 'reports' &&
              'Gere relatórios executivos de consumo por disciplina, validade e situação de estoque.'}
            {activeSection === 'locations' &&
              'Cadastre os laboratórios e armários para rastrear de onde vem e para onde vai cada material.'}
            {activeSection === 'units' &&
              'Defina as unidades de medida oficiais (Frasco, Unidade, Caixa) para padronização do estoque.'}
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

      {/* SEÇÃO: LOCALIZAÇÕES (SETORS) */}
      {activeSection === 'locations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Nova Localização / Setor
            </h3>
            <form onSubmit={handleSaveLocation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Local *
                </label>
                <input
                  type="text"
                  required
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  placeholder="Ex: Laboratório de Práticas I"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bloco / Prédio
                  </label>
                  <input
                    type="text"
                    value={locBuilding}
                    onChange={(e) => setLocBuilding(e.target.value)}
                    placeholder="Ex: Bloco A"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sala
                  </label>
                  <input
                    type="text"
                    value={locRoom}
                    onChange={(e) => setLocRoom(e.target.value)}
                    placeholder="Ex: Sala 102"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md"
              >
                Cadastrar Localização
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Locais e Setores de Destino ({locations.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {locations.map((l) => (
                <div
                  key={l.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                      <Folder className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {l.name}
                      </p>
                      <p className="text-[11px] text-slate-400">{l.building} &bull; {l.room}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO: UNIDADES DE MEDIDA */}
      {activeSection === 'units' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Nova Unidade de Medida
            </h3>
            <form onSubmit={handleSaveUnit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Unidade *
                </label>
                <input
                  type="text"
                  required
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  placeholder="Ex: Frasco"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Sigla / Abreviação *
                </label>
                <input
                  type="text"
                  required
                  value={unitAbbreviation}
                  onChange={(e) => setUnitAbbreviation(e.target.value)}
                  placeholder="Ex: FR"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold uppercase"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md"
              >
                Cadastrar Unidade
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Unidades Disponíveis ({units.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {units.map((u) => (
                <div
                  key={u.id}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center"
                >
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    {u.abbreviation}
                  </p>
                  <p className="text-[10px] text-slate-500">{u.name}</p>
                </div>
              ))}
            </div>
          </div>
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

      {/* SEÇÃO: FABRICANTES (TEL-006) */}
      {activeSection === 'manufacturers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Novo Fabricante
            </h3>
            <form onSubmit={handleSaveManufacturer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Fabricante *
                </label>
                <input
                  type="text"
                  required
                  value={manName}
                  onChange={(e) => setManName(e.target.value)}
                  placeholder="Ex: BD Medical"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Origem / País
                </label>
                <input
                  type="text"
                  value={manCountry}
                  onChange={(e) => setManCountry(e.target.value)}
                  placeholder="Ex: Brasil, EUA, Alemanha"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                Cadastrar Fabricante (RF-003)
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Fabricantes Homologados ({manufacturers.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {manufacturers.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {m.name}
                      </p>
                      <p className="text-[11px] text-slate-400">{m.country || 'N/A'}</p>
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
                <div className="flex justify-center mb-4">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center">
                      {newUserPhoto ? (
                        <img src={newUserPhoto} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-8 h-8 text-slate-300" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => userPhotoInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl"
                    >
                      <Upload className="w-5 h-5" />
                    </button>
                    <input type="file" ref={userPhotoInputRef} className="hidden" accept="image/*" onChange={handleUserPhotoUpload} />
                  </div>
                </div>

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
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">CPF</label>
                    <input type="text" value={newUserCpf} onChange={(e) => setNewUserCpf(e.target.value)} placeholder="000.000.000-00"
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone</label>
                    <input type="text" value={newUserPhone} onChange={(e) => setNewUserPhone(e.target.value)} placeholder="(28) 99999-9999"
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Matrícula</label>
                    <input type="text" value={newUserRegistration} onChange={(e) => setNewUserRegistration(e.target.value)} placeholder="Matrícula institucional"
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Cargo</label>
                    <input type="text" value={newUserFunction} onChange={(e) => setNewUserFunction(e.target.value)} placeholder="Ex: Técnico de Enfermagem"
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Setor</label>
                    <input type="text" value={newUserDepartment} onChange={(e) => setNewUserDepartment(e.target.value)} placeholder="Ex: Enfermagem"
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status inicial</label>
                    <select value={newUserStatus} onChange={(e) => setNewUserStatus(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold">
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                      <option value="Bloqueado">Bloqueado</option>
                    </select>
                  </div>
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
            <div className="flex items-center gap-2">
              <AIAssistant 
                category="AUDITORIA" 
                context="Auditoria e Segurança de Ações" 
                data={auditLogs} 
                buttonText="IA Auditor"
              />
              <button
                onClick={() =>
                  exportToExcel(auditLogs, 'Auditoria_Seguranca_CEET', 'Auditoria')
                }
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md shadow-emerald-500/20"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Exportar Auditoria</span>
              </button>
            </div>
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
                      {new Date(log.created_at).toLocaleString('pt-BR')}
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
                      {log.entity}
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

      {/* SEÇÃO: RELATÓRIOS E EXPORTAÇÕES INSTITUCIONAIS */}
      {activeSection === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center text-center">
              <div className="p-4 rounded-2xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mb-4">
                <Package className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Inventário Geral</h4>
              <p className="text-[11px] text-slate-500 mt-1 mb-4">Lista completa de produtos e saldos atuais.</p>
              <button
                onClick={async () => {
                  const data = await api.getProducts();
                  exportToExcel(data, 'Inventario_Geral_CEET', 'Produtos');
                }}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Gerar Excel
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center text-center">
              <div className="p-4 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Estoque Crítico</h4>
              <p className="text-[11px] text-slate-500 mt-1 mb-4">Produtos com saldo abaixo do mínimo (RN-018).</p>
              <button
                onClick={async () => {
                  const data = await api.getProducts();
                  const filtered = data.filter(p => p.current_stock <= p.minimum_stock);
                  exportToExcel(filtered, 'Estoque_Critico_CEET', 'Critico');
                }}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Gerar Excel
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center text-center">
              <div className="p-4 rounded-2xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 mb-4">
                <Clock className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Lotes a Vencer</h4>
              <p className="text-[11px] text-slate-500 mt-1 mb-4">Controle de validade (30 dias) - RN-011/RN-012.</p>
              <button
                onClick={async () => {
                  const data = await api.getProducts();
                  const expiring: any[] = [];
                  data.forEach(p => {
                    p.batches?.forEach(b => {
                      const exp = new Date(b.expiration_date);
                      const diff = (exp.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
                      if (diff <= 30) {
                        expiring.push({
                          Código: p.code,
                          Produto: p.name,
                          Lote: b.batch_number,
                          Vencimento: b.expiration_date,
                          Saldo: b.quantity,
                          Dias: Math.ceil(diff)
                        });
                      }
                    });
                  });
                  exportToExcel(expiring, 'Lotes_Vencimento_CEET', 'Validade');
                }}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Gerar Excel
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center text-center">
              <div className="p-4 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-4">
                <ArrowRightLeft className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Movimentação</h4>
              <p className="text-[11px] text-slate-500 mt-1 mb-4">Histórico rastreável de entradas e saídas (RN-008).</p>
              <button
                onClick={async () => {
                  const data = await api.getStockMovements();
                  exportToExcel(data, 'Movimentacao_Estoque_CEET', 'Movimentos');
                }}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Gerar Excel
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Relatório Gerencial de Impressão</h3>
            <p className="text-xs text-slate-500 mb-6">Gere uma via impressa (ou PDF) com o timbre oficial para conferência física no Almoxarifado.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={async () => {
                  const data = await api.getProducts();
                  const html = `
                    <table>
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Produto</th>
                          <th>Categoria</th>
                          <th>Saldo Atual</th>
                          <th>Unidade</th>
                          <th>Mínimo</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${data.map(p => `
                          <tr>
                            <td>${p.code}</td>
                            <td>${p.name}</td>
                            <td>${p.category_name || 'N/A'}</td>
                            <td>${p.current_stock}</td>
                            <td>${p.unit_abbreviation || 'un'}</td>
                            <td>${p.minimum_stock}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  `;
                  exportToPrint('Relatório de Inventário Geral para Conferência', html);
                }}
                className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <Printer className="w-4 h-4" />
                Imprimir Inventário Atual
              </button>
              
              <button
                onClick={async () => {
                  const data = await api.getSuppliers();
                  const html = `
                    <table>
                      <thead>
                        <tr>
                          <th>Nome Fantasia</th>
                          <th>Razão Social</th>
                          <th>CNPJ</th>
                          <th>E-mail</th>
                          <th>Telefone</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${data.map(s => `
                          <tr>
                            <td>${s.trade_name}</td>
                            <td>${s.corporate_name}</td>
                            <td>${s.cnpj}</td>
                            <td>${s.email || '-'}</td>
                            <td>${s.phone || '-'}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  `;
                  exportToPrint('Relação de Fornecedores Homologados CEET', html);
                }}
                className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-2"
              >
                <Truck className="w-4 h-4" />
                Imprimir Fornecedores
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO: EXPLORADOR DE BANCO DE DADOS (JSON) */}
      {activeSection === 'database' && isAdmin && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <span>Conteúdo Bruto do Banco de Dados (ceet_database.json)</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                title="Recarregar dados do servidor"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleExportBackup}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="w-4 h-4" />
                <span>Download JSON</span>
              </button>
            </div>
          </div>
          
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed">
                {databaseRaw ? JSON.stringify(databaseRaw, null, 2) : 'Carregando dados estruturais...'}
              </pre>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Usuários', count: databaseRaw?.users?.length || 0 },
              { label: 'Produtos', count: databaseRaw?.products?.length || 0 },
              { label: 'Movimentações', count: databaseRaw?.movements?.length || 0 },
              { label: 'Logs Auditoria', count: databaseRaw?.auditLogs?.length || 0 },
            ].map((stat, i) => (
              <div key={i} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase">{stat.label}</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{stat.count}</p>
              </div>
            ))}
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
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={handleExportBackup}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Backup Institucional (JSON)</span>
              </button>
              
              <button
                onClick={() => backupInputRef.current?.click()}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>Restaurar Backup</span>
              </button>
              <input type="file" ref={backupInputRef} className="hidden" accept=".json" onChange={handleImportBackup} />

              <button
                onClick={handleResetStock}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 border border-red-200 dark:border-red-900/50 transition-all shadow-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>🔄 Resetar Estoque</span>
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
      {/* MODALS DE CONFIRMAÇÃO */}
      <ConfirmationModal
        isOpen={showResetStockModal}
        onClose={() => setShowResetStockModal(false)}
        onConfirm={executeResetStock}
        title="Resetar Estoque"
        message="ATENÇÃO: Deseja realizar o RESET DO ESTOQUE? Isso excluirá TODOS os produtos cadastrados, lotes, patrimônios e históricos de movimentação para um recomeço limpo. Esta ação não pode ser desfeita."
        confirmText="Resetar Estoque"
        type="warning"
      />
    </div>
  );
};
