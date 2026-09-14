/**
 * Sistema de Estoque de Enfermagem CEET
 * Layout Principal (Header Fixo, Sidebar Recolhível com Controle de Permissões RBAC e Footer Oficial - Cap. 10 e 11)
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Box,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Database,
  DownloadCloud,
  FileText,
  Folder,
  HelpCircle,
  History,
  Layers,
  LogOut,
  MapPin,
  Moon,
  PackagePlus,
  PackageMinus,
  Settings as SettingsIcon,
  Shield,
  Sun,
  Truck,
  UserCheck,
  Users,
  Search,
  Bell,
  Sparkles,
  Building2,
  Stethoscope,
  HeartPulse,
  Wrench,
  GraduationCap,
  ArrowRightLeft,
  ShieldAlert,
  LifeBuoy,
  Menu,
  X,
} from 'lucide-react';
import { User, Role } from '../types';
import { AIAssistant } from './common/AIAssistant';
import { initialUsers } from '../server/seedData';
import { api } from '../services/api';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  notificationCount: number;
  onOpenNotifications: () => void;
  onOpenLoginModal?: () => void;
  onOpenPrivacyPolicy?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  currentUser,
  setCurrentUser,
  isDarkMode,
  setIsDarkMode,
  notificationCount,
  onOpenNotifications,
  onOpenLoginModal,
  onOpenPrivacyPolicy,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>(initialUsers);

  useEffect(() => {
    if (currentUser.role !== 'ADMIN') {
      setAllUsers([currentUser]);
      return;
    }
    api.getUsers().then((users) => {
      if (users && users.length > 0) setAllUsers(users);
    }).catch(() => setAllUsers([currentUser]));
  }, [currentUser]);

  // Menu Oficial (Cap. 11.3 - Fluxo Geral de Navegação)
  const menuSections = [
    {
      label: 'Visão Geral',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart2, roles: ['ADMIN', 'ESTOQUE', 'PROFESSOR', 'COORDENACAO', 'FUNCIONARIO', 'ESTAGIARIO', 'TECNICO'] },
      ],
    },
    {
      label: 'Cadastros (TEL-003 a 007)',
      items: [
        { id: 'products', label: 'Produtos e Materiais', icon: Stethoscope, roles: ['ADMIN', 'ESTOQUE', 'PROFESSOR', 'COORDENACAO', 'FUNCIONARIO', 'ESTAGIARIO', 'TECNICO'] },
        { id: 'categories', label: 'Categorias', icon: Folder, roles: ['ADMIN', 'ESTOQUE'] },
        { id: 'manufacturers', label: 'Fabricantes', icon: Building2, roles: ['ADMIN', 'ESTOQUE'] },
        { id: 'suppliers', label: 'Fornecedores', icon: Truck, roles: ['ADMIN', 'ESTOQUE'] },
        { id: 'locations', label: 'Localizações', icon: MapPin, roles: ['ADMIN', 'ESTOQUE'] },
        { id: 'units', label: 'Unidades de Medida', icon: PackagePlus, roles: ['ADMIN', 'ESTOQUE'] },
      ],
    },
    {
      label: 'Gestão Operacional',
      items: [
        { id: 'patrimony', label: 'Patrimônio', icon: Building2, roles: ['ADMIN', 'ESTOQUE', 'TECNICO', 'COORDENACAO'] },
        { id: 'maintenance', label: 'Manutenção', icon: Wrench, roles: ['ADMIN', 'ESTOQUE', 'TECNICO'] },
        { id: 'lessons', label: 'Aulas Práticas', icon: GraduationCap, roles: ['ADMIN', 'PROFESSOR', 'COORDENACAO', 'ESTOQUE'] },
        { id: 'loans', label: 'Empréstimos', icon: ArrowRightLeft, roles: ['ADMIN', 'ESTOQUE', 'PROFESSOR', 'COORDENACAO'] },
        { id: 'occurrences', label: 'Ocorrências', icon: ShieldAlert, roles: ['ADMIN', 'ESTOQUE', 'COORDENACAO'] },
      ],
    },
    {
      label: 'Movimentação (TEL-008 a 010)',
      items: [
        { id: 'entry', label: 'Entrada de Estoque', icon: PackagePlus, roles: ['ADMIN', 'ESTOQUE'] },
        { id: 'output', label: 'Saída (FEFO / FIFO)', icon: PackageMinus, roles: ['ADMIN', 'ESTOQUE'] },
        { id: 'inventory', label: 'Inventário Físico', icon: ClipboardList, roles: ['ADMIN', 'ESTOQUE'] },
      ],
    },
    {
      label: 'Gestão e Monitoramento',
      items: [
        { id: 'purchases', label: 'Compras e Sugestão', icon: Layers, roles: ['ADMIN', 'ESTOQUE', 'COORDENACAO'] },
        { id: 'history', label: 'Histórico & Rastreio', icon: History, roles: ['ADMIN', 'ESTOQUE', 'PROFESSOR', 'COORDENACAO'] },
        { id: 'reports', label: 'Relatórios & Exportação', icon: FileText, roles: ['ADMIN', 'ESTOQUE', 'PROFESSOR', 'COORDENACAO'] },
        { id: 'support', label: 'Central de Ajuda', icon: LifeBuoy, roles: ['ADMIN', 'ESTOQUE', 'PROFESSOR', 'COORDENACAO', 'TECNICO', 'ESTAGIARIO', 'FUNCIONARIO'] },
      ],
    },
    {
      label: 'Avançado (Super Admin)',
      items: [
        { id: 'users', label: 'Gerenciamento de Usuários', icon: Users, roles: ['ADMIN'] },
        { id: 'audit', label: 'Auditoria de Ações', icon: Shield, roles: ['ADMIN'] },
        { id: 'database', label: 'Banco de Dados (JSON)', icon: Database, roles: ['ADMIN', 'ESTOQUE', 'PROFESSOR', 'COORDENACAO'] },
        { id: 'settings', label: 'Configurações e Backup', icon: SettingsIcon, roles: ['ADMIN', 'ESTOQUE', 'PROFESSOR', 'COORDENACAO'] },
      ],
    },
  ];

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 rounded-full">Super Admin</span>;
      case 'ESTOQUE':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-full">Estoque</span>;
      case 'PROFESSOR':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 rounded-full">Professor</span>;
      case 'COORDENACAO':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded-full">Coordenação</span>;
      case 'FUNCIONARIO':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 rounded-full">Funcionário</span>;
      case 'ESTAGIARIO':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 rounded-full">Estagiário</span>;
      case 'TECNICO':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 rounded-full">Técnico</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">{role}</span>;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      {/* HEADER FIXO - Cap. 10.5 Header */}
      <header className="sticky top-0 z-40 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Alternar Menu"
          >
            {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-bold text-lg">
              CE
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                Sistema de Estoque de Enfermagem CEET
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Centro Estadual de Educação Técnica Giuseppe Altoé &bull; v1.0.0
              </p>
            </div>
          </div>
        </div>

        {/* Ações e Notificações no Cabeçalho */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Botão Acesso Seguro / Senha Forte */}
          <button
            onClick={onOpenLoginModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all border border-blue-500/20"
            title="Autenticação Segura com Senha Forte e Política de Segurança"
          >
            <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Acesso Seguro</span>
          </button>

          {/* Botão de Notificações RN-046 / RN-012 */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Alertas e Notificações de Estoque"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {notificationCount}
              </span>
            )}
          </button>

          {/* Botão Global CEET IA Core */}
          <div className="hidden sm:block">
            <AIAssistant 
              category="GESTAO" 
              context="Global / Navegação" 
              data={{ activeTab, user: currentUser.name }} 
              buttonText="IA Suporte"
            />
          </div>

          {/* Botão Tema Claro/Escuro - Cap 10.26 */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Alternar Tema (Claro / Escuro)"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Seletor de Usuário e Perfil CEET (Permite alternar papéis para testes RN-025 / RBAC) */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              {currentUser.photo_url ? (
                <img src={currentUser.photo_url} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-xs uppercase">
                  {currentUser.name.slice(0, 2)}
                </div>
              )}
              <div className="hidden md:flex flex-col items-start text-left">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 max-w-[130px] truncate">
                  {currentUser.name}
                </span>
                {getRoleBadge(currentUser.role)}
              </div>
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Alternar Perfil Oficial (Testes RBAC - Cap. 1.6)
                  </p>
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {allUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setCurrentUser(u);
                        localStorage.setItem('ceet_active_user_id', String(u.id));
                        setShowUserDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                        u.id === currentUser.id ? 'bg-blue-50/60 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      {u.photo_url ? (
                        <img src={u.photo_url} alt={u.name} className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {u.name.slice(0, 2)}
                        </div>
                      )}
                      <div className="flex-1 flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {u.name}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {u.email}
                        </span>
                      </div>
                      {getRoleBadge(u.role)}
                    </button>
                  ))}
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1 px-2 space-y-1">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onOpenLoginModal && onOpenLoginModal();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2 transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    Login Seguro &amp; Trocar Senha
                  </button>
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onOpenPrivacyPolicy && onOpenPrivacyPolicy();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-slate-400" />
                    Política de Privacidade (LGPD)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* CORPO PRINCIPAL COM SIDEBAR - Cap. 10.4 Layout */}
      <div className="flex flex-1">
        {/* SIDEBAR RECOLHÍVEL - Cap. 10.6 Sidebar */}
        <aside
          className={`${
            sidebarCollapsed ? 'w-20' : 'w-64'
          } bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col justify-between shrink-0 shadow-xs`}
        >
          <div className="py-4 px-3 overflow-y-auto flex-1 space-y-6">
            {menuSections.map((section, idx) => {
              // Filtrar itens acessíveis pelo papel (RBAC Cap. 13.10)
              const allowedItems = section.items.filter((item) =>
                item.roles.includes(currentUser.role)
              );
              if (allowedItems.length === 0) return null;

              return (
                <div key={idx}>
                  {!sidebarCollapsed && (
                    <h3 className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {section.label}
                    </h3>
                  )}
                  <div className="space-y-1">
                    {allowedItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title={sidebarCollapsed ? item.label : undefined}
                        >
                          <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : ''}`} />
                          {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Indicador de Status Institucional no Rodapé da Sidebar */}
          {!sidebarCollapsed && (
            <div className="p-3 m-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 text-center">
              <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Estoque CEET Online</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Hospitalidade &amp; Práticas
              </p>
            </div>
          )}
        </aside>

        {/* ÁREA DE CONTEÚDO PRINCIPAL */}
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* FOOTER OFICIAL - Cap. 10.7 Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 px-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            &copy; 2026 <strong>Centro Estadual de Educação Técnica Giuseppe Altoé (CEET)</strong> &bull; Setor de Enfermagem
          </span>
          <div className="flex items-center gap-4">
            <button
              onClick={onOpenPrivacyPolicy}
              className="hover:underline text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1"
            >
              <Shield className="w-3.5 h-3.5" />
              Política de Privacidade LGPD
            </button>
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
              Ambiente: Produção
            </span>
            <span>Versão: 1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
