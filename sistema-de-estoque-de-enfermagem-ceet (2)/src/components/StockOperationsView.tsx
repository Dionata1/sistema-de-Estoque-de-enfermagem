/**
 * Sistema de Estoque de Enfermagem CEET
 * Telas TEL-008 e TEL-009 - Controle de Entradas e Saídas de Estoque com FEFO/FIFO e Proteção de Saldo Negativo
 * (RF-005 / RF-006 / RN-005 a RN-008 / RN-013 a RN-016)
 */

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  PackageMinus,
  PackagePlus,
  Plus,
  Trash2,
  Truck,
} from 'lucide-react';
import {
  Product,
  Supplier,
  StockEntryItem,
  StockOutputItem,
  User,
  Batch,
} from '../types';
import { api } from '../services/api';

interface StockOperationsViewProps {
  currentUser: User;
  initialMode?: 'entry' | 'output';
  onNavigateTab: (tab: string) => void;
}

export const StockOperationsView: React.FC<StockOperationsViewProps> = ({
  currentUser,
  initialMode = 'entry',
  onNavigateTab,
}) => {
  const [activeTab, setActiveTab] = useState<'entry' | 'output'>(initialMode);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de ENTRADA (TEL-008 / RF-005)
  const [supplierId, setSupplierId] = useState<number>(1);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [entryItems, setEntryItems] = useState<StockEntryItem[]>([]);
  const [entryProductId, setEntryProductId] = useState<number>(1);
  const [entryQty, setEntryQty] = useState<number>(10);
  const [entryBatch, setEntryBatch] = useState('');
  const [entryMfgDate, setEntryMfgDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryExpDate, setEntryExpDate] = useState('2028-12-31');
  const [entryObs, setEntryObs] = useState('');

  // Estados de SAÍDA (TEL-009 / RF-006)
  const [destSector, setDestSector] = useState('Laboratório de Práticas de Enfermagem I');
  const [outputReason, setOutputReason] = useState('Consumo em aula prática de punção venosa e curativos');
  const [outputItems, setOutputItems] = useState<StockOutputItem[]>([]);
  const [outputProductId, setOutputProductId] = useState<number>(1);
  const [outputQty, setOutputQty] = useState<number>(5);
  const [selectedBatchNumber, setSelectedBatchNumber] = useState<string>(''); // Opção FEFO ou lote específico

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, sups] = await Promise.all([api.getProducts(), api.getSuppliers()]);
      setProducts(prods);
      setSuppliers(sups);
      if (prods.length > 0) {
        setEntryProductId(prods[0].id);
        setOutputProductId(prods[0].id);
      }
      if (sups.length > 0) {
        setSupplierId(sups[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar dados para movimentação CEET:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setActiveTab(initialMode);
  }, [initialMode]);

  // SETORES INSTITUCIONAIS DO CEET
  const ceetSectors = [
    'Laboratório de Práticas de Enfermagem I',
    'Laboratório de Simulação Clínica e UTI',
    'Ambulatório de Especialidades CEET',
    'Estágio Hospitalar Supervisionado',
    'Aula Prática de Farmacologia e Cálculos',
    'Enfermagem Pediátrica / Maternidade',
  ];

  // ADICIONAR ITEM À LISTA DE ENTRADA
  const handleAddEntryItem = () => {
    setFormError('');
    if (entryQty <= 0) {
      setFormError('A quantidade da entrada deve ser maior que zero (RN-006).');
      return;
    }
    const prod = products.find((p) => p.id === entryProductId);
    if (!prod) return;

    if (new Date(entryExpDate) < new Date(entryMfgDate)) {
      setFormError('A data de validade não pode ser anterior à data de fabricação (RN-014).');
      return;
    }

    const newItem: StockEntryItem = {
      product_id: prod.id,
      product_name: prod.name,
      product_code: prod.code,
      batch_number: entryBatch.trim() || `L-${Date.now().toString().slice(-6)}`,
      manufacturing_date: entryMfgDate,
      expiration_date: entryExpDate,
      quantity: entryQty,
    };

    setEntryItems([...entryItems, newItem]);
    setEntryQty(10);
    setEntryBatch('');
  };

  // ADICIONAR ITEM À LISTA DE SAÍDA (Com validação RN-005 - Nunca Negativo)
  const handleAddOutputItem = () => {
    setFormError('');
    if (outputQty <= 0) {
      setFormError('A quantidade da saída deve ser maior que zero (RN-007).');
      return;
    }
    const prod = products.find((p) => p.id === outputProductId);
    if (!prod) return;

    // Calcular quanto já foi adicionado deste produto na lista atual
    const alreadyAdded = outputItems
      .filter((i) => i.product_id === prod.id)
      .reduce((acc, i) => acc + i.quantity, 0);

    const totalRequested = alreadyAdded + outputQty;

    // REGRA DE NEGÓCIO CRÍTICA RN-005: Estoque Nunca Negativo
    if (totalRequested > prod.current_stock) {
      setFormError(
        `Estoque insuficiente (RN-005)! Saldo disponível de [${prod.code}] é ${prod.current_stock} un. Você está tentando retirar ${totalRequested} un.`
      );
      return;
    }

    const newItem: StockOutputItem = {
      product_id: prod.id,
      product_name: prod.name,
      product_code: prod.code,
      batch_number: selectedBatchNumber || 'FEFO/FIFO Automático',
      quantity: outputQty,
    };

    setOutputItems([...outputItems, newItem]);
    setOutputQty(1);
    setSelectedBatchNumber('');
  };

  // SUBMETER ENTRADA AO SERVIDOR (RF-005 / RN-008)
  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (entryItems.length === 0) {
      setFormError('Adicione ao menos um item de material à entrada de estoque.');
      return;
    }

    try {
      const res = await api.createStockEntry({
        supplier_id: supplierId,
        invoice_number: invoiceNumber || 'S/N',
        observations: entryObs,
        items: entryItems,
      });

      if (!res.success) {
        setFormError(res.message || 'Erro ao registrar entrada.');
        return;
      }

      setFormSuccess(`✅ Entrada registrada com sucesso! ${entryItems.length} material(is) abastecido(s).`);
      setEntryItems([]);
      setInvoiceNumber('');
      setEntryObs('');
      await loadData();
    } catch (err) {
      setFormError('Falha de conexão ao processar entrada.');
    }
  };

  // SUBMETER SAÍDA AO SERVIDOR (RF-006 / RN-005 / RN-016 FEFO)
  const handleSubmitOutput = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (outputItems.length === 0) {
      setFormError('Adicione ao menos um item de material para registrar a saída.');
      return;
    }

    try {
      const res = await api.createStockOutput({
        destination_sector: destSector,
        reason: outputReason,
        items: outputItems,
      });

      if (!res.success) {
        setFormError(
          res.message ||
            'A operação foi cancelada pelo servidor por violação da regra RN-005 (Estoque Nunca Negativo).'
        );
        return;
      }

      setFormSuccess(
        `✅ Saída de estoque concluída com sucesso (${outputItems.length} materiais enviados para ${destSector})!`
      );
      setOutputItems([]);
      await loadData();
    } catch (err) {
      setFormError('Não foi possível registrar a saída.');
    }
  };

  const selectedProdForOutput = products.find((p) => p.id === outputProductId);

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DA TELA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span>Enfermagem CEET</span>
            <span>&bull;</span>
            <span className="text-blue-600 dark:text-blue-400">TEL-008 e TEL-009</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Movimentação Operacional de Estoque
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Realize entradas com notas fiscais, controle de lotes e saídas para aulas práticas com regra FEFO/FIFO.
          </p>
        </div>

        {/* ABAS DE ALTERNÂNCIA ENTRADA / SAÍDA */}
        <div className="inline-flex rounded-2xl bg-slate-200/70 dark:bg-slate-800 p-1">
          <button
            onClick={() => {
              setActiveTab('entry');
              setFormError('');
              setFormSuccess('');
            }}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'entry'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PackagePlus className="w-4 h-4" />
            <span>Entrada de Estoque (TEL-008)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('output');
              setFormError('');
              setFormSuccess('');
            }}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'output'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PackageMinus className="w-4 h-4" />
            <span>Saída de Aulas / Consumo (TEL-009)</span>
          </button>
        </div>
      </div>

      {formError && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-center gap-3 text-xs text-red-700 dark:text-red-300 font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          <span>{formError}</span>
        </div>
      )}

      {formSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-300 font-bold">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
          <span>{formSuccess}</span>
        </div>
      )}

      {/* TELA DE ENTRADA (TEL-008) */}
      {activeTab === 'entry' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna da Esquerda: Formulário de adição de item (2 colunas) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-blue-600" />
              <span>Dados do Recebimento &bull; Entrada no Estoque (RF-005)</span>
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Selecione o fornecedor, informe o número do documento/NF e adicione os lotes de recebimento.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Fornecedor *
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.trade_name} ({s.cnpj})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nota Fiscal / Nº Fatura *
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Ex: NF-e 45892 / CEET-2026"
                  className="w-full px-3 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Adicionar Material à Fatura (RN-015 Lotes &amp; RN-014 Validade)
              </h4>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Selecione o Material de Enfermagem *
                </label>
                <select
                  value={entryProductId}
                  onChange={(e) => setEntryProductId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name} (Saldo atual: {p.current_stock} {p.unit_abbreviation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quantidade *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={entryQty}
                    onChange={(e) => setEntryQty(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nº do Lote (RN-015)
                  </label>
                  <input
                    type="text"
                    value={entryBatch}
                    onChange={(e) => setEntryBatch(e.target.value)}
                    placeholder="L2026-X"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fabricação (RN-014)
                  </label>
                  <input
                    type="date"
                    value={entryMfgDate}
                    onChange={(e) => setEntryMfgDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Validade (RN-014) *
                  </label>
                  <input
                    type="date"
                    value={entryExpDate}
                    onChange={(e) => setEntryExpDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddEntryItem}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar à Lista de Entrada</span>
                </button>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Observações Operacionais
              </label>
              <textarea
                rows={2}
                value={entryObs}
                onChange={(e) => setEntryObs(e.target.value)}
                placeholder="Ex: Entrega conferida no laboratório pelo Setor de Estoque..."
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Coluna da Direita: Lista de Itens Prontos para Gravar */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Itens na Fatura ({entryItems.length})
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Confira os produtos antes de confirmar a gravação do saldo.
              </p>

              {entryItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  Nenhum material adicionado ainda.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {entryItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          [{item.product_code}] {item.product_name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Lote: {item.batch_number} &bull; Validade: {item.expiration_date}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          +{item.quantity} un
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEntryItems(entryItems.filter((_, i) => i !== idx))
                          }
                          className="text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
              <button
                type="button"
                onClick={handleSubmitEntry}
                disabled={entryItems.length === 0}
                className="w-full py-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white shadow-md shadow-emerald-500/20 transition-all"
              >
                Confirmar Entrada de Estoque (RF-005)
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* TELA DE SAÍDA / CONSUMO EM AULAS PRÁTICAS (TEL-009 / RF-006 / RN-016 FEFO) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna da Esquerda: Formulário de Saída */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <PackageMinus className="w-5 h-5 text-amber-600" />
              <span>Saída para Aulas Práticas e Laboratórios (RF-006)</span>
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Toda saída consome prioritariamente o lote com vencimento mais próximo segundo a regra FEFO/FIFO (RN-016).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Setor / Laboratório de Destino *
                </label>
                <select
                  value={destSector}
                  onChange={(e) => setDestSector(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  {ceetSectors.map((s, idx) => (
                    <option key={idx} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Finalidade / Disciplina *
                </label>
                <input
                  type="text"
                  value={outputReason}
                  onChange={(e) => setOutputReason(e.target.value)}
                  placeholder="Ex: Aula de Punção Venosa / Curativos"
                  className="w-full px-3 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Selecionar Material para Saída (RN-005: Estoque Nunca Negativo)
                </h4>
                <span className="text-[11px] font-bold text-slate-500">
                  Regra ativa: <strong className="text-blue-600">FEFO (First Expire First Out)</strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Material de Enfermagem *
                </label>
                <select
                  value={outputProductId}
                  onChange={(e) => setOutputProductId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name} (Disponível: {p.current_stock} {p.unit_abbreviation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quantidade Solicitada *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={selectedProdForOutput?.current_stock || 1000}
                    value={outputQty}
                    onChange={(e) => setOutputQty(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Lote Específico (Opcional - Padrão é FEFO)
                  </label>
                  <select
                    value={selectedBatchNumber}
                    onChange={(e) => setSelectedBatchNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">Consumir Automático (FEFO - Lote a vencer primeiro)</option>
                    {selectedProdForOutput?.batches?.map((b) => (
                      <option key={b.id} value={b.batch_number}>
                        Lote {b.batch_number} (Validade: {b.expiration_date} &bull; Saldo: {b.quantity})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-slate-500">
                  Saldo após essa retirada:{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {selectedProdForOutput
                      ? Math.max(0, selectedProdForOutput.current_stock - outputQty)
                      : 0}{' '}
                    {selectedProdForOutput?.unit_abbreviation}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={handleAddOutputItem}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar à Saída</span>
                </button>
              </div>
            </div>
          </div>

          {/* Coluna da Direita: Lista de Materiais para Saída */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Materiais da Aula / Consumo ({outputItems.length})
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Verifique os itens e o laboratório antes de confirmar a baixa.
              </p>

              {outputItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  Nenhum material adicionado ainda.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {outputItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          [{item.product_code}] {item.product_name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Política: {item.batch_number}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                          -{item.quantity} un
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setOutputItems(outputItems.filter((_, i) => i !== idx))
                          }
                          className="text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
              <button
                type="button"
                onClick={handleSubmitOutput}
                disabled={outputItems.length === 0}
                className="w-full py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white shadow-md shadow-blue-500/20 transition-all"
              >
                Confirmar Saída de Estoque (RF-006)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
