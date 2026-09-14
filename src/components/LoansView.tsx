/**
 * Sistema de Estoque de Enfermagem CEET
 * Gestão de Empréstimos e Devoluções (TEL-015)
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowRightLeft,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Package,
  Calendar,
  History,
  Tag,
  ArrowUpRight,
  MoreVertical,
  ChevronRight,
  XCircle,
  Undo2,
  FileText,
} from 'lucide-react';
import { Loan, LoanStatus, Student, ClassGroup, Patrimony, User as UserType, LoanItem } from '../types';
import { api } from '../services/api';

export const LoansView: React.FC<{ currentUser: UserType }> = ({ currentUser }) => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [patrimonies, setPatrimonies] = useState<Patrimony[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  const [formData, setFormData] = useState<Partial<Loan>>({
    loan_code: '',
    items: [],
    status: 'Ativo',
  });

  const [itemSearch, setItemSearch] = useState('');

  const addItemToLoan = (pat: Patrimony) => {
    const existing = formData.items?.find(i => i.patrimony_id === pat.id);
    if (existing) return;

    const newItem: LoanItem = {
      id: Date.now() + Math.random(),
      patrimony_id: pat.id,
      is_patrimony: true,
      quantity: 1,
      returned_quantity: 0,
      status: 'Ativo'
    };

    setFormData({ ...formData, items: [...(formData.items || []), newItem] });
  };

  const removeItemFromLoan = (id: number) => {
    setFormData({ ...formData, items: (formData.items || []).filter(i => i.id !== id) });
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [lData, sData, cData, pData] = await Promise.all([
        api.getLoans(),
        api.getStudents(),
        api.getClassGroups(),
        api.getPatrimonies(),
      ]);
      setLoans(lData);
      setStudents(sData);
      setClasses(cData);
      setPatrimonies(pData);
    } catch (error) {
      console.error('Erro ao carregar dados de empréstimos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (loan: Loan) => {
    if (!window.confirm('Confirmar a devolução total de todos os itens deste empréstimo?')) return;
    try {
      await api.updateLoan(loan.id, { status: 'Devolvido' });
      loadData();
    } catch (error) {
      console.error('Erro ao registrar devolução:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createLoan({
        ...formData,
        responsible_id: currentUser.id,
        loan_date: new Date().toISOString(),
      });
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error('Erro ao realizar empréstimo:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Ativo': return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-bold">ATIVO</span>;
      case 'Atrasado': return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 text-[10px] font-bold animate-pulse">ATRASADO</span>;
      case 'Devolvido': return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px] font-bold">DEVOLVIDO</span>;
      case 'Devolução parcial': return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[10px] font-bold">PARCIAL</span>;
      default: return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold">{status.toUpperCase()}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowRightLeft className="w-7 h-7 text-blue-600" />
            Empréstimos de Materiais
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Controle de retiradas temporárias de equipamentos por alunos e professores
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({ loan_code: `EMP-${Date.now().toString().slice(-6)}`, items: [], status: 'Ativo' });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" />
          Novo Empréstimo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar por código, aluno ou material..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden"
              />
            </div>
            <select className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden">
              <option value="">Todos os Status</option>
              <option value="Ativo">Ativos</option>
              <option value="Atrasado">Atrasados</option>
              <option value="Devolvido">Devolvidos</option>
            </select>
          </div>

          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))
            ) : loans.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center text-slate-500">
                <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                Nenhum empréstimo registrado recentemente.
              </div>
            ) : (
              loans.map((l) => {
                const student = students.find(s => s.id === l.student_id);
                const classGroup = classes.find(c => c.id === l.class_id);
                return (
                  <div key={l.id} className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 hover:border-blue-400/50 transition-all flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      l.status === 'Devolvido' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 
                      l.status === 'Atrasado' ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 
                      'bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                    }`}>
                      <ArrowRightLeft className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(l.status)}
                        <span className="text-[10px] text-slate-400 font-medium tracking-wider">{l.loan_code}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {student?.name || 'Professor / Servidor'}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-500">{classGroup?.name || 'Nível Superior / Técnico'}</span>
                        <span className="text-[10px] text-slate-300">&bull;</span>
                        <span className="text-[10px] text-slate-500 font-bold">{l.items.length} itens emprestados</span>
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end shrink-0 gap-1 text-right">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(l.loan_date).toLocaleDateString('pt-BR')}
                      </div>
                      <div className={`text-[10px] font-bold ${l.status === 'Atrasado' ? 'text-red-500' : 'text-slate-400'}`}>
                        {l.status === 'Devolvido' 
                          ? `Devolvido em: ${new Date(l.actual_return_date!).toLocaleDateString('pt-BR')}`
                          : `Previsão: ${new Date(l.expected_return_date).toLocaleDateString('pt-BR')}`
                        }
                      </div>
                    </div>
                    <div className="flex gap-2">
                       {l.status !== 'Devolvido' && (
                        <button 
                          onClick={() => handleReturn(l)}
                          title="Registrar Devolução"
                          className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100 transition-colors"
                        >
                          <Undo2 className="w-5 h-5" />
                        </button>
                      )}
                      <button 
                        onClick={() => setSelectedLoan(l)}
                        className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Resumo Operacional
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Empréstimos Ativos</span>
                <span className="text-sm font-bold">{loans.filter(l => l.status === 'Ativo').length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Atrasos Críticos</span>
                <span className="text-sm font-bold text-red-500">{loans.filter(l => l.status === 'Atrasado').length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Taxa de Devolução</span>
                <span className="text-sm font-bold text-emerald-500">98.2%</span>
              </div>
            </div>
            <button className="w-full mt-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all">
              Ver Relatório de Atrasos
            </button>
          </div>

          <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-lg shadow-blue-500/20 overflow-hidden relative">
             <ArrowRightLeft className="absolute -bottom-4 -right-4 w-24 h-24 text-white/10 rotate-12" />
             <h3 className="text-sm font-bold mb-1">Itens Fora do Estoque</h3>
             <p className="text-3xl font-black mb-4">
               {loans.filter(l => l.status !== 'Devolvido').reduce((acc, l) => acc + l.items.length, 0)}
             </p>
             <p className="text-[10px] opacity-80 leading-relaxed font-medium">
               Patrimônios e materiais que estão sob responsabilidade de terceiros para fins acadêmicos.
             </p>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Realizar Novo Empréstimo</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                <XCircle className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Código do Empréstimo</label>
                    <input disabled value={formData.loan_code} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-sm font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Destinatário (Aluno / Professor)</label>
                    <select required value={formData.student_id} onChange={(e) => setFormData({...formData, student_id: Number(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-blue-500">
                      <option value="">Selecione o solicitante...</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.registration_number} - {s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Previsão de Devolução</label>
                    <input type="date" required value={formData.expected_return_date} onChange={(e) => setFormData({...formData, expected_return_date: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Finalidade / Observações</label>
                    <textarea value={formData.observations} onChange={(e) => setFormData({...formData, observations: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-blue-500 min-h-[100px]" placeholder="Ex: Aula de Primeiros Socorros no Lab 2..." />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Pesquisar Patrimônio</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Nome ou código do patrimônio..."
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    {itemSearch.length >= 2 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto p-1">
                        {patrimonies.filter(p => (p.name.toLowerCase().includes(itemSearch.toLowerCase()) || p.patrimony_code.toLowerCase().includes(itemSearch.toLowerCase())) && p.status === 'Disponível').map(p => (
                          <button key={p.id} type="button" onClick={() => { addItemToLoan(p); setItemSearch(''); }} className="w-full text-left p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs flex items-center gap-3">
                            <div className="w-8 h-8 rounded overflow-hidden border border-slate-100 dark:border-slate-800 shrink-0">
                              {p.image_url ? (
                                <img src={p.image_url} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                                  <Tag className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold truncate">{p.name}</p>
                              <p className="text-[10px] text-slate-400">{p.patrimony_code} &bull; Disponível</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 block mb-2">Itens Selecionados</label>
                  {formData.items?.map(item => {
                    const p = patrimonies.find(pat => pat.id === item.patrimony_id);
                    return (
                      <div key={item.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                            {p?.image_url ? (
                              <img src={p.image_url} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-300">
                                <Tag className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{p?.name}</p>
                            <p className="text-[10px] text-slate-500">{p?.patrimony_code}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => removeItemFromLoan(item.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                  {(!formData.items || formData.items.length === 0) && (
                    <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                      Nenhum item selecionado para o empréstimo.
                    </div>
                  )}
                </div>
                <div className="mt-8 flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold hover:bg-slate-50">Cancelar</button>
                  <button type="submit" className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20">Finalizar Empréstimo</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
           <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl p-8 overflow-hidden relative">
              <button onClick={() => setSelectedLoan(null)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                <XCircle className="w-6 h-6 text-slate-400" />
              </button>
              
              <div className="flex items-start gap-5 mb-8">
                <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 shrink-0">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusBadge(selectedLoan.status)}
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedLoan.loan_code}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {students.find(s => s.id === selectedLoan.student_id)?.name || 'Professor / Servidor'}
                  </h3>
                  <p className="text-sm text-slate-500">{classes.find(c => c.id === selectedLoan.class_id)?.name || 'Setor Geral CEET'}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Itens Vinculados</h4>
                  <div className="space-y-2">
                    {selectedLoan.items.map((item, idx) => {
                      const p = patrimonies.find(pat => pat.id === item.patrimony_id);
                      return (
                        <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-slate-400">
                              <Tag className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white">{p?.name || 'Material de Consumo'}</p>
                              <p className="text-[10px] text-slate-500">{p?.patrimony_code || `Qtd: ${item.quantity}`}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">REGULAR</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Retirada em</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{new Date(selectedLoan.loan_date).toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Expectativa Devolução</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{new Date(selectedLoan.expected_return_date).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                    <History className="w-4 h-4" /> Ver Histórico
                  </button>
                  {selectedLoan.status !== 'Devolvido' && (
                    <button 
                      onClick={() => { handleReturn(selectedLoan); setSelectedLoan(null); }}
                      className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Registrar Devolução
                    </button>
                  )}
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
