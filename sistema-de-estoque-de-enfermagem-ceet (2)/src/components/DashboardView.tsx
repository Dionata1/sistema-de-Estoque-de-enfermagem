/**
 * Sistema de Estoque de Enfermagem CEET
 * Tela TEL-002 - Dashboard Gerencial & Indicadores Estratégicos (RF-009 / RN-017 / RN-018 / Cap. 11.5)
 */

import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Box,
  Calendar,
  CheckCircle,
  Download,
  FileSpreadsheet,
  Package,
  Printer,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DashboardStats, Product } from '../types';
import { api } from '../services/api';
import { exportToExcel, exportToCSV, exportToPrint } from '../utils/exportUtils';

interface DashboardViewProps {
  onNavigateTab: (tab: string, filter?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateTab }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [criticalProducts, setCriticalProducts] = useState<Product[]>([]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [data, prods] = await Promise.all([
        api.getDashboardStats(),
        api.getProducts({ status: 'CRITICO' }),
      ]);
      setStats(data);
      setCriticalProducts(prods);
    } catch (err) {
      console.error('Erro ao carregar dashboard CEET:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading || !stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  const exportSummaryExcel = () => {
    const summaryData = [
      { Indicador: 'Total de Produtos Cadastrados', Valor: stats.total_products },
      { Indicador: 'Estoque Total em Itens', Valor: stats.total_stock_items },
      { Indicador: 'Produtos em Nível Crítico (RN-018)', Valor: stats.critical_products_count },
      { Indicador: 'Lotes Vencidos (RN-011)', Valor: stats.expired_batches_count },
      { Indicador: 'Lotes a Vencer (< 30 dias) (RN-012)', Valor: stats.expiring_soon_count },
      { Indicador: 'Entradas no Período', Valor: stats.monthly_entries_count },
      { Indicador: 'Saídas no Período', Valor: stats.monthly_outputs_count },
    ];
    exportToExcel(summaryData, 'Indicadores_Estoque_CEET', 'Dashboard CEET');
  };

  const exportCompleteInventoryExcel = async () => {
    try {
      const allProducts = await api.getProducts();
      const rows = allProducts.map((p, idx) => ({
        'Nº': idx + 1,
        'CÓDIGO CEET': p.code,
        'DESCRIÇÃO / MATERIAL DE ENFERMAGEM CEET': p.name,
        'QUANTIDADE EM ESTOQUE': p.current_stock,
        'UNIDADE DE MEDIDA': p.unit_abbreviation,
        'CATEGORIA': p.category_name || 'Geral',
        'LOCALIZAÇÃO NO ARMÁRIO': p.location || '-',
        'STATUS DE ESTOQUE': p.status_label,
        'ESTOQUE MÍNIMO': p.minimum_stock,
        'FABRICANTE': p.manufacturer_name || '-',
        'CÓDIGO DE BARRAS': p.barcode || '-',
      }));
      exportToExcel(rows, 'Planilha_Oficial_Estoque_Completo_CEET', 'Acervo Completo (88 Itens)');
    } catch (err) {
      console.error('Erro ao exportar planilha completa de estoque CEET:', err);
      alert('Erro ao gerar planilha completa de estoque.');
    }
  };

  const printDashboard = () => {
    const rowsHtml = criticalProducts
      .map(
        (p) => `
      <tr>
        <td><strong>${p.code}</strong></td>
        <td>${p.name}</td>
        <td>${p.current_stock} ${p.unit_abbreviation}</td>
        <td>${p.minimum_stock} ${p.unit_abbreviation}</td>
        <td><strong style="color: #ef4444;">Abaixo do mínimo</strong></td>
      </tr>
    `
      )
      .join('');

    const html = `
      <div style="margin-bottom: 20px;">
        <h3 style="margin-bottom: 8px;">Indicadores Gerais do Setor de Enfermagem</h3>
        <p><strong>Total de Produtos:</strong> ${stats.total_products} &bull; <strong>Total de Itens Físicos:</strong> ${stats.total_stock_items}</p>
        <p><strong>Produtos Críticos (RN-018):</strong> ${stats.critical_products_count} &bull; <strong>Lotes Vencidos:</strong> ${stats.expired_batches_count}</p>
      </div>
      <h3>Relatório de Materiais Críticos para Aquisição (RN-020)</h3>
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Produto / Material</th>
            <th>Saldo Atual</th>
            <th>Estoque Mínimo</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="5">Nenhum produto em nível crítico.</td></tr>'}
        </tbody>
      </table>
    `;
    exportToPrint('Dashboard Gerencial & Materiais Críticos - CEET', html);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Cabeçalho da Página - Cap. 11.2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500">
            <span>Enfermagem CEET</span>
            <span>&bull;</span>
            <span className="text-blue-600 dark:text-blue-400">TEL-002 Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Dashboard Estratégico do Estoque
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhe indicadores em tempo real, materiais críticos, validade de lotes e consumo nas aulas práticas.
          </p>
        </div>

        {/* Barra de Ações Rápidas & Exportações */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <span>Atualizar</span>
          </button>
          <button
            onClick={exportCompleteInventoryExcel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md shadow-emerald-500/20"
            title="Baixar Planilha Excel Oficial com todos os 88 materiais do estoque CEET"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Planilha Completa CEET (88 Itens)</span>
          </button>
          <button
            onClick={exportSummaryExcel}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-700 hover:bg-slate-800 text-white transition-colors shadow-xs"
            title="Baixar XLSX de Indicadores"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Indicadores (XLSX)</span>
          </button>
          <button
            onClick={printDashboard}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Relatório</span>
          </button>
        </div>
      </div>

      {/* Grid de Cards de Indicadores (TEL-002 Widgets) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total de Produtos */}
        <div
          onClick={() => onNavigateTab('products')}
          className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Materiais Cadastrados
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {stats.total_products}
            </span>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              {stats.total_stock_items} itens em estoque
            </span>
          </div>
        </div>

        {/* Card 2: Produtos Críticos (RN-018) */}
        <div
          onClick={() => onNavigateTab('products', 'CRITICO')}
          className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-red-200 dark:border-red-900/50 shadow-xs hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
              Estoque Crítico (RN-018)
            </span>
            <div className="p-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-red-600 dark:text-red-400">
              {stats.critical_products_count}
            </span>
            <span className="text-xs text-red-500 dark:text-red-400">
              &le; Estoque Mínimo
            </span>
          </div>
        </div>

        {/* Card 3: Validade & Lotes Vencidos (RN-011 / RN-012) */}
        <div
          onClick={() => onNavigateTab('purchases')}
          className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-xs hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              A Vencer (&lt; 30 dias)
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {stats.expiring_soon_count}
            </span>
            <span className="text-xs font-semibold text-red-600 dark:text-red-400">
              {stats.expired_batches_count} lotes vencidos
            </span>
          </div>
        </div>

        {/* Card 4: Fluxo de Entrada/Saída no mês */}
        <div
          onClick={() => onNavigateTab('history')}
          className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Movimentações (Mês)
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="w-4 h-4" /> {stats.monthly_entries_count} Entradas
            </span>
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <ArrowDownRight className="w-4 h-4" /> {stats.monthly_outputs_count} Saídas
            </span>
          </div>
        </div>
      </div>

      {/* Gráficos Recharts e Resumos Estratégicos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Evolução Mensal de Entradas e Saídas (2 colunas) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Fluxo de Entradas e Saídas (Último Semestre CEET)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Quantidade de itens recebidos de fornecedores e distribuídos para práticas laboratoriais.
              </p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthly_flow_chart}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    color: '#fff',
                    border: 'none',
                  }}
                />
                <Legend />
                <Bar dataKey="entradas" name="Entradas (Itens)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="saidas" name="Saídas (Aulas/Consumo)" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Distribuição por Categoria (1 coluna) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Distribuição por Categoria
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Volume de estoque físico alocado no setor de enfermagem.
          </p>
          <div className="h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.category_distribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                >
                  {stats.category_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1.5 max-h-24 overflow-y-auto">
            {stats.category_distribution.map((cat, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{cat.name}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{cat.value} itens</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Seção Inferior: Tabela de Materiais Críticos + Ranking de Uso */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Materiais Críticos RN-018 */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Materiais Críticos para Reposição (RN-018)
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('purchases')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ver sugestão de compras &rarr;
            </button>
          </div>

          {criticalProducts.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              Nenhum material em nível crítico no momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase">
                    <th className="py-2.5">Código</th>
                    <th className="py-2.5">Produto</th>
                    <th className="py-2.5">Saldo</th>
                    <th className="py-2.5">Mínimo</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {criticalProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 font-bold text-slate-900 dark:text-white">{p.code}</td>
                      <td className="py-3 text-slate-700 dark:text-slate-300 max-w-[180px] truncate">
                        {p.name}
                      </td>
                      <td className="py-3 font-bold text-red-600 dark:text-red-400">
                        {p.current_stock} {p.unit_abbreviation}
                      </td>
                      <td className="py-3 text-slate-500">{p.minimum_stock}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                          CRÍTICO
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Materiais Mais Consumidos (Top 5) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Top Materiais Utilizados (Práticas de Enfermagem)
            </h3>
            <span className="text-xs text-slate-400">Frequência por Saída</span>
          </div>

          <div className="space-y-4">
            {stats.top_consumed_products.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
                    {idx + 1}º
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      {p.name}
                    </p>
                    <p className="text-[11px] text-slate-400">{p.code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {p.quantity}
                  </span>
                  <span className="text-[11px] text-slate-400 ml-1">unidades consumidas</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
