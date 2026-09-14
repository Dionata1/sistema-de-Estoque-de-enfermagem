/**
 * Sistema de Estoque de Enfermagem CEET
 * Gestão de Manutenção de Ativos (TEL-013)
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Wrench,
  Calendar,
  History,
  Building2,
  User,
  ArrowUpRight,
  MoreVertical,
  ChevronRight,
  Stethoscope,
  Paperclip,
} from 'lucide-react';
import { Maintenance, MaintenanceType, MaintenancePriority, MaintenanceStatus, Patrimony, User as UserType } from '../types';
import { api } from '../services/api';

export const MaintenanceView: React.FC<{ currentUser: UserType }> = ({ currentUser }) => {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [patrimonies, setPatrimonies] = useState<Patrimony[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<Maintenance | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const beforeInputRef = React.useRef<HTMLInputElement>(null);
  const duringInputRef = React.useRef<HTMLInputElement>(null);
  const afterInputRef = React.useRef<HTMLInputElement>(null);
  const attachInputRef = React.useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Maintenance>>({
    type: 'Corretiva',
    priority: 'Média',
    status: 'Aberto',
    reason: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mData, pData, uData] = await Promise.all([
        api.getMaintenances(),
        api.getPatrimonies(),
        api.getUsers(),
      ]);
      setMaintenances(mData);
      setPatrimonies(pData);
      setUsers(uData);
    } catch (error) {
      console.error('Erro ao carregar manutenções:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'before_images' | 'during_images' | 'after_images') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await api.upload(file, currentUser.id);
      if (res.success && res.data) {
        const currentImages = [...(formData[field] || [])];
        currentImages.push(res.data.url);
        setFormData({ ...formData, [field]: currentImages });
      }
    } catch (err) {
      console.error('Erro no image upload:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await api.upload(file, currentUser.id);
      if (res.success && res.data) {
        const currentAtts = [...(formData.attachments || [])];
        currentAtts.push(res.data);
        setFormData({ ...formData, attachments: currentAtts });
      }
    } catch (err) {
      console.error('Erro no attachment upload:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (field: 'before_images' | 'during_images' | 'after_images', url: string) => {
    setFormData({
      ...formData,
      [field]: (formData[field] || []).filter((img: string) => img !== url)
    });
  };

  const removeAttachment = (id: string) => {
    setFormData({
      ...formData,
      attachments: (formData.attachments || []).filter(att => att.id !== id)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMaintenance) {
        await api.updateMaintenance(editingMaintenance.id, formData);
      } else {
        await api.createMaintenance({
          ...formData,
          responsible_id: currentUser.id,
          send_date: new Date().toISOString(),
        });
      }
      setShowForm(false);
      setEditingMaintenance(null);
      loadData();
    } catch (error) {
      console.error('Erro ao salvar manutenção:', error);
    }
  };

  const getStatusBadge = (status: MaintenanceStatus) => {
    switch (status) {
      case 'Aberto': return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-bold">ABERTO</span>;
      case 'Em atendimento': return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[10px] font-bold">EM ATENDIMENTO</span>;
      case 'Atendido': return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px] font-bold">ATENDIDO</span>;
      case 'Cancelado': return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 text-[10px] font-bold">CANCELADO</span>;
      default: return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold uppercase">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="w-7 h-7 text-amber-600" />
            Ordens de Manutenção
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Acompanhamento técnico e corretivo de equipamentos e infraestrutura
          </p>
        </div>
        <button
          onClick={() => {
            setEditingMaintenance(null);
            setFormData({ type: 'Corretiva', priority: 'Média', status: 'Aberto', reason: '' });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all shadow-md shadow-amber-500/20"
        >
          <Plus className="w-5 h-5" />
          Abrir Manutenção
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar por patrimônio ou problema..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs font-bold text-slate-600 dark:text-slate-400">
              <Filter className="w-4 h-4" />
              Filtrar
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))
            ) : maintenances.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center text-slate-500">
                <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                Nenhuma ordem de manutenção registrada.
              </div>
            ) : (
              maintenances.map((m) => {
                const patrimony = patrimonies.find(p => p.id === m.patrimony_id);
                return (
                  <div key={m.id} className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 hover:border-amber-400/50 transition-all flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      m.status === 'Atendido' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 
                      m.status === 'Em atendimento' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' : 
                      'bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                    }`}>
                      {m.status === 'Atendido' ? <CheckCircle2 className="w-6 h-6" /> : <Wrench className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(m.status)}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          m.priority === 'Alta' || m.priority === 'Crítica' ? 'bg-red-50 text-red-600 dark:bg-red-950/40' : 'bg-slate-50 text-slate-600 dark:bg-slate-800'
                        }`}>
                          {m.priority.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">#{m.id.toString().padStart(4, '0')} &bull; {m.type}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {patrimony?.name || 'Patrimônio não identificado'} ({patrimony?.patrimony_code})
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{m.reason}</p>
                    </div>
                    <div className="hidden sm:flex flex-col items-end shrink-0 gap-1 text-right">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(m.send_date).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {m.expected_return_date ? `Previsão: ${new Date(m.expected_return_date).toLocaleDateString('pt-BR')}` : 'Sem previsão'}
                      </div>
                    </div>
                    <button 
                      onClick={() => { setEditingMaintenance(m); setFormData(m); setShowForm(true); }}
                      className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Alertas de Manutenção
            </h3>
            <div className="space-y-4">
              {maintenances.filter(m => m.status === 'Em atendimento' && m.expected_return_date && new Date(m.expected_return_date) < new Date()).length > 0 ? (
                <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                  <p className="text-xs font-bold text-red-800 dark:text-red-400">
                    {maintenances.filter(m => m.status === 'Em atendimento' && m.expected_return_date && new Date(m.expected_return_date) < new Date()).length} Manutenções Atrasadas
                  </p>
                  <p className="text-[10px] text-red-600 dark:text-red-500 mt-0.5">Equipamentos aguardando retorno além do prazo previsto.</p>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400">Prazos em Dia</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-0.5">Nenhuma manutenção atrasada no momento.</p>
                </div>
              )}
              
              {maintenances.filter(m => m.type === 'Preventiva' && m.status === 'Aberto').length > 0 && (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-400">Próximas Preventivas</p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-0.5">
                    Existem {maintenances.filter(m => m.type === 'Preventiva' && m.status === 'Aberto').length} manutenções agendadas.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-lg shadow-blue-500/20">
            <h3 className="text-sm font-bold mb-1">Total em Atendimento</h3>
            <p className="text-3xl font-black mb-4">
              {maintenances.filter(m => m.status === 'Em atendimento').length}
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs opacity-90">
                <span>Preventivas</span>
                <span className="font-bold">42%</span>
              </div>
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white w-[42%]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingMaintenance ? 'Gerenciar Manutenção' : 'Abrir Ordem de Manutenção'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[80vh]">
              <div className="mb-6 space-y-6">
                {/* Evidence Photos */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Antes */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Antes da Manutenção</label>
                    <div className="flex flex-wrap gap-2">
                      {formData.before_images?.map(img => (
                        <div key={img} className="group relative w-16 h-16 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                          <img src={img} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeImage('before_images', img)} className="absolute top-0.5 right-0.5 p-0.5 bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-2.5 h-2.5" /></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => beforeInputRef.current?.click()} className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:border-amber-500 transition-all"><Plus className="w-4 h-4" /></button>
                      <input type="file" ref={beforeInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'before_images')} />
                    </div>
                  </div>
                  {/* Durante */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Durante / Execução</label>
                    <div className="flex flex-wrap gap-2">
                      {formData.during_images?.map(img => (
                        <div key={img} className="group relative w-16 h-16 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                          <img src={img} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeImage('during_images', img)} className="absolute top-0.5 right-0.5 p-0.5 bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-2.5 h-2.5" /></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => duringInputRef.current?.click()} className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:border-amber-500 transition-all"><Plus className="w-4 h-4" /></button>
                      <input type="file" ref={duringInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'during_images')} />
                    </div>
                  </div>
                  {/* Depois */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Após / Concluído</label>
                    <div className="flex flex-wrap gap-2">
                      {formData.after_images?.map(img => (
                        <div key={img} className="group relative w-16 h-16 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                          <img src={img} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeImage('after_images', img)} className="absolute top-0.5 right-0.5 p-0.5 bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-2.5 h-2.5" /></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => afterInputRef.current?.click()} className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:border-amber-500 transition-all"><Plus className="w-4 h-4" /></button>
                      <input type="file" ref={afterInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'after_images')} />
                    </div>
                  </div>
                </div>

                {/* Attachments (PDFs, Relatórios) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Anexos / Relatórios Técnicos (PDF, DOCX, Imagens)</label>
                  <div className="flex flex-wrap gap-2">
                     {formData.attachments?.map(att => (
                       <div key={att.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-400">
                         <ChevronRight className="w-3 h-3" />
                         <span className="truncate max-w-[120px]">{att.name}</span>
                         <button type="button" onClick={() => removeAttachment(att.id)} className="text-red-600 hover:text-red-700"><X className="w-3 h-3" /></button>
                       </div>
                     ))}
                     <button 
                       type="button" 
                       onClick={() => attachInputRef.current?.click()} 
                       className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:border-amber-500 hover:text-amber-500 transition-all"
                     >
                       <Paperclip className="w-3.5 h-3.5 text-amber-600" /> 
                       Anexar Documento
                     </button>
                     <input type="file" ref={attachInputRef} className="hidden" onChange={handleAttachmentUpload} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Patrimônio / Equipamento</label>
                  <select
                    required
                    value={formData.patrimony_id}
                    onChange={(e) => setFormData({ ...formData, patrimony_id: Number(e.target.value) })}
                    disabled={!!editingMaintenance}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Selecione o patrimônio</option>
                    {patrimonies.map(p => (
                      <option key={p.id} value={p.id}>{p.patrimony_code} - {p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Tipo de Manutenção</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as MaintenanceType })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Preventiva">Preventiva</option>
                    <option value="Corretiva">Corretiva</option>
                    <option value="Calibração">Calibração</option>
                    <option value="Inspeção">Inspeção</option>
                    <option value="Avaliação técnica">Avaliação técnica</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Prioridade</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as MaintenancePriority })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Crítica">Crítica</option>
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Descrição do Problema / Motivo</label>
                  <textarea
                    required
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-amber-500 min-h-[100px]"
                  />
                </div>
                {editingMaintenance && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Alterar Status</label>
                    <div className="flex flex-wrap gap-2">
                      {['Aberto', 'Em atendimento', 'Atendido', 'Aguardando peça', 'Cancelado'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFormData({ ...formData, status: s as MaintenanceStatus })}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                            formData.status === s 
                              ? 'bg-amber-600 border-amber-600 text-white shadow-xs' 
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-400'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-500/20"
                >
                  {editingMaintenance ? 'Atualizar Ordem' : 'Abrir Ordem de Manutenção'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const X = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
