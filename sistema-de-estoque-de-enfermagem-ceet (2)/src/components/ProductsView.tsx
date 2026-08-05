/**
 * Sistema de Estoque de Enfermagem CEET
 * Telas TEL-003 e TEL-004 - Cadastro, Pesquisa, Filtros e Inativação Lógica de Produtos (RF-001 / RN-001 a RN-005 / RN-009)
 */

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Barcode,
  CheckCircle,
  Edit,
  Eye,
  FileSpreadsheet,
  Filter,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
  Package,
  CheckCircle2,
} from 'lucide-react';
import { Product, Category, Manufacturer, Supplier, Unit, User } from '../types';
import { api } from '../services/api';
import { exportToExcel, exportToCSV, exportToPrint } from '../utils/exportUtils';

interface ProductsViewProps {
  currentUser: User;
  initialFilterStatus?: string;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  currentUser,
  initialFilterStatus,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number>(0);
  const [selectedManufacturer, setSelectedManufacturer] = useState<number>(0);
  const [selectedStatus, setSelectedStatus] = useState<string>(initialFilterStatus || 'ALL');

  // Controle do Formulário Modal TEL-004
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  // Campos do formulário (RF-001 / RN-001 a RN-005)
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [manufacturerId, setManufacturerId] = useState<number>(1);
  const [supplierId, setSupplierId] = useState<number>(1);
  const [unitId, setUnitId] = useState<number>(1);
  const [minimumStock, setMinimumStock] = useState<number>(10);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [location, setLocation] = useState('Armário A - Prateleira 1');
  const [barcode, setBarcode] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const canEdit = currentUser.role === 'ADMIN' || currentUser.role === 'ESTOQUE';

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cats, mans, sups, unis] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
        api.getManufacturers(),
        api.getSuppliers(),
        api.getUnits(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setManufacturers(mans);
      setSuppliers(sups);
      setUnits(unis);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialFilterStatus) {
      setSelectedStatus(initialFilterStatus);
    }
  }, [initialFilterStatus]);

  const openNewProductModal = () => {
    setEditingProduct(null);
    setCode(`SER-${Math.floor(100 + Math.random() * 900)}`);
    setName('');
    setCategoryId(categories[0]?.id || 1);
    setManufacturerId(manufacturers[0]?.id || 1);
    setSupplierId(suppliers[0]?.id || 1);
    setUnitId(units[0]?.id || 1);
    setMinimumStock(10);
    setCurrentStock(0);
    setLocation('Armário A1 - Prateleira 1');
    setBarcode('');
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const openEditProductModal = (p: Product) => {
    setEditingProduct(p);
    setCode(p.code);
    setName(p.name);
    setCategoryId(p.category_id);
    setManufacturerId(p.manufacturer_id);
    setSupplierId(p.supplier_id || 1);
    setUnitId(p.unit_id);
    setMinimumStock(p.minimum_stock);
    setCurrentStock(p.current_stock);
    setLocation(p.location || '');
    setBarcode(p.barcode || '');
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    // Validação RN-002: Nome Obrigatório
    if (!name.trim()) {
      setFormError('O nome do produto é obrigatório (RN-002).');
      return;
    }
    // Validação RN-001: Código Único
    if (!code.trim()) {
      setFormError('O código do produto é obrigatório (RN-001).');
      return;
    }
    // Validação RN-005: Estoque Não Negativo
    if (currentStock < 0 || minimumStock < 0) {
      setFormError('O saldo em estoque e mínimo nunca podem ser negativos (RN-005).');
      return;
    }

    try {
      if (editingProduct) {
        const res = await api.updateProduct(editingProduct.id, {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          category_id: categoryId,
          manufacturer_id: manufacturerId,
          supplier_id: supplierId,
          unit_id: unitId,
          minimum_stock: minimumStock,
          location,
          barcode,
        });
        if (!res.success) {
          setFormError(res.message || 'Erro ao atualizar produto.');
          return;
        }
        setFormSuccess('✅ Produto atualizado com sucesso!');
      } else {
        const res = await api.createProduct({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          category_id: categoryId,
          manufacturer_id: manufacturerId,
          supplier_id: supplierId,
          unit_id: unitId,
          minimum_stock: minimumStock,
          current_stock: currentStock,
          location,
          barcode,
        });
        if (!res.success) {
          setFormError(res.message || 'Já existe um produto com este código (RN-001).');
          return;
        }
        setFormSuccess('✅ Produto salvo com sucesso!');
      }

      await loadData();
      setTimeout(() => {
        setIsModalOpen(false);
      }, 900);
    } catch (err: any) {
      setFormError('Não foi possível concluir a operação. Tente novamente.');
    }
  };

  const handleSoftDelete = async (p: Product) => {
    if (!canEdit) {
      alert('Seu perfil não possui permissão para inativar materiais (RN-025).');
      return;
    }
    if (
      !confirm(
        `Confirma a inativação lógica do produto [${p.code}] "${p.name}"? (Soft Delete RN-009 / RN-027)`
      )
    ) {
      return;
    }
    try {
      const res = await api.deleteProduct(p.id);
      if (res.success) {
        await loadData();
      } else {
        alert(res.message || 'Erro ao inativar produto.');
      }
    } catch (err) {
      alert('Erro ao processar inativação lógica.');
    }
  };

  // Filtragem local / API
  const filteredProducts = products.filter((p) => {
    if (selectedCategory > 0 && p.category_id !== selectedCategory) return false;
    if (selectedManufacturer > 0 && p.manufacturer_id !== selectedManufacturer) return false;
    if (selectedStatus === 'CRITICO' && p.status_label !== 'CRITICO') return false;
    if (selectedStatus === 'ESGOTADO' && p.status_label !== 'ESGOTADO') return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const codeMatch = p.code.toLowerCase().includes(q);
      const nameMatch = p.name.toLowerCase().includes(q);
      const locationMatch = p.location.toLowerCase().includes(q);
      return codeMatch || nameMatch || locationMatch;
    }

    return true;
  });

  const formatProductRowForExcel = (p: Product, idx: number) => ({
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
  });

  const exportProductsExcel = () => {
    const rows = filteredProducts.map(formatProductRowForExcel);
    exportToExcel(rows, 'Planilha_Materiais_Enfermagem_CEET', 'Acervo CEET');
  };

  const exportAllProductsExcel = async () => {
    try {
      const all = await api.getProducts();
      const rows = all.map(formatProductRowForExcel);
      exportToExcel(rows, 'Planilha_Oficial_Estoque_Completo_CEET', 'Acervo Completo (88 Itens)');
    } catch (err) {
      alert('Erro ao exportar planilha completa de estoque.');
    }
  };

  const exportProductsCSV = () => {
    const rows = filteredProducts.map(formatProductRowForExcel);
    exportToCSV(rows, 'Planilha_Materiais_Enfermagem_CEET');
  };

  const printProductsTable = () => {
    const rowsHtml = filteredProducts
      .map(
        (p) => `
      <tr>
        <td><strong>${p.code}</strong></td>
        <td>${p.name}</td>
        <td>${p.category_name || '-'}</td>
        <td>${p.current_stock} ${p.unit_abbreviation}</td>
        <td>${p.minimum_stock} ${p.unit_abbreviation}</td>
        <td><strong>${p.status_label}</strong></td>
        <td>${p.location || '-'}</td>
      </tr>
    `
      )
      .join('');

    const html = `
      <h3>Relação Oficial de Materiais e Produtos do Estoque CEET (RF-001)</h3>
      <p>Total de Itens Listados: <strong>${filteredProducts.length}</strong></p>
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Material / Descrição</th>
            <th>Categoria</th>
            <th>Saldo Atual</th>
            <th>Estoque Mín.</th>
            <th>Status</th>
            <th>Localização</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="7">Nenhum produto com estes filtros.</td></tr>'}
        </tbody>
      </table>
    `;
    exportToPrint('Relatório de Materiais de Enfermagem - CEET', html);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500">
            <span>Enfermagem CEET</span>
            <span>&bull;</span>
            <span className="text-blue-600 dark:text-blue-400">TEL-003 e TEL-004</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Cadastro e Controle de Produtos
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gerencie o catálogo de materiais de enfermagem, insumos laboratoriais e EPIs com regras de código único.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canEdit && (
            <button
              onClick={openNewProductModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Produto (TEL-004)</span>
            </button>
          )}
          <button
            onClick={exportAllProductsExcel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md shadow-emerald-500/20"
            title="Baixar Planilha Excel Oficial com todos os 88 materiais do estoque CEET"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Planilha CEET (88 Itens)</span>
          </button>
          <button
            onClick={exportProductsExcel}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors shadow-xs"
            title="Baixar XLSX dos itens filtrados"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>XLSX (Filtrados)</span>
          </button>
          <button
            onClick={exportProductsCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-700 hover:bg-slate-800 text-white transition-colors shadow-xs"
            title="Baixar arquivo CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>CSV</span>
          </button>
          <button
            onClick={printProductsTable}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Filtros da Tabela (RF-001 / RN-030) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Pesquisa global */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por código, nome ou armário..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtro Categoria */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value={0}>Todas as Categorias ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Filtro Fabricante */}
          <select
            value={selectedManufacturer}
            onChange={(e) => setSelectedManufacturer(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value={0}>Todos os Fabricantes ({manufacturers.length})</option>
            {manufacturers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Filtro Status Crítico */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Todos os Níveis de Estoque</option>
            <option value="CRITICO">Abaixo do Mínimo (Crítico RN-018)</option>
            <option value="ESGOTADO">Esgotado (Saldo = 0 - RN-019)</option>
          </select>
        </div>
      </div>

      {/* Tabela Oficial de Produtos */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
            Carregando catálogo oficial CEET...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
            Nenhum material de enfermagem encontrado com os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase">
                  <th className="py-3.5 px-4">Código (RN-001)</th>
                  <th className="py-3.5 px-4">Nome do Material (RF-001)</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4">Saldo Atual</th>
                  <th className="py-3.5 px-4">Mínimo</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Armário / Prateleira</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredProducts.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {p.code}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {p.manufacturer_name} &bull; Unidade: {p.unit_abbreviation}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white inline-block"
                        style={{ backgroundColor: p.category_color || '#3b82f6' }}
                      >
                        {p.category_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-bold text-sm ${
                          p.status_label === 'CRITICO' || p.status_label === 'ESGOTADO'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {p.current_stock}
                      </span>{' '}
                      <span className="text-slate-400 text-[11px]">{p.unit_abbreviation}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {p.minimum_stock} {p.unit_abbreviation}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.status_label === 'ESGOTADO' ? (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-bold text-[11px]">
                          Esgotado
                        </span>
                      ) : p.status_label === 'CRITICO' ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[11px]">
                          Estoque Mínimo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[11px]">
                          Regular
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-xs">
                      {p.location || 'Não informado'}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => setViewingProduct(p)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                        title="Ver Lotes e Detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canEdit && (
                        <>
                          <button
                            onClick={() => openEditProductModal(p)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
                            title="Editar Produto (TEL-004)"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSoftDelete(p)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                            title="Inativação Lógica (Soft Delete RN-009)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL TEL-004 - CADASTRO / EDIÇÃO DE PRODUTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingProduct
                    ? `Editar Material: ${editingProduct.code}`
                    : 'Cadastrar Novo Material de Enfermagem (TEL-004)'}
                </h3>
                <p className="text-xs text-slate-500">
                  Preencha os campos obrigatórios conforme padronizado pela instituição.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-300 font-medium">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Código Único do Material (RN-001) *
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ex: SER-005, CAT-JEL-20G"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Categoria (RN-003) *
                  </label>
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Completo do Produto (RN-002) *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Seringa Descartável 5ml com Agulha 25x7"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fabricante (RN-004) *
                  </label>
                  <select
                    required
                    value={manufacturerId}
                    onChange={(e) => setManufacturerId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {manufacturers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fornecedor Principal *
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.trade_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Unidade de Medida *
                  </label>
                  <select
                    required
                    value={unitId}
                    onChange={(e) => setUnitId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.abbreviation})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Estoque Mínimo (RN-017) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={minimumStock}
                    onChange={(e) => setMinimumStock(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                {!editingProduct && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Estoque Inicial (RN-005)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={currentStock}
                      onChange={(e) => setCurrentStock(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Código de Barras / EAN
                  </label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="EAN-13 opcional"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Localização Física no Almoxarifado / Laboratório CEET
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Armário A1 - Prateleira 2"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
                >
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto (RF-001)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALHES E LOTES DO PRODUTO (RN-007, RN-013) */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Detalhes do Material &bull; {viewingProduct.code}
                </h3>
                <p className="text-xs text-slate-500">{viewingProduct.name}</p>
              </div>
              <button
                onClick={() => setViewingProduct(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span className="text-[11px] text-slate-400">Saldo Atual</span>
                <p className="text-base font-bold text-slate-900 dark:text-white">
                  {viewingProduct.current_stock} {viewingProduct.unit_abbreviation}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span className="text-[11px] text-slate-400">Estoque Mínimo</span>
                <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                  {viewingProduct.minimum_stock} {viewingProduct.unit_abbreviation}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span className="text-[11px] text-slate-400">Armário / Prateleira</span>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {viewingProduct.location}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span className="text-[11px] text-slate-400">Fabricante</span>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {viewingProduct.manufacturer_name}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                Lotes Vinculados a este Material (RN-013, RN-014)
              </h4>
              {!viewingProduct.batches || viewingProduct.batches.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                  Nenhum lote com saldo disponível para este produto.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {viewingProduct.batches.map((b) => {
                    const expDate = new Date(b.expiration_date);
                    const isExpired = expDate < new Date();
                    return (
                      <div
                        key={b.id}
                        className={`flex items-center justify-between p-3 rounded-xl border ${
                          isExpired
                            ? 'border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            Lote #{b.batch_number}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Fabricação: {b.manufacturing_date} &bull; Validade: {b.expiration_date}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {b.quantity} un
                          </span>
                          {isExpired && (
                            <span className="block text-[10px] font-bold text-red-600">Vencido (RN-011)</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewingProduct(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
