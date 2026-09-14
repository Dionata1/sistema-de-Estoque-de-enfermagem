/**
 * Sistema de Estoque de Enfermagem CEET
 * Cadastro e Gestão de Fabricantes (TEL-ADMIN)
 */

import React, { useState, useEffect } from 'react';
import {
  Factory,
  Plus,
  Search,
  Edit2,
  Trash2,
  MoreVertical,
  Mail,
  Phone,
  MapPin,
  FileText,
  ShieldCheck,
  CheckCircle2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Manufacturer } from '../types';
import { api } from '../services/api';

export const ManufacturersView: React.FC = () => {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingManufacturer, setEditingManufacturer] = useState<Manufacturer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Partial<Manufacturer>>({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    country: 'Brasil',
    active: true,
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  useEffect(() => {
    loadManufacturers();
  }, []);

  const loadManufacturers = async () => {
    setLoading(true);
    try {
      const data = await api.getManufacturers();
      setManufacturers(data);
    } catch (error) {
      console.error('Erro ao carregar fabricantes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    try {
      let res;
      if (editingManufacturer) {
        res = await api.updateManufacturer(editingManufacturer.id, formData);
      } else {
        res = await api.createManufacturer(formData);
      }

      if (res.success) {
        setFormSuccess(res.message || 'Operação realizada com sucesso!');
        setTimeout(() => {
          setShowModal(false);
          loadManufacturers();
        }, 1500);
      } else {
        setFormError(res.message || 'Erro ao processar fabricante.');
      }
    } catch (error) {
      console.error('Erro ao salvar fabricante:', error);
      setFormError('Falha de conexão com o servidor.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este fabricante?')) return;
    try {
      const res = await api.deleteManufacturer(id);
      if (res.success) {
        loadManufacturers();
      } else {
        alert(res.message || 'Erro ao excluir fabricante.');
      }
    } catch (err) {
      alert('Erro de conexão ao excluir.');
    }
  };

  const filteredManufacturers = manufacturers.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.cnpj?.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Factory className="w-7 h-7 text-blue-600" />
            Cadastro de Fabricantes
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gerencie os fabricantes dos materiais de enfermagem do CEET
          </p>
        </div>
        <button
          onClick={() => {
            setEditingManufacturer(null);
            setFormData({ name: '', cnpj: '', email: '', phone: '', address: '', active: true });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" />
          Novo Fabricante
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por nome ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-sm outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span>{filteredManufacturers.length} fabricantes encontrados</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4">Fabricante</th>
                <th className="px-6 py-4">CNPJ</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-4">
                      <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                    </td>
                  </tr>
                ))
              ) : filteredManufacturers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-400">
                    <Factory className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    Nenhum fabricante cadastrado.
                  </td>
                </tr>
              ) : (
                filteredManufacturers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                          <Factory className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{m.name}</p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {m.address || 'Endereço não informado'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                      {m.cnpj || '---'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <Mail className="w-3 h-3" /> {m.email || '---'}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <Phone className="w-3 h-3" /> {m.phone || '---'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                        m.active 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}>
                        {m.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingManufacturer(m);
                            setFormData(m);
                            setShowModal(true);
                            setFormError('');
                            setFormSuccess('');
                          }}
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 dark:hover:bg-blue-900/20 transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(m.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-600 dark:hover:bg-red-900/20 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingManufacturer ? 'Editar Fabricante' : 'Novo Fabricante'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-1">
                  <AlertTriangle className="w-4 h-4" />
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {formSuccess}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Nome da Empresa *</label>
                <input 
                  required 
                  value={formData.name || ''}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-blue-500 transition-all" 
                  placeholder="Ex: BD Brasil" 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">País de Origem</label>
                  <input 
                    value={formData.country || ''}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-blue-500 transition-all" 
                    placeholder="Ex: Brasil" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">CNPJ</label>
                  <input 
                    value={formData.cnpj || ''}
                    onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-mono outline-hidden focus:ring-2 focus:ring-blue-500 transition-all" 
                    placeholder="00.000.000/0001-00" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Telefone</label>
                  <input 
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-blue-500 transition-all" 
                    placeholder="(00) 00000-0000" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">E-mail de Contato</label>
                  <input 
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-blue-500 transition-all" 
                    placeholder="contato@fabricante.com.br" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Endereço Completo</label>
                <textarea 
                  value={formData.address || ''}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-blue-500 transition-all min-h-[80px]" 
                  placeholder="Rua, Número, Bairro, Cidade - UF" 
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                <input 
                  type="checkbox" 
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({...formData, active: e.target.checked})}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                />
                <label htmlFor="active" className="text-xs font-bold text-blue-800 dark:text-blue-300 cursor-pointer">Fabricante Ativo para Novas Operações</label>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
                >
                  {editingManufacturer ? 'Salvar Alterações' : 'Cadastrar Fabricante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
