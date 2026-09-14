/**
 * Sistema de Estoque de Enfermagem CEET
 * Gestão de Aulas Práticas e Integração com Estoque (TEL-014)
 */

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  BookOpen,
  Users,
  MapPin,
  ClipboardList,
  Package,
  ArrowRightLeft,
  MoreVertical,
  ChevronRight,
  AlertTriangle,
  Play,
  Save,
  Trash2,
  GraduationCap,
  Tag,
  Stethoscope,
} from 'lucide-react';
import { Lesson, LessonStatus, ClassGroup, InstitutionalLocation as Location, Product, Patrimony, User as UserType, LessonItem } from '../types';
import { api } from '../services/api';

import { AIAssistant } from './common/AIAssistant';

export const LessonsView: React.FC<{ currentUser: UserType }> = ({ currentUser }) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [patrimonies, setPatrimonies] = useState<Patrimony[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingLesson, setViewingLesson] = useState<Lesson | null>(null);

  const [formData, setFormData] = useState<Partial<Lesson>>({
    title: '',
    subject: '',
    status: 'PLANEJADA',
    items: [],
  });

  const [itemSearch, setItemSearch] = useState('');
  const [selectedType, setSelectedType] = useState<'PRODUTO' | 'PATRIMONIO'>('PRODUTO');

  const addItemToLesson = (id: number, isPatrimony: boolean) => {
    const existing = formData.items?.find(i => (isPatrimony ? i.patrimony_id === id : i.product_id === id));
    if (existing) return;

    const newItem: LessonItem = {
      id: Date.now() + Math.random(),
      is_patrimony: isPatrimony,
      planned_quantity: 1,
      [isPatrimony ? 'patrimony_id' : 'product_id']: id
    };

    setFormData({ ...formData, items: [...(formData.items || []), newItem] });
  };

  const removeItemFromLesson = (id: number) => {
    setFormData({ ...formData, items: (formData.items || []).filter(i => i.id !== id) });
  };

  const updateItemQuantity = (id: number, qty: number) => {
    setFormData({
      ...formData,
      items: (formData.items || []).map(i => i.id === id ? { ...i, planned_quantity: Math.max(1, qty) } : i)
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [lData, cData, locData, pData, patData, uData] = await Promise.all([
        api.getLessons(),
        api.getClassGroups(),
        api.getLocations(),
        api.getProducts(),
        api.getPatrimonies(),
        api.getUsers(),
      ]);
      setLessons(lData);
      setClasses(cData);
      setLocations(locData);
      setProducts(pData);
      setPatrimonies(patData);
      setUsers(uData);
    } catch (error) {
      console.error('Erro ao carregar dados de aulas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: LessonStatus) => {
    try {
      await api.updateLesson(id, { status: newStatus });
      loadData();
    } catch (error) {
      console.error('Erro ao alterar status da aula:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createLesson({
        ...formData,
        teacher_id: currentUser.id,
      });
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error('Erro ao salvar aula:', error);
    }
  };

  const getStatusLabel = (status: LessonStatus) => {
    switch (status) {
      case 'PLANEJADA': return { text: 'Planejada', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400' };
      case 'AGENDADA': return { text: 'Agendada', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' };
      case 'MATERIAIS_SEPARADOS': return { text: 'Materiais Separados', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' };
      case 'EM_ANDAMENTO': return { text: 'Em Andamento', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' };
      case 'FINALIZADA': return { text: 'Finalizada', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' };
      default: return { text: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-purple-600" />
            Aulas Práticas e Laboratório
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Planejamento pedagógico e integração com suprimentos hospitalares
          </p>
        </div>
          <AIAssistant 
            category="PEDAGOGICO" 
            context="Planejamento de Aulas Práticas" 
            data={lessons} 
            buttonText="IA Pedagógica"
          />
        <button
          onClick={() => {
            setFormData({ title: '', subject: '', status: 'PLANEJADA', items: [] });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-md shadow-purple-500/20"
        >
          <Plus className="w-5 h-5" />
          Agendar Aula
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))
          ) : lessons.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center text-slate-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
              Nenhuma aula prática agendada no momento.
            </div>
          ) : (
            lessons.map((l) => {
              const classGroup = classes.find(c => c.id === l.class_id);
              const location = locations.find(loc => loc.id === l.location_id);
              const status = getStatusLabel(l.status);
              return (
                <div key={l.id} className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 hover:border-purple-400/50 transition-all flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 shrink-0">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${status.color}`}>
                            {status.text}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">#{l.id.toString().padStart(4, '0')}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{l.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{l.subject}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {new Date(l.date).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-[10px] text-slate-500">{l.start_time} - {l.end_time}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 py-3 border-y border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                      <Users className="w-3.5 h-3.5 text-purple-500" />
                      <span className="font-semibold">{classGroup?.name || 'Turma N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-purple-500" />
                      <span className="font-semibold">{location?.name || 'Sala N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                      <ClipboardList className="w-3.5 h-3.5 text-purple-500" />
                      <span className="font-semibold">{l.items.length} Materiais Planejados</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {l.status === 'PLANEJADA' && (
                        <button 
                          onClick={() => handleStatusChange(l.id, 'AGENDADA')}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 text-[10px] font-bold hover:bg-blue-100 transition-colors"
                        >
                          Confirmar Aula
                        </button>
                      )}
                      {l.status === 'AGENDADA' && (
                        <button 
                          onClick={() => handleStatusChange(l.id, 'MATERIAIS_SEPARADOS')}
                          className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900/20 text-[10px] font-bold hover:bg-purple-100 transition-colors"
                        >
                          Separar Materiais
                        </button>
                      )}
                      {l.status === 'MATERIAIS_SEPARADOS' && (
                        <button 
                          onClick={() => handleStatusChange(l.id, 'EM_ANDAMENTO')}
                          className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20 text-[10px] font-bold hover:bg-amber-100 transition-colors"
                        >
                          Iniciar Aula
                        </button>
                      )}
                      {l.status === 'EM_ANDAMENTO' && (
                        <button 
                          onClick={() => handleStatusChange(l.id, 'FINALIZADA')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                        >
                          Finalizar e Consumir
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={() => setViewingLesson(l)}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-purple-600 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Cronograma Semanal</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="text-xs font-bold text-slate-400">SEG</div>
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold mt-1 shadow-md shadow-purple-500/20">24</div>
                </div>
                <div className="flex-1 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold text-purple-600 uppercase">08:00 - 11:30</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">Fundamentos de Enfermagem</p>
                  <p className="text-[10px] text-slate-500">Laboratório de Práticas A</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="text-xs font-bold text-slate-400">TER</div>
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center text-xs font-bold mt-1">25</div>
                </div>
                <div className="flex-1 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">13:30 - 17:00</p>
                  <p className="text-xs font-bold text-slate-400">Anatomia Aplicada</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative">
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-purple-600/20 rounded-full blur-2xl" />
            <h3 className="text-sm font-bold mb-4 relative z-10">Status do Almoxarifado</h3>
            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-400" />
                  <span className="text-xs">Materiais Separados</span>
                </div>
                <span className="text-xs font-bold">04 Aulas</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs">Ruputura de Estoque</span>
                </div>
                <span className="text-xs font-bold text-amber-400">02 Itens</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Agendar Aula Prática</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                <XCircle className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Título da Aula</label>
                  <input required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-purple-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Disciplina / Matéria</label>
                  <input required value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-purple-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Turma</label>
                    <select value={formData.class_id} onChange={(e) => setFormData({...formData, class_id: Number(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-purple-500">
                      <option value="">Selecione...</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Local</label>
                    <select value={formData.location_id} onChange={(e) => setFormData({...formData, location_id: Number(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-purple-500">
                      <option value="">Selecione...</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Data</label>
                    <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs outline-hidden" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Início</label>
                    <input type="time" value={formData.start_time} onChange={(e) => setFormData({...formData, start_time: e.target.value})} className="w-full px-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs outline-hidden" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Fim</label>
                    <input type="time" value={formData.end_time} onChange={(e) => setFormData({...formData, end_time: e.target.value})} className="w-full px-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs outline-hidden" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Pesquisar e Adicionar Material</label>
                  <div className="flex gap-2">
                    <select 
                      value={selectedType} 
                      onChange={(e) => setSelectedType(e.target.value as any)}
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-hidden"
                    >
                      <option value="PRODUTO">PRODUTO</option>
                      <option value="PATRIMONIO">PATRIMÔNIO</option>
                    </select>
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Nome ou código..."
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs outline-hidden"
                      />
                      {itemSearch.length >= 2 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto p-1">
                          {selectedType === 'PRODUTO' ? (
                            products.filter(p => p.name.toLowerCase().includes(itemSearch.toLowerCase()) || p.code.toLowerCase().includes(itemSearch.toLowerCase())).map(p => (
                              <button key={p.id} type="button" onClick={() => { addItemToLesson(p.id, false); setItemSearch(''); }} className="w-full text-left p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs flex items-center gap-2">
                                {p.image ? (
                                  <img src={p.image} className="w-8 h-8 rounded object-cover" />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center"><Package className="w-4 h-4 text-slate-400" /></div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold truncate">{p.name}</p>
                                  <p className="text-[10px] text-slate-400">{p.code} &bull; {p.current_stock} em estoque</p>
                                </div>
                              </button>
                            ))
                          ) : (
                            patrimonies.filter(p => p.name.toLowerCase().includes(itemSearch.toLowerCase()) || p.patrimony_code.toLowerCase().includes(itemSearch.toLowerCase())).map(p => (
                              <button key={p.id} type="button" onClick={() => { addItemToLesson(p.id, true); setItemSearch(''); }} className="w-full text-left p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs flex items-center gap-2">
                                {p.image_url ? (
                                  <img src={p.image_url} className="w-8 h-8 rounded object-cover" />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center"><Tag className="w-4 h-4 text-slate-400" /></div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold truncate">{p.name}</p>
                                  <p className="text-[10px] text-slate-400">{p.patrimony_code} &bull; {p.status}</p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-2 text-left">Item</th>
                        <th className="px-4 py-2 text-center w-24">Quantidade</th>
                        <th className="px-4 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {formData.items?.map((item) => {
                        const prod = products.find(p => p.id === item.product_id);
                        const pat = patrimonies.find(p => p.id === item.patrimony_id);
                        return (
                          <tr key={item.id}>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded overflow-hidden border border-slate-100 dark:border-slate-800 shrink-0">
                                  {(item.is_patrimony ? pat?.image_url : prod?.image) ? (
                                    <img src={item.is_patrimony ? pat?.image_url : prod?.image} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-300">
                                      {item.is_patrimony ? <Tag className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-700 dark:text-slate-300">{item.is_patrimony ? pat?.name : prod?.name}</p>
                                  <p className="text-[10px] text-slate-400">{item.is_patrimony ? pat?.patrimony_code : prod?.code}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="number" 
                                value={item.planned_quantity} 
                                onChange={(e) => updateItemQuantity(item.id, Number(e.target.value))}
                                className="w-16 mx-auto block text-center py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold" 
                              />
                            </td>
                            <td className="px-4 py-2">
                              <button type="button" onClick={() => removeItemFromLesson(item.id)} className="p-1 text-red-400 hover:text-red-600 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {(!formData.items || formData.items.length === 0) && (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">
                            Nenhum material adicionado ao planejamento.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex gap-3">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold hover:bg-slate-50">Cancelar</button>
                  <button type="submit" className="flex-1 px-4 py-3 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 shadow-lg shadow-purple-500/20">Salvar Planejamento</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
           <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{viewingLesson.title}</h3>
                  <p className="text-sm text-slate-500">{viewingLesson.subject} &bull; Prof. {users.find(u => u.id === viewingLesson.teacher_id)?.name}</p>
                </div>
                <button onClick={() => setViewingLesson(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                  <XCircle className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Package className="w-4 h-4" /> Detalhes dos Materiais
                  </h4>
                  <div className="space-y-2">
                    {viewingLesson.items.map((item, idx) => {
                      const prod = products.find(p => p.id === item.product_id);
                      const pat = patrimonies.find(p => p.id === item.patrimony_id);
                      return (
                        <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400">
                              {item.is_patrimony ? <Tag className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white">{item.is_patrimony ? pat?.name : prod?.name}</p>
                              <p className="text-[10px] text-slate-500">{item.is_patrimony ? pat?.patrimony_code : prod?.code}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{item.planned_quantity} un</p>
                            <p className="text-[10px] text-slate-500">Planejado</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" /> Fluxo de Atendimento
                  </h4>
                  <div className="relative pl-6 border-l-2 border-slate-100 dark:border-slate-800 space-y-6">
                    <div className="relative">
                      <div className="absolute -left-8 top-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Aula Agendada</p>
                      <p className="text-[10px] text-slate-500">{new Date(viewingLesson.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="relative">
                      <div className={`absolute -left-8 top-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                        ['MATERIAIS_SEPARADOS', 'EM_ANDAMENTO', 'FINALIZADA'].includes(viewingLesson.status) ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                      }`} />
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Materiais Separados pelo Estoque</p>
                      <p className="text-[10px] text-slate-500">Aguardando conferência física no laboratório</p>
                    </div>
                    <div className="relative">
                      <div className={`absolute -left-8 top-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                        ['EM_ANDAMENTO', 'FINALIZADA'].includes(viewingLesson.status) ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                      }`} />
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Utilização em Aula (Em andamento)</p>
                    </div>
                    <div className="relative">
                      <div className={`absolute -left-8 top-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                        viewingLesson.status === 'FINALIZADA' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                      }`} />
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Consumo Registrado e Finalizado</p>
                    </div>
                  </div>
                  <div className="pt-6">
                    <button className="w-full py-3 rounded-2xl bg-purple-600 text-white font-bold text-sm shadow-lg shadow-purple-500/20 hover:bg-purple-700 transition-all flex items-center justify-center gap-2">
                      <Save className="w-4 h-4" /> Exportar Relação para PDF
                    </button>
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
