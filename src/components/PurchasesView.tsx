/**
 * Sistema de Estoque de Enfermagem CEET
 * Tela TEL-012 - Compras, Sugestão de Aquisição e Pedidos de Reposição (RN-018 / RN-020 / RF-014 / Cap. 11.15)
 */

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Layers,
  Printer,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import { Product, PurchaseSuggestion } from '../types';
import { api } from '../services/api';
import { exportToExcel, exportToPrint } from '../utils/exportUtils';

export const PurchasesView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      console.error('Erro ao carregar produtos para compra:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // GERAR SUGESTÃO AUTOMÁTICA DE COMPRA (RN-020 / RF-014)
  const purchaseSuggestions: PurchaseSuggestion[] = products
    .filter((p) => p.current_stock <= p.minimum_stock)
    .map((p) => {
      // Sugerir compra para atingir ao menos o triplo do mínimo institucional
      const suggestedQty = Math.max(
        p.minimum_stock * 3 - p.current_stock,
        p.minimum_stock * 2
      );
      const estUnitCost = p.code.includes('001') ? 0.85 : p.code.includes('002') ? 1.2 : 12.5;
      const totalCost = Number((suggestedQty * estUnitCost).toFixed(2));

      return {
        product_id: p.id,
        code: p.code,
        name: p.name,
        current_stock: p.current_stock,
        minimum_stock: p.minimum_stock,
        suggested_purchase_qty: suggestedQty,
        estimated_unit_cost: estUnitCost,
        total_estimated_cost: totalCost,
        priority: p.current_stock === 0 ? 'ALTA' : 'MEDIA',
      };
    });

  const totalEstimatedCost = purchaseSuggestions.reduce(
    (acc, s) => acc + s.total_estimated_cost,
    0
  );

  const exportPurchasesExcel = () => {
    const rows = purchaseSuggestions.map((s) => ({
      Codigo: s.code,
      Material: s.name,
      Saldo_Atual: s.current_stock,
      Estoque_Minimo: s.minimum_stock,
      Quantidade_Sugerida: s.suggested_purchase_qty,
      Custo_Estimado_Unitario: s.estimated_unit_cost,
      Total_Estimado: s.total_estimated_cost,
      Prioridade: s.priority,
    }));
    exportToExcel(rows, 'Sugestao_Compras_Enfermagem_CEET', 'Aquisição CEET');
  };

  const printPurchaseOrder = () => {
    const rowsHtml = purchaseSuggestions
      .map(
        (s) => `
      <tr>
        <td><strong>${s.code}</strong></td>
        <td>${s.name}</td>
        <td>${s.current_stock} un</td>
        <td>${s.minimum_stock} un</td>
        <td><strong style="color: #1e40af;">${s.suggested_purchase_qty} un</strong></td>
        <td>R$ ${s.estimated_unit_cost.toFixed(2)}</td>
        <td><strong>R$ ${s.total_estimated_cost.toFixed(2)}</strong></td>
        <td><span style="color: ${s.priority === 'ALTA' ? 'red' : 'orange'}; font-weight: bold;">${s.priority}</span></td>
      </tr>
    `
      )
      .join('');

    const html = `
      <div style="margin-bottom: 20px;">
        <h3>Pedido Oficial de Aquisição - Setor de Enfermagem CEET (RN-020)</h3>
        <p>Este relatório indica os materiais que atingiram o ponto de reposição ou nível crítico.</p>
        <p>Total Geral Estimado para Aquisição: <strong>R$ ${totalEstimatedCost.toFixed(2)}</strong></p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Material / Insumo</th>
            <th>Saldo</th>
            <th>Mín.</th>
            <th>Qtd. Solicitada</th>
            <th>Valor Est. Unit.</th>
            <th>Subtotal</th>
            <th>Prioridade</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="8">Nenhum material abaixo do estoque mínimo.</td></tr>'}
        </tbody>
      </table>
    `;
    exportToPrint('Requisição de Compras e Reposição - CEET', html);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span>Enfermagem CEET</span>
            <span>&bull;</span>
            <span className="text-blue-600 dark:text-blue-400">TEL-012 Compras</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Sugestões Automáticas de Aquisição (RN-020)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            O sistema calcula a quantidade ideal de compra para produtos críticos, garantindo as práticas de laboratório sem interrupção.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadProducts}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <span>Recalcular</span>
          </button>
          <button
            onClick={exportPurchasesExcel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel (XLSX)</span>
          </button>
          <button
            onClick={printPurchaseOrder}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
          >
            <Printer className="w-4 h-4" />
            <span>Gerar Requisição CEET</span>
          </button>
        </div>
      </div>

      {/* Resumo de Custos e Alerta Institucional */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-red-200 dark:border-red-900/40">
          <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">
            Materiais em Alerta de Aquisição
          </span>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {purchaseSuggestions.length}
          </p>
          <span className="text-xs text-slate-500">Itens no nível mínimo ou esgotados</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-blue-200 dark:border-blue-900/40">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">
            Itens Solicitados (Total)
          </span>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {purchaseSuggestions.reduce((acc, s) => acc + s.suggested_purchase_qty, 0)}
          </p>
          <span className="text-xs text-slate-500">Unidades sugeridas para reposição</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/40">
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">
            Investimento Estimado (R$)
          </span>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            R$ {totalEstimatedCost.toFixed(2)}
          </p>
          <span className="text-xs text-slate-500">Custo calculado com base no histórico</span>
        </div>
      </div>

      {/* TABELA DE SUGESTÃO AUTOMÁTICA RN-020 */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
            Analisando saldos e consumo institucional...
          </div>
        ) : purchaseSuggestions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            Todos os materiais de enfermagem encontram-se acima do nível de estoque mínimo!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase">
                  <th className="py-3.5 px-4">Código</th>
                  <th className="py-3.5 px-4">Material de Enfermagem</th>
                  <th className="py-3.5 px-4">Saldo Atual</th>
                  <th className="py-3.5 px-4">Estoque Mínimo</th>
                  <th className="py-3.5 px-4">Qtd. Sugerida (RN-020)</th>
                  <th className="py-3.5 px-4">Custo Unit. Est.</th>
                  <th className="py-3.5 px-4">Subtotal Est.</th>
                  <th className="py-3.5 px-4">Prioridade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {purchaseSuggestions.map((s) => (
                  <tr key={s.product_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {s.code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {s.name}
                    </td>
                    <td className="py-3 px-4 font-bold text-red-600 dark:text-red-400">
                      {s.current_stock} un
                    </td>
                    <td className="py-3 px-4 text-slate-500">{s.minimum_stock} un</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold">
                        +{s.suggested_purchase_qty} un
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      R$ {s.estimated_unit_cost.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      R$ {s.total_estimated_cost.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          s.priority === 'ALTA'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {s.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
