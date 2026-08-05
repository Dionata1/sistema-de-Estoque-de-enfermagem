/**
 * Sistema de Estoque de Enfermagem CEET
 * Telas TEL-010 e TEL-011 - Inventário Físico, Ajuste Automático e Histórico de Rastreabilidade
 * (RF-035 / RF-011 / RN-034 / RN-035 / RN-042 a RN-044 / Cap. 11.13 e 11.14)
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  ClipboardCheck,
  ClipboardList,
  FileSpreadsheet,
  Filter,
  History,
  Printer,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  Product,
  StockMovement,
  Inventory,
  User,
} from '../types';
import { api } from '../services/api';
import { exportToExcel, exportToCSV, exportToPrint } from '../utils/exportUtils';

interface InventoryAndHistoryViewProps {
  currentUser: User;
  initialMode?: 'history' | 'inventory';
}

export const InventoryAndHistoryView: React.FC<InventoryAndHistoryViewProps> = ({
  currentUser,
  initialMode = 'history',
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'inventory'>(initialMode);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros do Histórico TEL-011
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  // Estados da Contagem de Inventário TEL-010
  const [inventoryItems, setInventoryItems] = useState<
    {
      product_id: number;
      product_name: string;
      product_code: string;
      expected_quantity: number;
      counted_quantity: number;
      difference: number;
      adjustment_generated: boolean;
    }[]
  >([]);
  const [inventoryObs, setInventoryObs] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [movs, invs, prods] = await Promise.all([
        api.getStockMovements(),
        api.getInventories(),
        api.getProducts(),
      ]);
      setMovements(movs);
      setInventories(invs);
      setProducts(prods);

      // Preencher tabela de contagem inicial com os produtos ativos
      if (prods.length > 0) {
        const initialCount = prods
          .filter((p) => p.active)
          .map((p) => ({
            product_id: p.id,
            product_name: p.name,
            product_code: p.code,
            expected_quantity: p.current_stock,
            counted_quantity: p.current_stock,
            difference: 0,
            adjustment_generated: false,
          }));
        setInventoryItems(initialCount);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico CEET:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCountChange = (productId: number, val: number) => {
    setInventoryItems((prev) =>
      prev.map((item) => {
        if (item.product_id === productId) {
          const counted = Number(val);
          const diff = counted - item.expected_quantity;
          return {
            ...item,
            counted_quantity: counted,
            difference: diff,
            adjustment_generated: diff !== 0,
          };
        }
        return item;
      })
    );
  };

  // Submeter Inventário e Gerar Ajustes (RN-034 / RN-035)
  const handleSubmitInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (currentUser.role === 'PROFESSOR' || currentUser.role === 'COORDENACAO') {
      setFormError('Apenas Administrador e Responsáveis de Estoque podem homologar inventário (RN-025).');
      return;
    }

    try {
      const res = await api.createInventory({
        observations: inventoryObs || 'Inventário Geral CEET do Setor de Enfermagem',
        items: inventoryItems,
      });

      if (!res.success) {
        setFormError(res.message || 'Erro ao registrar conferência de inventário.');
        return;
      }

      const changedCount = inventoryItems.filter((i) => i.difference !== 0).length;
      setFormSuccess(
        `✅ Inventário homologado com sucesso! ${changedCount} material(is) com divergência ajustado(s) automaticamente (RN-035).`
      );
      setInventoryObs('');
      await loadData();
    } catch (err) {
      setFormError('Erro de rede ao salvar inventário.');
    }
  };

  const filteredMovements = movements.filter((m) => {
    if (selectedType !== 'ALL' && m.movement_type !== selectedType) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        m.product_code.toLowerCase().includes(q) ||
        m.product_name.toLowerCase().includes(q) ||
        (m.reason && m.reason.toLowerCase().includes(q)) ||
        m.user_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportHistoryExcel = () => {
    const rows = filteredMovements.map((m) => ({
      ID: m.id,
      Data_Hora: new Date(m.created_at).toLocaleString('pt-BR'),
      Tipo: m.movement_type,
      Codigo: m.product_code,
      Material: m.product_name,
      Quantidade: m.quantity,
      Saldo_Anterior: m.balance_before,
      Saldo_Posterior: m.balance_after,
      Lote: m.batch_number || 'N/A',
      Responsavel: m.user_name,
      Motivo: m.reason || '',
    }));
    exportToExcel(rows, 'Historico_Movimentacao_CEET', 'Histórico');
  };

  const exportPhysicalInventoryExcel = () => {
    const rows = inventoryItems.map((item, idx) => ({
      'Nº': idx + 1,
      'CÓDIGO CEET': item.code,
      'DESCRIÇÃO / MATERIAL DE ENFERMAGEM CEET': item.name,
      'UNIDADE': item.unit_abbreviation,
      'ESTOQUE NO SISTEMA': item.system_stock,
      'CONTAGEM FÍSICA NO ARMÁRIO (PREENCHER)': '',
      'DIVERGÊNCIA IDENTIFICADA': '',
      'LOCALIZAÇÃO': item.location || '-',
    }));
    exportToExcel(rows, 'Planilha_Conferencia_Inventario_CEET', 'Inventário Físico CEET');
  };

  const printHistory = () => {
    const rowsHtml = filteredMovements
      .map(
        (m) => `
      <tr>
        <td>${new Date(m.created_at).toLocaleString('pt-BR')}</td>
        <td><strong>${m.movement_type}</strong></td>
        <td>[${m.product_code}] ${m.product_name}</td>
        <td><strong>${m.quantity > 0 ? '+' : ''}${m.quantity}</strong></td>
        <td>${m.balance_before} &rarr; ${m.balance_after}</td>
        <td>${m.user_name}</td>
        <td>${m.reason || '-'}</td>
      </tr>
    `
      )
      .join('');

    const html = `
      <h3>Relatório de Rastreabilidade e Histórico de Estoque - CEET (RF-043)</h3>
      <p>Total de Lançamentos listados: <strong>${filteredMovements.length}</strong></p>
      <table>
        <thead>
          <tr>
            <th>Data / Hora</th>
            <th>Operação</th>
            <th>Material</th>
            <th>Qtd.</th>
            <th>Saldo (Ant. &rarr; Novo)</th>
            <th>Responsável</th>
            <th>Justificativa</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="7">Nenhuma movimentação registrada no período.</td></tr>'}
        </tbody>
      </table>
    `;
    exportToPrint('Histórico de Movimentações CEET', html);
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span>Enfermagem CEET</span>
            <span>&bull;</span>
            <span className="text-blue-600 dark:text-blue-400">TEL-010 e TEL-011</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Histórico &amp; Inventário Físico
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhe a rastreabilidade completa das movimentações (RN-043) e faça conferência de almoxarifado (RN-035).
          </p>
        </div>

        <div className="inline-flex rounded-2xl bg-slate-200/70 dark:bg-slate-800 p-1">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico (TEL-011)</span>
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'inventory'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Inventário Físico (TEL-010)</span>
          </button>
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

      {/* TELA DE HISTÓRICOS (TEL-011 / RF-011) */}
      {activeTab === 'history' ? (
        <div className="space-y-4">
          {/* Filtros e Exportação */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filtrar por código, material ou justificativa..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold"
              >
                <option value="ALL">Todos os Tipos</option>
                <option value="ENTRADA">Entradas</option>
                <option value="SAIDA">Saídas (Aulas)</option>
                <option value="AJUSTE">Ajustes (Inventários)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportHistoryExcel}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Excel (XLSX)</span>
              </button>
              <button
                onClick={printHistory}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>

          {/* Tabela de Movimentações */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
                Carregando histórico permanente...
              </div>
            ) : filteredMovements.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
                Nenhuma movimentação compatível encontrada.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase">
                      <th className="py-3.5 px-4">Data / Hora</th>
                      <th className="py-3.5 px-4">Tipo</th>
                      <th className="py-3.5 px-4">Material de Enfermagem</th>
                      <th className="py-3.5 px-4">Qtd.</th>
                      <th className="py-3.5 px-4">Saldo (Ant. &rarr; Novo)</th>
                      <th className="py-3.5 px-4">Lote</th>
                      <th className="py-3.5 px-4">Responsável (RN-044)</th>
                      <th className="py-3.5 px-4">Justificativa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredMovements.map((m) => {
                      const isEntry = m.movement_type === 'ENTRADA';
                      const isOutput = m.movement_type === 'SAIDA';
                      return (
                        <tr
                          key={m.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                            {new Date(m.created_at).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                isEntry
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : isOutput
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              }`}
                            >
                              {m.movement_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            [{m.product_code}] {m.product_name}
                          </td>
                          <td className="py-3 px-4 font-bold text-sm">
                            <span
                              className={
                                m.quantity > 0 ? 'text-emerald-600' : 'text-red-600'
                              }
                            >
                              {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            <span className="text-slate-400">{m.balance_before}</span>{' '}
                            &rarr;{' '}
                            <strong className="text-slate-900 dark:text-white">
                              {m.balance_after}
                            </strong>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">
                            {m.batch_number || '-'}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                            {m.user_name}
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate">
                            {m.reason || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TELA DE INVENTÁRIO FÍSICO (TEL-010 / RF-035) */
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Conferência de Inventário Físico do Almoxarifado (RN-035)
              </h3>
              <p className="text-xs text-slate-500">
                Informe a quantidade contada nas prateleiras. Diferenças gerarão lançamentos de AJUSTE automaticamente.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={exportPhysicalInventoryExcel}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md shadow-emerald-500/20"
                title="Baixar Planilha Excel com todos os itens do estoque para contagem física nas prateleiras"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Planilha de Conferência CEET</span>
              </button>
              <button
                onClick={loadData}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recarregar Saldo do Banco</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmitInventory}>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 mb-6">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase">
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Material / Insumo</th>
                    <th className="py-3 px-4">Saldo do Sistema</th>
                    <th className="py-3 px-4 w-40">Contagem Física *</th>
                    <th className="py-3 px-4">Divergência</th>
                    <th className="py-3 px-4">Ajuste Automático?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {inventoryItems.map((item) => (
                    <tr
                      key={item.product_id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {item.product_code}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {item.product_name}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-500">
                        {item.expected_quantity} un
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min={0}
                          value={item.counted_quantity}
                          onChange={(e) =>
                            handleCountChange(item.product_id, Number(e.target.value))
                          }
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                        />
                      </td>
                      <td className="py-3 px-4 font-bold">
                        <span
                          className={
                            item.difference === 0
                              ? 'text-slate-400'
                              : item.difference > 0
                              ? 'text-emerald-600'
                              : 'text-red-600'
                          }
                        >
                          {item.difference > 0 ? `+${item.difference}` : item.difference} un
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {item.adjustment_generated ? (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[11px]">
                            Sim &bull; Gerar Ajuste
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Sem divergência</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <input
                type="text"
                value={inventoryObs}
                onChange={(e) => setInventoryObs(e.target.value)}
                placeholder="Observações do inventário (Ex: Conferência Mensal do Laboratório I)..."
                className="w-full sm:w-2/3 px-4 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all"
              >
                Homologar Inventário e Atualizar Saldo (RN-035)
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
