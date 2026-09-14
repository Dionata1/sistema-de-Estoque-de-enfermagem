/**
 * Sistema de Estoque de Enfermagem CEET
 * Gestão de Patrimônio e Ativos Imobilizados (TEL-012)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  History,
  Wrench,
  ArrowRightLeft,
  AlertTriangle,
  Building2,
  User,
  MapPin,
  Calendar,
  DollarSign,
  Shield,
  Trash2,
  Edit2,
  Eye,
  CheckCircle2,
  Package,
  QrCode,
  Tag,
  FileText,
  Paperclip,
  ArrowUpRight,
  X,
} from 'lucide-react';
import { Patrimony, PatrimonyCondition, PatrimonyStatus, Category, InstitutionalLocation as Location, User as UserType, Attachment } from '../types';
import { api } from '../services/api';

import { AIAssistant } from './common/AIAssistant';

export const PatrimonyView: React.FC<{ currentUser: UserType }> = ({ currentUser }) => {
  const [patrimonies, setPatrimonies] = useState<Patrimony[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingPatrimony, setEditingPatrimony] = useState<Patrimony | null>(null);
  const [viewingPatrimony, setViewingPatrimony] = useState<Patrimony | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Patrimony>>({
    name: '',
    patrimony_code: '',
    description: '',
    condition: 'Novo',
    status: 'Disponível',
  });

  useEffect(() => {
    loadData();
  }, [searchTerm, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pData, cData, lData, uData] = await Promise.all([
        api.getPatrimonies({ search: searchTerm, status: filterStatus }),
        api.getCategories(),
        api.getLocations(),
        api.getUsers(),
      ]);
      setPatrimonies(pData);
      setCategories(cData);
      setLocations(lData);
      setUsers(uData);
    } catch (error) {
      console.error('Erro ao carregar dados de patrimônio:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await api.upload(file, currentUser.id);
      if (res.success && res.data) {
        setFormData({ ...formData, image_url: res.data.url });
      }
    } catch (err) {
      console.error('Erro no upload:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const newImages = [...(formData.images || [])];
      for (const file of files) {
        const res = await api.upload(file as File, currentUser.id);
        if (res.success && res.data) {
          newImages.push(res.data.url);
        }
      }
      setFormData({ ...formData, images: newImages });
    } catch (err) {
      console.error('Erro no gallery upload:', err);
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
        currentAtts.push(res.data as Attachment);
        setFormData({ ...formData, attachments: currentAtts });
      }
    } catch (err) {
      console.error('Erro no attachment upload:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (id: string) => {
    setFormData({
      ...formData,
      attachments: (formData.attachments || []).filter(a => a.id !== id)
    });
  };

  const removeGalleryImage = (url: string) => {
    setFormData({
      ...formData,
      images: (formData.images || []).filter(img => img !== url)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPatrimony) {
        await api.updatePatrimony(editingPatrimony.id, formData);
      } else {
        await api.createPatrimony(formData);
      }
      setShowForm(false);
      setEditingPatrimony(null);
      setFormData({ name: '', patrimony_code: '', description: '', condition: 'Novo', status: 'Disponível' });
      loadData();
    } catch (error) {
      console.error('Erro ao salvar patrimônio:', error);
    }
  };

  const getStatusColor = (status: PatrimonyStatus) => {
    switch (status) {
      case 'Disponível': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400';
      case 'Em manutenção': return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400';
      case 'Emprestado': return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400';
      case 'Indisponível': return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
      case 'Baixado': return 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600" />
            Gestão de Patrimônio
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Controle de ativos imobilizados, equipamentos e mobiliário do CEET
          </p>
        </div>
          <AIAssistant 
            category="PATRIMONIO" 
            context="Gestão de Ativos Imobilizados" 
            data={patrimonies} 
            buttonText="IA de Ativos"
          />
        <button
          onClick={() => {
            setEditingPatrimony(null);
            setFormData({ name: '', patrimony_code: '', description: '', condition: 'Novo', status: 'Disponível' });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" />
          Novo Patrimônio
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por código ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-hidden"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-hidden"
        >
          <option value="">Todos os Status</option>
          <option value="Disponível">Disponível</option>
          <option value="Em manutenção">Em manutenção</option>
          <option value="Emprestado">Emprestado</option>
          <option value="Indisponível">Indisponível</option>
          <option value="Baixado">Baixado</option>
        </select>
        <button className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-500">
          <Filter className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))
        ) : patrimonies.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            <Tag className="w-12 h-12 mx-auto mb-3 opacity-20" />
            Nenhum patrimônio encontrado com os filtros atuais.
          </div>
        ) : (
          patrimonies.map((p) => (
            <div key={p.id} className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-xl hover:shadow-blue-500/5 transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 flex gap-2">
                 <button 
                  onClick={() => { setViewingPatrimony(p); }}
                  className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => { setEditingPatrimony(p); setFormData(p); setShowForm(true); }}
                  className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-amber-600 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 shrink-0 overflow-hidden">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1 pr-12">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">{p.patrimony_code}</span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{p.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${getStatusColor(p.status)}`}>
                      {p.status}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                      {p.condition}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Local: {locations.find(l => l.id === p.location_id)?.name || 'Não definido'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <User className="w-3.5 h-3.5" />
                  <span>Responsável: {users.find(u => u.id === p.responsible_id)?.name || 'Setor Geral'}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button className="text-[10px] font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1">
                    <Wrench className="w-3 h-3" /> Manutenções
                  </button>
                  <button className="text-[10px] font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1">
                    <ArrowRightLeft className="w-3 h-3" /> Empréstimos
                  </button>
                </div>
                <QrCode className="w-5 h-5 text-slate-300 dark:text-slate-700" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL DETALHES DO PATRIMÔNIO */}
      {viewingPatrimony && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Detalhes do Ativo &bull; {viewingPatrimony.patrimony_code}
                </h3>
                <p className="text-xs text-slate-500">{viewingPatrimony.name}</p>
              </div>
              <button onClick={() => setViewingPatrimony(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[80vh] space-y-6">
              {/* Galeria de Imagens no Detalhe */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Galeria de Fotos e Evidências</label>
                <div className="flex flex-wrap gap-3">
                  <div className="w-32 h-32 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                    {viewingPatrimony.image_url ? (
                      <img src={viewingPatrimony.image_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300">
                        <Package className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  {viewingPatrimony.images?.map((img, i) => (
                    <div key={i} className="w-32 h-32 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                      <img src={img} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-[10px] text-slate-400 uppercase block">Status Atual</span>
                  <span className={`text-xs font-bold ${getStatusColor(viewingPatrimony.status)}`}>{viewingPatrimony.status}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-[10px] text-slate-400 uppercase block">Conservação</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{viewingPatrimony.condition}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-[10px] text-slate-400 uppercase block">Localização</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{locations.find(l => l.id === viewingPatrimony.location_id)?.name || 'Não definido'}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Dados de Aquisição</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="flex justify-between p-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Data de Compra:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingPatrimony.acquisition_date || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between p-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Valor Pago:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">R$ {viewingPatrimony.acquisition_value?.toLocaleString('pt-BR') || '0,00'}</span>
                  </div>
                </div>
              </div>

              {viewingPatrimony.attachments && viewingPatrimony.attachments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Documentação e Anexos</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {viewingPatrimony.attachments.map(att => (
                      <a 
                        key={att.id}
                        href={att.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 hover:border-blue-400 transition-all group"
                      >
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span className="flex-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">{att.name}</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-300 group-hover:text-blue-500 transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mb-2 uppercase tracking-widest">Ações Rápidas</p>
                <div className="flex gap-2">
                  <button className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all flex items-center gap-2">
                    <Wrench className="w-3.5 h-3.5" /> Abrir Chamado Manutenção
                  </button>
                  <button className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all flex items-center gap-2">
                    <ArrowRightLeft className="w-3.5 h-3.5" /> Registrar Empréstimo
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button onClick={() => setViewingPatrimony(null)} className="px-6 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800">Fechar Detalhes</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingPatrimony ? 'Editar Patrimônio' : 'Cadastrar Novo Patrimônio'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[80vh]">
              {/* Fotos Section */}
              <div className="mb-6 space-y-4">
                <label className="text-xs font-bold text-slate-500 uppercase">Imagens do Patrimônio</label>
                <div className="flex flex-wrap gap-4">
                   {/* Foto Principal */}
                   <div className="space-y-1.5">
                     <span className="text-[10px] text-slate-400 block ml-1">Foto Principal</span>
                     <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-all overflow-hidden relative"
                     >
                        {formData.image_url ? (
                          <img src={formData.image_url} alt="Principal" className="w-full h-full object-cover" />
                        ) : (
                          <Plus className="w-6 h-6 text-slate-300" />
                        )}
                        {isUploading && (
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                     </div>
                     <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                   </div>

                   {/* Galeria */}
                   <div className="space-y-1.5 flex-1">
                     <span className="text-[10px] text-slate-400 block ml-1">Galeria de Evidências / Acessórios</span>
                     <div className="flex flex-wrap gap-2">
                        {formData.images?.map((img, i) => (
                          <div key={i} className="group relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                             <img src={img} className="w-full h-full object-cover" />
                             <button 
                              type="button"
                              onClick={() => removeGalleryImage(img)}
                              className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                               <X className="w-3 h-3" />
                             </button>
                          </div>
                        ))}
                        <button 
                          type="button"
                          onClick={() => galleryInputRef.current?.click()}
                          className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center hover:border-blue-500 transition-all text-slate-400"
                        >
                          <Plus className="w-6 h-6" />
                          <span className="text-[10px]">Adicionar</span>
                        </button>
                        <input type="file" ref={galleryInputRef} className="hidden" multiple accept="image/*" onChange={handleGalleryUpload} />
                      </div>
                    </div>
                  </div>

                  {/* Anexos (Documentos) */}
                  <div className="space-y-1.5 mt-4">
                      <span className="text-[10px] text-slate-400 block ml-1 uppercase font-bold">Documentação Técnica / Notas Fiscais / Manuais (PDF, DOCX)</span>
                      <div className="flex flex-wrap gap-2">
                        {formData.attachments?.map(att => (
                          <div key={att.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-400">
                            <FileText className="w-3 h-3 text-blue-500" />
                            <span className="truncate max-w-[150px]">{att.name}</span>
                            <button type="button" onClick={() => removeAttachment(att.id)} className="text-red-500 hover:text-red-700"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                        <button 
                          type="button" 
                          onClick={() => attachInputRef.current?.click()}
                          className="px-4 py-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:border-blue-500 transition-all"
                        >
                          <Paperclip className="w-4 h-4" /> Anexar Documento
                        </button>
                        <input type="file" ref={attachInputRef} className="hidden" onChange={handleAttachmentUpload} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Descrição / Nome do Ativo</label>
                  <input
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Código Patrimonial</label>
                  <input
                    required
                    value={formData.patrimony_code || ''}
                    onChange={(e) => setFormData({ ...formData, patrimony_code: e.target.value })}
                    placeholder="Ex: PAT-2026-0001"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Estado de Conservação</label>
                  <select
                    value={formData.condition || 'Novo'}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value as PatrimonyCondition })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Novo">Novo</option>
                    <option value="Excelente">Excelente</option>
                    <option value="Bom">Bom</option>
                    <option value="Regular">Regular</option>
                    <option value="Danificado">Danificado</option>
                    <option value="Inservível">Inservível</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Localização</label>
                  <select
                    value={formData.location_id || 0}
                    onChange={(e) => setFormData({ ...formData, location_id: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>Selecione um local</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Responsável</label>
                  <select
                    value={formData.responsible_id || 0}
                    onChange={(e) => setFormData({ ...formData, responsible_id: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>Selecione um responsável</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Valor de Aquisição</label>
                  <input
                    type="number"
                    value={formData.acquisition_value || 0}
                    onChange={(e) => setFormData({ ...formData, acquisition_value: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Data de Aquisição</label>
                  <input
                    type="date"
                    value={formData.acquisition_date || ''}
                    onChange={(e) => setFormData({ ...formData, acquisition_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                >
                  {editingPatrimony ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
