/**
 * Sistema de Estoque de Enfermagem CEET
 * Modal Institucional de Política de Privacidade & Proteção de Dados (LGPD - Lei nº 13.709/2018)
 * Centro Estadual de Educação Técnica Giuseppe Altoé - CEET
 */

import React from 'react';
import {
  Shield,
  Lock,
  FileText,
  UserCheck,
  Eye,
  CheckCircle2,
  X,
  AlertCircle,
  Database,
} from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/30 text-blue-400 border border-blue-500/30">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Lei Federal nº 13.709/2018 (LGPD)
                </span>
                <span className="text-xs text-slate-400">&bull; CEET Giuseppe Altoé</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Política de Privacidade &amp; Proteção de Dados Institucionais
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-600 dark:text-slate-300">
          {/* Banner Resumo Institucional */}
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-900 dark:text-blue-200">
                Compromisso CEET com a Segurança da Informação
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-300 mt-1">
                O Centro Estadual de Educação Técnica Giuseppe Altoé (CEET) adota medidas técnicas, administrativas e
                organizacionais robustas para proteger os dados pessoais de alunos, professores, coordenadores e
                profissionais de enfermagem no manuseio de insumos hospitalares.
              </p>
            </div>
          </div>

          {/* Seção 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-base">
              <Lock className="w-5 h-5 text-blue-600" />
              <h4>1. Autenticação Segura com Senha Forte &amp; Prevenção de Invasões</h4>
            </div>
            <p className="text-xs leading-relaxed">
              O acesso ao sistema requer credenciais autenticadas e política de senha forte (mínimo de 8 caracteres,
              incluindo letras maiúsculas, minúsculas, números e símbolos especiais). O sistema possui monitoramento
              ativo contra ataques de força bruta (<span className="italic">Brute Force Protection</span>): após 5
              tentativas consecutivas falhas de login, a conta é temporariamente bloqueada e um evento de segurança é
              registrado na auditoria.
            </p>
          </div>

          {/* Seção 2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-base">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <h4>2. Controle de Acesso Baseado em Cargos (RBAC - RN-010)</h4>
            </div>
            <p className="text-xs leading-relaxed">
              Cada transação de estoque, inventário ou consulta é vinculada estritamente ao perfil de acesso (ADMIN,
              ESTOQUE, PROFESSOR ou COORDENAÇÃO). Não há permissão de modificação de saldos fora das regras de negócio
              oficiais (RN-001 a RN-048).
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                <span className="block text-[10px] font-bold text-blue-600 dark:text-blue-400">ADMIN</span>
                <span className="text-[11px] text-slate-500">Acesso Total &amp; Segurança</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                <span className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400">ESTOQUE</span>
                <span className="text-[11px] text-slate-500">Entradas, Saídas e Lotes</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                <span className="block text-[10px] font-bold text-purple-600 dark:text-purple-400">PROFESSOR</span>
                <span className="text-[11px] text-slate-500">Requisições de Prática</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                <span className="block text-[10px] font-bold text-amber-600 dark:text-amber-400">COORDENAÇÃO</span>
                <span className="text-[11px] text-slate-500">Supervisão &amp; Relatórios</span>
              </div>
            </div>
          </div>

          {/* Seção 3 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-base">
              <FileText className="w-5 h-5 text-purple-600" />
              <h4>3. Auditoria Imutável &amp; Rastreabilidade Completa (RN-048)</h4>
            </div>
            <p className="text-xs leading-relaxed">
              Todas as ações realizadas no sistema (como logins, ajustes de estoque, aprovações de compra, alterações
              de lote e modificações de segurança) são gravadas com assinatura temporal (<span className="italic">timestamp ISO</span>),
              endereço IP e identificação única do operador na trilha de auditoria (Capítulo 15). Nenhum registro
              auditado pode ser excluído por operadores comuns.
            </p>
          </div>

          {/* Seção 4 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-base">
              <Database className="w-5 h-5 text-amber-600" />
              <h4>4. Proteção de Dados, Criptografia e Backups Institucionais</h4>
            </div>
            <p className="text-xs leading-relaxed">
              O banco de dados é mantido de forma segura com isolamento de transações. Os backups são gerados com
              criptografia de verificação e retenção configurável de 30 dias (RN-049), garantindo a integridade dos
              registros hospitalares e didáticos contra perda ou adulteração de dados.
            </p>
          </div>

          {/* Selo LGPD */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Conformidade Integral com a Lei Geral de Proteção de Dados (LGPD)
                </p>
                <p className="text-[11px] text-slate-500">
                  Em caso de dúvidas sobre seus dados ou permissões, consulte a Coordenação Geral do CEET.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">CEET 2026</span>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Centro Estadual de Educação Técnica Giuseppe Altoé &bull; Segurança da Informação
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
          >
            Entendido &amp; Aceitar
          </button>
        </div>
      </div>
    </div>
  );
};
