/**
 * Sistema de Estoque de Enfermagem CEET
 * Central de Ajuda e Suporte Técnico (TEL-008 a TEL-011)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  LifeBuoy,
  MessageCircle,
  Monitor,
  ShieldCheck,
  Search,
  Plus,
  Send,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  MoreVertical,
  X,
  Phone,
  Video,
  Settings,
  Paperclip,
  Share2,
  Lock,
  ArrowUpRight,
  Stethoscope,
  Brain,
} from 'lucide-react';
import { SupportTicket, SupportMessage, RemoteAccessRequest, User as UserType, Role, SupportStatus } from '../types';
import { api } from '../services/api';
import { AIAssistant } from './common/AIAssistant';

export const SupportView: React.FC<{ currentUser: UserType }> = ({ currentUser }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [remoteAccess, setRemoteAccess] = useState<RemoteAccessRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [ticketAttachments, setTicketAttachments] = useState<any[]>([]);
  const [isRemoteSessionActive, setIsRemoteSessionActive] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ticketFileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRemoteSessionActive && videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream;
    }
  }, [isRemoteSessionActive, screenStream]);

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setScreenStream(stream);
      setIsRemoteSessionActive(true);
      
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error('Erro ao compartilhar tela:', err);
      alert('Não foi possível iniciar o compartilhamento de tela.');
    }
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    setIsRemoteSessionActive(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTicket) return;

    try {
      const res = await api.upload(file, currentUser.id);
      if (res.success && res.data) {
        await api.sendSupportMessage(selectedTicket.id, `[ANEXO: ${file.name}]`, [res.data]);
        loadMessages(selectedTicket.id);
      }
    } catch (error) {
      console.error('Erro ao enviar anexo:', error);
    }
  };

  const handleTicketFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await api.upload(file, currentUser.id);
      if (res.success && res.data) {
        setTicketAttachments(prev => [...prev, res.data]);
      }
    } catch (err) {
      console.error('Erro no upload do ticket:', err);
      alert('Falha ao anexar arquivo ao chamado.');
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket.id);
      const interval = setInterval(() => loadMessages(selectedTicket.id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedTicket]);

  const loadTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSupportTickets();
      setTickets(data);
    } catch (error) {
      console.error('Erro ao carregar chamados:', error);
      setError('Não foi possível carregar os chamados. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (ticketId: number) => {
    try {
      const data = await api.getSupportMessages(ticketId);
      setMessages(data);
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newMessage.trim()) return;
    try {
      const res = await api.sendSupportMessage(selectedTicket.id, newMessage);
      if (res.success) {
        setNewMessage('');
        loadMessages(selectedTicket.id);
      } else {
        alert('Erro ao enviar mensagem: ' + res.message);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Não foi possível enviar a mensagem. Verifique sua conexão.');
    }
  };

  const handleCreateTicket = async (data: Partial<SupportTicket>) => {
    try {
      const res = await api.createSupportTicket({
        ...data,
        attachments: ticketAttachments,
      });
      if (res.success && res.data) {
        alert(`Chamado aberto com sucesso!\nNúmero do chamado: ${res.data.ticket_number}`);
        setShowNewTicketModal(false);
        setTicketAttachments([]);
        await loadTickets();
        
        // Selecionar automaticamente o novo chamado
        const newTicket = res.data;
        setSelectedTicket(newTicket);
      } else {
        alert('Erro ao criar chamado: ' + res.message);
      }
    } catch (error) {
      console.error('Erro ao criar chamado:', error);
      alert('Não foi possível registrar sua dúvida. Verifique a conexão com o servidor.');
    }
  };

  const handleRequestRemoteAccess = async () => {
    if (!selectedTicket) return;
    try {
      await api.requestRemoteAccess(selectedTicket.id, 'Suporte avançado solicitado');
      alert('Solicitação de acesso remoto enviada ao técnico!');
    } catch (error) {
      console.error('Erro ao solicitar acesso remoto:', error);
    }
  };

  const handleToggleStatus = async (status: SupportStatus) => {
    if (!selectedTicket) return;
    try {
      await api.updateSupportTicket(selectedTicket.id, { status });
      setSelectedTicket({ ...selectedTicket, status });
      loadTickets();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const isTechnician = currentUser.role === 'ADMIN' || currentUser.role === 'TECNICO';

  const filteredTickets = tickets.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LifeBuoy className="w-7 h-7 text-blue-600" />
            Central de Ajuda CEET
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Suporte técnico especializado, chat em tempo real e acesso remoto
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <AIAssistant 
            category="GESTAO" 
            context="Suporte Técnico & Chamados" 
            data={tickets} 
            buttonText="IA de Suporte (Abrir Chamado)"
          />
          <button
            onClick={() => setShowNewTicketModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-500/20"
          >
            <Plus className="w-5 h-5" />
            Novo Chamado
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* LISTA DE CHAMADOS */}
        <div className={`w-full lg:w-80 flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shrink-0 ${selectedTicket ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar chamados..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-xs outline-hidden"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 border-b border-slate-50 dark:border-slate-800 animate-pulse">
                  <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded mb-2" />
                  <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              ))
            ) : error ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2 opacity-50" />
                <p className="text-xs text-slate-500 mb-4">{error}</p>
                <button 
                  onClick={loadTickets}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Tentar Novamente
                </button>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
                {searchTerm ? 'Nenhum chamado encontrado.' : 'Nenhum chamado aberto.'}
              </div>
            ) : (
              filteredTickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`w-full p-4 border-b border-slate-50 dark:border-slate-800 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selectedTicket?.id === t.id ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-l-blue-600' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t.ticket_number}</span>
                    <span className="text-[10px] text-slate-400">{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate mb-1">{t.title}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      t.status === 'Aberto' ? 'bg-blue-500' : 
                      t.status === 'Em atendimento' ? 'bg-amber-500' : 
                      'bg-emerald-500'
                    }`} />
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">
                      {t.status}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* CHAT / ÁREA DE CONVERSA */}
        <div className={`flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden relative ${!selectedTicket ? 'hidden lg:flex' : 'flex'}`}>
          {selectedTicket ? (
            <>
              {/* Header do Chat */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedTicket(null)} className="lg:hidden p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{selectedTicket.title}</h3>
                    <p className="text-[10px] text-slate-500">{selectedTicket.user_name} &bull; {selectedTicket.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   {isTechnician && selectedTicket.status === 'Aberto' && (
                    <button 
                      onClick={() => handleToggleStatus('Em atendimento')}
                      className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20 text-[10px] font-bold hover:bg-amber-100 transition-colors"
                    >
                      Assumir Chamado
                    </button>
                  )}
                  {isTechnician && selectedTicket.status === 'Em atendimento' && (
                    <button 
                      onClick={() => handleToggleStatus('Atendido')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                    >
                      Marcar como Atendido
                    </button>
                  )}
                  <button 
                    onClick={handleRequestRemoteAccess}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all"
                    title="Solicitar Acesso Remoto"
                  >
                    <Monitor className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={startScreenShare}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all"
                    title="Compartilhamento de Tela"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-600 transition-all">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Corpo das Mensagens */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/20">
                {/* Descrição Inicial do Chamado (RN-050) */}
                <div className="flex justify-start animate-in fade-in slide-in-from-left-4 duration-500">
                  <div className="max-w-[90%] rounded-2xl p-4 bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                       <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400">
                         <AlertCircle className="w-4 h-4" />
                       </div>
                       <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Problema Reportado</span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed italic opacity-80 mb-3 whitespace-pre-wrap">{selectedTicket.description}</p>
                    
                    {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-[9px] font-bold text-slate-400 block mb-2 uppercase">Materiais de Auxílio</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedTicket.attachments.map(att => (
                            <a 
                              key={att.id}
                              href={att.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-300 hover:border-blue-400 transition-all group"
                            >
                              <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                              <span className="flex-1 truncate">{att.name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {messages.length === 0 && !isTechnician ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                     <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 max-w-sm text-center">
                        <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Conexão Segura Ativada</h4>
                        <p className="text-xs text-slate-500 mt-1">Este chat é criptografado e monitorado para auditoria institucional CEET.</p>
                     </div>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.author_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl p-3 shadow-xs ${
                        m.author_id === currentUser.id 
                          ? 'bg-blue-600 text-white rounded-tr-none' 
                          : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 rounded-tl-none'
                      }`}>
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <span className={`text-[9px] font-bold ${m.author_id === currentUser.id ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'}`}>
                            {m.author_name} ({m.author_role})
                          </span>
                          <span className={`text-[9px] ${m.author_id === currentUser.id ? 'text-blue-200' : 'text-slate-400'}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{m.text}</p>
                        {m.attachments && m.attachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {m.attachments.map(att => (
                              <a 
                                key={att.id}
                                href={att.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 p-2 rounded-lg text-[10px] border ${
                                  m.author_id === currentUser.id 
                                    ? 'bg-blue-500/30 border-blue-400/30 text-white' 
                                    : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                <Paperclip className="w-3 h-3" />
                                <span className="flex-1 truncate">{att.name}</span>
                                <span className="opacity-60">({(att.size/1024).toFixed(1)} KB)</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input de Mensagem */}
              <form onSubmit={handleSendMessage} className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 shrink-0">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileUpload}
                />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escreva sua mensagem aqui..."
                  className="flex-1 py-2.5 bg-transparent text-sm outline-hidden dark:text-white"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-md shadow-blue-500/20"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
               <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600 mb-6">
                 <MessageCircle className="w-10 h-10" />
               </div>
               <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Sua Central de Atendimento</h3>
               <p className="text-sm max-w-md mx-auto">
                 Selecione um chamado ao lado para visualizar a conversa ou peça para nossa IA abrir um chamado para você.
               </p>
               <div className="mt-6">
                 <AIAssistant 
                    category="GESTAO" 
                    context="Criação de Chamados" 
                    data={tickets} 
                    buttonText="Falar com IA de Suporte"
                  />
               </div>
               <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-sm">
                  <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-left">
                    <Settings className="w-5 h-5 text-blue-500 mb-2" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Dúvidas Técnicas</p>
                    <p className="text-[10px] text-slate-500 mt-1">Acesso ao sistema e permissões.</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-left">
                    <Monitor className="w-5 h-5 text-blue-500 mb-2" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Hardware</p>
                    <p className="text-[10px] text-slate-500 mt-1">Impressoras e computadores.</p>
                  </div>
               </div>
            </div>
          )}

          {/* ACESSO REMOTO / COMPARTILHAMENTO REAL */}
          {isRemoteSessionActive && (
            <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col animate-in slide-in-from-bottom duration-500">
              <div className="px-6 py-3 bg-blue-600 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-2 py-1 bg-white/20 rounded-lg animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-white" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Sessão Ativa: Compartilhando Tela</span>
                  </div>
                  <span className="text-xs font-medium opacity-80">Sua tela está sendo transmitida com segurança para o suporte técnico CEET.</span>
                </div>
                <button 
                  onClick={stopScreenShare}
                  className="px-3 py-1 bg-white text-blue-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors"
                >
                  Parar Compartilhamento
                </button>
              </div>
              <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="max-w-full max-h-full object-contain shadow-2xl"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {showNewTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Abrir Novo Chamado</h3>
              <button onClick={() => setShowNewTicketModal(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                handleCreateTicket({
                  title: (form.elements.namedItem('title') as HTMLInputElement).value,
                  description: (form.elements.namedItem('description') as HTMLTextAreaElement).value,
                  category: (form.elements.namedItem('category') as HTMLSelectElement).value as any,
                  priority: (form.elements.namedItem('priority') as HTMLSelectElement).value as any,
                });
              }} 
              className="p-6 space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Título do Problema</label>
                <input name="title" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-blue-500" placeholder="Ex: Não consigo acessar os relatórios de estoque" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Categoria</label>
                  <select name="category" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-blue-500">
                    <option value="Sistema">Sistema / Software</option>
                    <option value="Cadastro">Cadastro de Dados</option>
                    <option value="Relatórios">Relatórios / Exportação</option>
                    <option value="Estoque">Operações de Estoque</option>
                    <option value="Login">Acesso / Senha</option>
                    <option value="Hardware">Equipamentos / TI</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Prioridade</label>
                  <select name="priority" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-blue-500">
                    <option value="Baixa">Baixa (Dúvida)</option>
                    <option value="Média">Média (Ajuste)</option>
                    <option value="Alta">Alta (Impedimento)</option>
                    <option value="Crítica">Crítica (Erro Fatal)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Descrição Detalhada</label>
                <textarea name="description" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm outline-hidden focus:ring-2 focus:ring-blue-500 min-h-[120px]" placeholder="Forneça o máximo de detalhes possível, incluindo mensagens de erro..." />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 flex items-center gap-2">
                  <Paperclip className="w-3 h-3 text-blue-500" />
                  Materiais de Auxílio / Anexos
                </label>
                
                <div className="flex flex-wrap gap-2">
                  {ticketAttachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-[10px] text-blue-700 dark:text-blue-300 animate-in zoom-in-95 duration-200">
                      <Paperclip className="w-3 h-3" />
                      <span className="truncate max-w-[150px] font-bold">{att.name}</span>
                      <button 
                        type="button" 
                        onClick={() => setTicketAttachments(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  
                  <button 
                    type="button"
                    onClick={() => ticketFileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all text-[11px] font-bold hover:bg-blue-50/50"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Anexo
                  </button>
                </div>

                <input 
                  type="file" 
                  ref={ticketFileInputRef} 
                  className="hidden" 
                  onChange={handleTicketFileUpload}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowNewTicketModal(false)} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20">Abrir Chamado</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
