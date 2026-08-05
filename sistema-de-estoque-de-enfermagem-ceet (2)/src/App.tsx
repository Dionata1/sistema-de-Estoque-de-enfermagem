/**
 * Sistema de Estoque de Enfermagem CEET
 * Aplicação Principal & Gerenciamento de Estado, Módulos e Alertas Institucionais
 * Centro Estadual de Educação Técnica Giuseppe Altoé - CEET
 */

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Package,
  X,
} from 'lucide-react';
import { User, Role } from './types';
import { initialUsers } from './server/seedData';
import { api } from './services/api';

// Módulos UI do Sistema CEET (Capítulo 11 - Telas)
import { Layout } from './components/Layout';
import { DashboardView } from './components/DashboardView';
import { ProductsView } from './components/ProductsView';
import { StockOperationsView } from './components/StockOperationsView';
import { InventoryAndHistoryView } from './components/InventoryAndHistoryView';
import { PurchasesView } from './components/PurchasesView';
import { AdminAndMasterDataView } from './components/AdminAndMasterDataView';
import { LoginModal } from './components/LoginModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [subFilter, setSubFilter] = useState<string | undefined>(undefined);
  const [currentUser, setCurrentUser] = useState<User>(initialUsers[0]); // Administrador CEET padrão
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<
    { id: string; type: 'CRITICO' | 'VENCIDO' | 'A_VENCER'; title: string; subtitle: string }[]
  >([]);

  // Sincronizar tema no HTML
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Carregar usuário salvo ou carregar lista de usuários da API
  useEffect(() => {
    const loadUserAndAlerts = async () => {
      try {
        const [users, stats, prods] = await Promise.all([
          api.getUsers(),
          api.getDashboardStats(),
          api.getProducts(),
        ]);

        if (users && users.length > 0) {
          const savedId = localStorage.getItem('ceet_active_user_id');
          const found = savedId ? users.find((u) => String(u.id) === savedId) : null;
          setCurrentUser(found || users[0]);
        }

        // Construir lista de alertas em tempo real (RN-011, RN-012, RN-018)
        const currentAlerts: {
          id: string;
          type: 'CRITICO' | 'VENCIDO' | 'A_VENCER';
          title: string;
          subtitle: string;
        }[] = [];

        prods.forEach((p) => {
          if (p.current_stock <= p.minimum_stock) {
            currentAlerts.push({
              id: `crit-${p.id}`,
              type: 'CRITICO',
              title: `[${p.code}] ${p.name}`,
              subtitle: `Saldo crítico: ${p.current_stock} un (Mínimo: ${p.minimum_stock} un) - RN-018`,
            });
          }
          p.batches?.forEach((b) => {
            const exp = new Date(b.expiration_date);
            const today = new Date();
            const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));

            if (diffDays <= 0) {
              currentAlerts.push({
                id: `venc-${b.id}`,
                type: 'VENCIDO',
                title: `Lote #${b.batch_number} - ${p.name}`,
                subtitle: `Lote vencido em ${b.expiration_date} (Saldo: ${b.quantity} un) - RN-011`,
              });
            } else if (diffDays <= 30) {
              currentAlerts.push({
                id: `avenc-${b.id}`,
                type: 'A_VENCER',
                title: `Lote #${b.batch_number} - ${p.name}`,
                subtitle: `Vence em ${diffDays} dias (${b.expiration_date}) - RN-012`,
              });
            }
          });
        });

        setAlerts(currentAlerts);
      } catch (err) {
        console.error('Erro ao inicializar alertas CEET:', err);
      }
    };

    loadUserAndAlerts();
  }, []);

  const handleNavigate = (tab: string, filter?: string) => {
    setActiveTab(tab);
    if (filter) {
      setSubFilter(filter);
    } else {
      setSubFilter(undefined);
    }
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigateTab={handleNavigate} />;
      case 'products':
        return (
          <ProductsView
            currentUser={currentUser}
            initialFilterStatus={subFilter}
          />
        );
      case 'categories':
        return (
          <AdminAndMasterDataView
            currentUser={currentUser}
            activeSection="categories"
          />
        );
      case 'manufacturers':
        return (
          <AdminAndMasterDataView
            currentUser={currentUser}
            activeSection="manufacturers"
          />
        );
      case 'suppliers':
        return (
          <AdminAndMasterDataView
            currentUser={currentUser}
            activeSection="suppliers"
          />
        );
      case 'entry':
        return (
          <StockOperationsView
            currentUser={currentUser}
            initialMode="entry"
            onNavigateTab={handleNavigate}
          />
        );
      case 'output':
        return (
          <StockOperationsView
            currentUser={currentUser}
            initialMode="output"
            onNavigateTab={handleNavigate}
          />
        );
      case 'inventory':
        return (
          <InventoryAndHistoryView
            currentUser={currentUser}
            initialMode="inventory"
          />
        );
      case 'history':
        return (
          <InventoryAndHistoryView
            currentUser={currentUser}
            initialMode="history"
          />
        );
      case 'purchases':
        return <PurchasesView />;
      case 'reports':
        return (
          <AdminAndMasterDataView
            currentUser={currentUser}
            activeSection="reports"
          />
        );
      case 'users':
        return (
          <AdminAndMasterDataView
            currentUser={currentUser}
            activeSection="users"
          />
        );
      case 'audit':
        return (
          <AdminAndMasterDataView
            currentUser={currentUser}
            activeSection="audit"
          />
        );
      case 'settings':
        return (
          <AdminAndMasterDataView
            currentUser={currentUser}
            activeSection="settings"
          />
        );
      default:
        return <DashboardView onNavigateTab={handleNavigate} />;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={(tab) => {
        setActiveTab(tab);
        setSubFilter(undefined);
      }}
      currentUser={currentUser}
      setCurrentUser={setCurrentUser}
      isDarkMode={isDarkMode}
      setIsDarkMode={setIsDarkMode}
      notificationCount={alerts.length}
      onOpenNotifications={() => setShowNotificationsModal(true)}
      onOpenLoginModal={() => setShowLoginModal(true)}
      onOpenPrivacyPolicy={() => setShowPrivacyPolicyModal(true)}
    >
      {renderActiveView()}

      {/* MODAL OFICIAL DE ALERTAS E NOTIFICAÇÕES (RN-011 / RN-012 / RN-018 / RN-046) */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Central de Alertas de Estoque &bull; CEET
                  </h3>
                  <p className="text-xs text-slate-500">
                    Monitoramento contínuo de saldos críticos e vencimento de lotes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNotificationsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                  Nenhum alerta crítico ou lote a vencer detectado no sistema!
                </div>
              ) : (
                alerts.map((a) => (
                  <div
                    key={a.id}
                    className={`p-4 rounded-2xl border flex items-start gap-3 transition-colors ${
                      a.type === 'VENCIDO'
                        ? 'border-red-200 bg-red-50/70 dark:border-red-900/40 dark:bg-red-950/20'
                        : a.type === 'CRITICO'
                        ? 'border-amber-200 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20'
                        : 'border-blue-200 bg-blue-50/70 dark:border-blue-900/40 dark:bg-blue-950/20'
                    }`}
                  >
                    <div className="mt-0.5">
                      {a.type === 'VENCIDO' ? (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      ) : a.type === 'CRITICO' ? (
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      ) : (
                        <Calendar className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            a.type === 'VENCIDO'
                              ? 'text-red-700 dark:text-red-300'
                              : a.type === 'CRITICO'
                              ? 'text-amber-700 dark:text-amber-300'
                              : 'text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {a.type === 'VENCIDO' && 'LOTE VENCIDO (RN-011)'}
                          {a.type === 'CRITICO' && 'ESTOQUE CRÍTICO (RN-018)'}
                          {a.type === 'A_VENCER' && 'LOTE A VENCER (< 30 DIAS) (RN-012)'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                        {a.title}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {a.subtitle}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">
                Lotes vencidos devem ser retirados de circulação (RN-011).
              </span>
              <button
                onClick={() => {
                  setShowNotificationsModal(false);
                  handleNavigate('purchases');
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                Ir para Compras e Reposição &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AUTENTICAÇÃO E SENHA FORTE COM PROTEÇÃO CEET */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          setShowLoginModal(false);
        }}
        currentUser={currentUser}
        onOpenPrivacyPolicy={() => {
          setShowLoginModal(false);
          setShowPrivacyPolicyModal(true);
        }}
      />

      {/* MODAL DE POLÍTICA DE PRIVACIDADE INSTITUCIONAL LGPD (LEI 13.709/2018) */}
      <PrivacyPolicyModal
        isOpen={showPrivacyPolicyModal}
        onClose={() => setShowPrivacyPolicyModal(false)}
      />
    </Layout>
  );
}
