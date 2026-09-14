/**
 * Sistema de Estoque de Enfermagem CEET
 * Gestão de Ocorrências e Incidentes (TEL-016)
 */

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  FileText,
  Calendar,
  History,
  Tag,
  MessageSquare,
  MoreVertical,
  ChevronRight,
  ShieldAlert,
  User,
  MapPin,
  Camera,
  Paperclip,
} from 'lucide-react';
import { Occurrence, OccurrenceType, OccurrenceSeverity, OccurrenceStatus, Patrimony, User as UserType } from '../types';
import { api } from '../services/api';

export const OccurrencesView: React.FC<{ currentUser: UserType }> = ({ currentUser }) => {
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [patrimonies, setPatrimonies] = useState<Patrimony[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingOccurrence, setViewingOccurrence] = useState<Occurrence | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const attachInputRef = React.useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Occurrence>>({
    type: 'Dano',
    severity: 'Média',
    status: 'ABERTA',
    title: '',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [oData, pData, uData] = await Promise.all([
        api.getOccurrences(),
        api.getPatrimonies(),
        api.getUsers(),
      ]);
      setOccurrences(oData);
      setPatrimonies(pData);
      setUsers(uData);
    } catch (error) {
      console.error('Erro ao carregar ocorrências:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: OccurrenceStatus) => {
    try {
      await api.updateOccurrence(id, { status: newStatus });
      loadData();
    } catch (error) {
      console.error('Erro ao alterar status da ocorrência:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await api.upload(file, currentUser.id);
      if (res.success && res.data) {
        const currentImages = [...(formData.images || [])];
        currentImages.push(res.data.url);
        setFormData({ ...formData, images: currentImages });
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

  const removeImage = (url: string) => {
    setFormData({
      ...formData,
      images: (formData.images || []).filter((img: string) => img !== url)
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
      await api.createOccurrence({
        ...formData,
        occurrence_code: `OCR-${Date.now().toString().slice(-6)}`,
        reported_by_id: currentUser.id,
      });
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error('Erro ao salvar ocorrência:', error);
    }
  };

  const getSeverityBadge = (severity: OccurrenceSeverity) => {
    switch (severity) {
      case 'Crítica': return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 text-[10px] font-bold">CRÍTICA</span>;
      case 'Alta': return <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400 text-[10px] font-bold">ALTA</span>;
      case 'Média': return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 text-[10px] font-bold">MÉDIA</span>;
      case 'Baixa': return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400 text-[10px] font-bold">BAIXA</span>;
      default: return null;
    }
  };

  const getStatusLabel = (status: OccurrenceStatus) => {
    switch (status) {
      case 'ABERTA': return { text: 'Aberta', color: 'bg-blue-50 text-blue-600 border-blue-100' };
      case 'EM_ANALISE': return { text: 'Em Análise', color: 'bg-amber-50 text-amber-600 border-amber-100' };
      case 'RESOLVIDA': return { text: 'Resolvida', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
      case 'ARQUIVADA': return { text: 'Arquivada', color: 'bg-slate-50 text-slate-500 border-slate-100' };
      default: return { text: status, color: 'bg-gray-50 text-gray-500 border-gray-100' };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-red-600" />
            Ocorrências e Incidentes
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Registro e acompanhamento de danos, perdas ou infrações no almoxarifado
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({ type: 'Dano', severity: 'Média', status: 'ABERTA', title: '', description: '' });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-md shadow-red-500/20"
        >
          <Plus className="w-5 h-5" />
          Registrar Ocorrência
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
           <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar por título, código ou patrimônio..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden"
              />
            </div>
            <button className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-all text-slate-500">
              <Filter className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))
            ) : occurrences.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                Nenhuma ocorrência registrada no sistema.
              </div>
            ) : (
              occurrences.map((o) => {
                const reporter = users.find(u => u.id === o.reported_by_id);
                const patrimony = patrimonies.find(p => p.id === o.patrimony_id);
                const status = getStatusLabel(o.status);
                return (
                  <div key={o.id} className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-xl hover:shadow-red-500/5 transition-all">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          o.severity === 'Crítica' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {getSeverityBadge(o.severity)}
                            <span className="text-[10px] text-slate-400 font-bold tracking-wider">{o.occurrence_code}</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{o.title}</h4>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{o.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-[10px] text-slate-400 font-medium">{new Date(o.created_at).toLocaleDateString('pt-BR')}</span>
                        <div className={`mt-2 px-2.5 py-1 rounded-lg text-[10px] font-black border ${status.color}`}>
                          {status.text.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <User className="w-3.5 h-3.5" />
                        <span>Relatado por: <span className="font-bold text-slate-700 dark:text-slate-300">{reporter?.name || 'Sistema'}</span></span>
                      </div>
                      {patrimony && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <Tag className="w-3.5 h-3.5" />
                          <span>Patrimônio: <span className="font-bold text-slate-700 dark:text-slate-300">{patrimony.patrimony_code}</span></span>
                        </div>
                      )}
                      <div className="flex-1" />
                      <button 
                        onClick={() => setViewingOccurrence(o)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700"
                      >
                        Ver Detalhes
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
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Estatísticas do Mês</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Tipos mais comuns</span>
                  <span className="font-bold">Danos (65%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 w-[65%]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-center">
                  <p className="text-xl font-black text-blue-600">12</p>
                  <p className="text-[10px] font-bold text-blue-400 uppercase">Novas</p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-center">
                  <p className="text-xl font-black text-emerald-600">08</p>
                  <p className="text-[10px] font-bold text-emerald-400 uppercase">Resolvidas</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-red-600 rounded-3xl p-6 text-white shadow-lg shadow-red-500/20 overflow-hidden relative">
            <ShieldAlert className="absolute -bottom-4 -right-4 w-24 h-24 text-white/10" />
            <h3 className="text-sm font-bold mb-4">Protocolo de Segurança</h3>
            <p className="text-xs opacity-90 leading-relaxed font-medium">
              Toda ocorrência de perda ou dano deve ser relatada em até 24h conforme regimento interno do CEET.
            </p>
            <button className="mt-4 px-4 py-2 bg-white text-red-600 rounded-xl text-[10px] font-black uppercase tracking-wider">
              Ver Regulamento
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Relatar Nova Ocorrência</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                <XCircle className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              {/* Fotos e Anexos Section */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Evidências Fotográficas</label>
                  <div className="flex flex-wrap gap-3">
                    {formData.images?.map(img => (
                      <div key={img} className="group relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                        <img src={img} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeImage(img)} className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><XCircle className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => imageInputRef.current?.click()} className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 hover:border-red-500 transition-all">
                       <Camera className="w-6 h-6" />
                       <span className="text-[10px] mt-1">Foto</span>
                    </button>
                    <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Anexos / Documentos</label>
                  <div className="flex flex-wrap gap-2">
                    {formData.attachments?.map(att => (
                      <div key={att.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-400">
                        <Paperclip className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{att.name}</span>
                        <button type="button" onClick={() => removeAttachment(att.id)} className="text-red-600 hover:text-red-700 font-bold ml-1">X</button>
                      </div>
                    ))}
                    <button type="button" onClick={() => attachInputRef.current?.click()} className="px-3 py-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:border-red-500 transition-all">
                       <Plus className="w-3 h-3" /> Adicionar Anexo
                    </button>
                    <input type="file" ref={attachInputRef} className="hidden" onChange={handleAttachmentUpload} />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Título da Ocorrência</label>
                <input required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-red-500" placeholder="Ex: Cadeira quebrada no Lab 1" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Tipo</label>
                  <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value as OccurrenceType})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-red-500">
                    <option value="Dano">Dano / Avaria</option>
                    <option value="Perda">Perda / Extravio</option>
                    <option value="Roubo">Roubo / Furto</option>
                    <option value="Infração">Infração de Regras</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Gravidade</label>
                  <select value={formData.severity} onChange={(e) => setFormData({...formData, severity: e.target.value as OccurrenceSeverity})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-red-500">
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Crítica">Crítica</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Patrimônio Relacionado (Opcional)</label>
                <select value={formData.patrimony_id} onChange={(e) => setFormData({...formData, patrimony_id: Number(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-red-500">
                  <option value="">Nenhum patrimônio específico</option>
                  {patrimonies.map(p => <option key={p.id} value={p.id}>{p.patrimony_code} - {p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Relato Detalhado</label>
                <textarea required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-red-500 min-h-[120px]" placeholder="Descreva como, quando e onde ocorreu o incidente..." />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-lg shadow-red-500/20">Registrar Ocorrência</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
