/**
 * Sistema de Estoque de Enfermagem CEET
 * Módulo de Relatórios e Exportações Institucionais (TEL-004 / TEL-006)
 */

import React, { useState } from 'react';
import {
  FileBarChart,
  Download,
  Printer,
  Calendar,
  Filter,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  AlertTriangle,
  History,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import { exportToExcel, exportToPrint } from '../utils/exportUtils';

export const ReportsView: React.FC<{ onNavigateTab?: (tab: string) => void }> = ({ onNavigateTab }) => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const exportInventoryComplete = async () => {
    setLoading(true);
    try {
      const products = await api.getProducts();
      const data = products.map((p, i) => ({
        'Nº': i + 1,
        'CÓDIGO': p.code,
        'MATERIAL': p.name,
        'SALDO ATUAL': p.current_stock,
        'UNIDADE': p.unit_abbreviation,
        'CATEGORIA': p.category_name,
        'LOCALIZAÇÃO': p.location,
        'STATUS': p.status_label
      }));
      exportToExcel(data, 'Relatorio_Estoque_Completo_CEET', 'Acervo Completo');
    } catch (error) {
      console.error('Erro na exportação:', error);
      alert('Erro ao gerar relatório.');
    } finally {
      setLoading(false);
    }
  };

  const exportMovements = async () => {
    setLoading(true);
    try {
      const movements = await api.getStockMovements();
      const data = movements.map((m, i) => ({
        'Nº': i + 1,
        'DATA': new Date(m.created_at).toLocaleDateString(),
        'TIPO': m.movement_type,
        'PRODUTO': m.product_name,
        'QUANTIDADE': m.quantity,
        'USUÁRIO': m.user_name,
        'MOTIVO': m.reason || '-'
      }));
      exportToExcel(data, 'Relatorio_Movimentacoes_Estoque_CEET', 'Movimentações');
    } catch (error) {
      console.error('Erro na exportação:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportCriticalMaterials = async () => {
    setLoading(true);
    try {
      const products = await api.getProducts({ status: 'CRITICO' });
      const data = products.map((p, i) => ({
        'Nº': i + 1,
        'CÓDIGO': p.code,
        'MATERIAL': p.name,
        'SALDO ATUAL': p.current_stock,
        'ESTOQUE MÍNIMO': p.minimum_stock,
        'DÉFICIT': p.minimum_stock - p.current_stock
      }));
      exportToExcel(data, 'Relatorio_Materiais_Criticos_CEET', 'Sugestão de Compra');
    } catch (error) {
       console.error('Erro na exportação:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileBarChart className="w-7 h-7 text-indigo-600" />
            Relatórios Institucionais CEET
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Exportação de dados para auditoria, controle de consumo e planejamento de compras
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Filtros e Parâmetros */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Período do Relatório</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Data Inicial</label>
                <input 
                  type="date" 
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-sm outline-hidden" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Data Final</label>
                <input 
                  type="date" 
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-sm outline-hidden" 
                />
              </div>
              <div className="pt-2">
                <button className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                  <Filter className="w-4 h-4" />
                  Aplicar Filtros Temporais
                </button>
              </div>
            </div>
          </div>

          <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="w-10 h-10 mb-4 opacity-50" />
            <h3 className="text-sm font-bold mb-2">Auditoria Institucional</h3>
            <p className="text-xs opacity-90 leading-relaxed">
              Todos os relatórios gerados contêm carimbo de data/hora e identificação do usuário responsável pela exportação, conforme normas de segurança do CEET.
            </p>
          </div>
        </div>

        {/* Lista de Relatórios Disponíveis */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Relatório 1: Estoque Completo */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Inventário Geral Completo</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Listagem oficial de todos os 88 itens cadastrados com saldo físico atual e localização.</p>
              <button 
                onClick={exportInventoryComplete}
                disabled={loading}
                className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-600 hover:text-white transition-all"
              >
                <span>Exportar XLSX</span>
                <Download className="w-4 h-4" />
              </button>
            </div>

            {/* Relatório 2: Movimentações */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <History className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Histórico de Movimentações</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Log detalhado de entradas (compras) e saídas (aulas) por período selecionado.</p>
              <button 
                onClick={exportMovements}
                disabled={loading}
                className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white transition-all"
              >
                <span>Exportar XLSX</span>
                <Download className="w-4 h-4" />
              </button>
            </div>

            {/* Relatório 3: Materiais Críticos */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Reposição de Itens Críticos</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Relatório de materiais abaixo do estoque mínimo. Essencial para o setor de compras.</p>
              <button 
                onClick={exportCriticalMaterials}
                disabled={loading}
                className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-red-600 hover:text-white transition-all"
              >
                <span>Gerar Sugestão de Compra</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Relatório 4: Impressão de Etiquetas / Inventário */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Printer className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Relatório para Conferência Física</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Folha de conferência formatada para impressão (PDF), facilitando o inventário rotativo.</p>
              <button 
                className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:text-white transition-all"
              >
                <span>Imprimir Folha de Conferência</span>
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
            <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">Relatórios Customizados</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
              Precisa de um cruzamento de dados específico para o setor administrativo ou pedagógico? Solicite via abertura de chamado no suporte.
            </p>
            <button 
              onClick={() => onNavigateTab && onNavigateTab('support')}
              className="px-6 py-2.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors"
            >
              Solicitar Novo Relatório
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
