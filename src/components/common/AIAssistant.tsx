import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Loader2, X, Brain } from 'lucide-react';
import { api } from '../../services/api';

interface AIAssistantProps {
  category: 'GESTAO' | 'ESTOQUE' | 'PATRIMONIO' | 'PEDAGOGICO' | 'AUDITORIA';
  context: string;
  data: any;
  buttonText?: string;
  className?: string;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ 
  category, 
  context, 
  data, 
  buttonText = 'IA Analista',
  className = ""
}) => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const handleAnalyze = async (prompt?: string) => {
    setShowModal(true);
    setLoading(true);
    // setAnalysis(null); // Keep previous analysis if just asking a follow up? 
    // Actually the current backend logic is stateless for now, so let's clear it or just replace it.
    try {
      const res = await api.analyzeWithAI(category, context, data, prompt);
      if (res.success && res.data) {
        setAnalysis(res.data.analysis);
      } else {
        setAnalysis('❌ ' + (res.message || 'Erro ao processar análise inteligente.'));
      }
    } catch (err: any) {
      setAnalysis('❌ Erro na conexão com o CEET IA Core: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = () => {
    switch (category) {
      case 'GESTAO': return 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20';
      case 'ESTOQUE': return 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20';
      case 'PATRIMONIO': return 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20';
      case 'PEDAGOGICO': return 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20';
      case 'AUDITORIA': return 'bg-slate-700 hover:bg-slate-800 shadow-slate-500/20';
      default: return 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20';
    }
  };

  return (
    <>
      <button
        onClick={() => handleAnalyze()}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md ${getCategoryColor()} ${className}`}
      >
        <Sparkles className="w-4 h-4" />
        <span>{buttonText}</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className={`p-6 text-white flex items-center justify-between ${getCategoryColor().split(' ')[0]}`}>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-white/20 border border-white/20">
                  <Brain className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight">CEET IA Core</h3>
                  <p className="text-xs opacity-80 font-medium uppercase tracking-wider">{context}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-slate-950 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-6 text-center">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
                    <Sparkles className="w-6 h-6 text-amber-500 absolute -top-1 -right-1 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold text-slate-800 dark:text-slate-200">CEET IA Core Processando...</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                      A inteligência central do CEET está consultando os módulos de estoque, patrimônio e pedagógico para gerar uma análise integrada.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {analysis && (
                    <div className="prose prose-slate dark:prose-invert max-w-none prose-sm sm:prose-base 
                      prose-headings:text-slate-900 dark:prose-headings:text-white prose-headings:font-bold
                      prose-strong:text-blue-700 dark:prose-strong:text-blue-400 prose-blockquote:border-blue-500
                      bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <ReactMarkdown>{analysis}</ReactMarkdown>
                    </div>
                  )}
                  
                  {!analysis && !loading && (
                    <div className="flex flex-col items-center justify-center py-10 text-center opacity-60">
                      <Brain className="w-12 h-12 mb-4 text-slate-400" />
                      <p className="text-slate-500">Olá! Eu sou o núcleo de inteligência do CEET. Como posso ajudar hoje?</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Prompt Input Section */}
            <div className="p-4 bg-slate-100 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <input 
                  type="text" 
                  placeholder="Faça uma pergunta ao CEET IA Core (ex: Quais equipamentos estão em manutenção?)"
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-3 py-2 text-slate-900 dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value;
                      if (val) {
                        handleAnalyze(val);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    const input = document.querySelector('input[placeholder*="Faça uma pergunta"]') as HTMLInputElement;
                    if (input && input.value) {
                      handleAnalyze(input.value);
                      input.value = '';
                    } else {
                      handleAnalyze();
                    }
                  }}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{analysis ? 'Perguntar' : 'Analisar'}</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Sistema de Inteligência Artificial Institucional &bull; CEET Enfermagem
              </span>
              <button 
                onClick={() => setShowModal(false)}
                className="px-8 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition-all shadow-lg"
              >
                Fechar Relatório
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
