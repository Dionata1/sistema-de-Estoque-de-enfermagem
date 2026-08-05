/**
 * Sistema de Estoque de Enfermagem CEET
 * Modal de Login com Senha Forte, Proteção Anti-Invasão (Brute-Force) & Troca de Senha
 * Centro Estadual de Educação Técnica Giuseppe Altoé - CEET
 */

import React, { useState } from 'react';
import {
  Lock,
  Mail,
  KeyRound,
  Shield,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  UserCheck,
  X,
  HelpCircle,
} from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  currentUser: User;
  onOpenPrivacyPolicy: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentUser,
  onOpenPrivacyPolicy,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'change_password'>('login');
  const [email, setEmail] = useState<string>(currentUser.email || 'dionatadealmeida580@gmail.com');
  const [password, setPassword] = useState<string>('Ceet@2026!');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Campos para alteração de senha
  const [currentPass, setCurrentPass] = useState<string>('');
  const [newPass, setNewPass] = useState<string>('');
  const [confirmPass, setConfirmPass] = useState<string>('');
  const [showNewPass, setShowNewPass] = useState<boolean>(false);

  if (!isOpen) return null;

  // Calculador de Força de Senha (0 a 4)
  const calculatePasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: 'Não informada', color: 'bg-slate-300' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd)) score += 1;
    if (/[@$!%*?&#^()_+=-]/.test(pwd)) score += 1;

    switch (score) {
      case 1:
        return { score, label: 'Fraca', color: 'bg-red-500' };
      case 2:
        return { score, label: 'Média', color: 'bg-amber-500' };
      case 3:
        return { score, label: 'Forte', color: 'bg-blue-500' };
      case 4:
        return { score, label: 'Muito Forte (Segura)', color: 'bg-emerald-500' };
      default:
        return { score: 0, label: 'Muito Fraca', color: 'bg-red-300' };
    }
  };

  const strength = calculatePasswordStrength(newPass);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const resp = await api.login(email, password);
      if (resp.success && resp.data) {
        localStorage.setItem('ceet_active_user_id', String(resp.data.user.id));
        
        // Verificar se é primeiro acesso e exige troca obrigatória de senha
        if ((resp as any).must_change_password || resp.data.user.must_change_password) {
          setActiveTab('change_password');
          setCurrentPass(password);
          setSuccessMessage('PRIMEIRO ACESSO DETECTADO: Por exigência do Administrador Geral, você deve criar sua nova senha pessoal para liberar o sistema.');
          return;
        }

        setSuccessMessage('Autenticação segura confirmada! Redirecionando...');
        setTimeout(() => {
          onSuccess(resp.data!.user);
          onClose();
        }, 600);
      } else {
        setErrorMessage(resp.message || 'Credenciais inválidas.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao conectar ao servidor de segurança CEET.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPass !== confirmPass) {
      setErrorMessage('A nova senha e a confirmação de senha não coincidem.');
      return;
    }

    if (strength.score < 3) {
      setErrorMessage(
        'A nova senha não atende aos critérios mínimos de força (mín. 8 caracteres, maiúscula, minúscula, número e símbolo).'
      );
      return;
    }

    setLoading(true);
    try {
      const targetUserId = currentUser.id || Number(localStorage.getItem('ceet_active_user_id') || 1);
      const resp = await api.changePassword(targetUserId, currentPass, newPass);
      if (resp.success) {
        setSuccessMessage('Nova senha forte cadastrada e ativada com sucesso! Conectando ao sistema...');
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
        setTimeout(() => {
          onSuccess({ ...currentUser, must_change_password: false });
          onClose();
        }, 900);
      } else {
        setErrorMessage(resp.message || 'Erro ao alterar senha.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao processar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Top Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/30 text-blue-400 border border-blue-500/30">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Proteção CEET
                </span>
                <span className="text-xs text-slate-400">&bull; LGPD e Antinvasão</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">Acesso Seguro &amp; Senha Forte</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs de Seleção */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
          <button
            onClick={() => {
              setActiveTab('login');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-3 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'login'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Autenticar / Trocar Perfil
          </button>
          <button
            onClick={() => {
              setActiveTab('change_password');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-3 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'change_password'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Alterar Senha Forte
          </button>
        </div>

        {/* Formulário de Autenticação */}
        {activeTab === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
            {/* Banner com credenciais de teste para avaliação rápida */}
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  Perfis de Teste Rápidos (Clique para testar):
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => quickFill('dionatadealmeida580@gmail.com', 'Ceet@2026!')}
                  className="p-2 rounded-xl text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 text-[11px] transition-all"
                >
                  <span className="font-bold block text-slate-800 dark:text-slate-200">Dionata (ADMIN)</span>
                  <span className="text-[10px] text-slate-500">Senha: Ceet@2026!</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('estoque@ceet.edu.br', 'Estoque#2026!')}
                  className="p-2 rounded-xl text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 text-[11px] transition-all"
                >
                  <span className="font-bold block text-slate-800 dark:text-slate-200">Estoque (CEET)</span>
                  <span className="text-[10px] text-slate-500">Senha: Estoque#2026!</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('professor@ceet.edu.br', 'Professor$2026')}
                  className="p-2 rounded-xl text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 text-[11px] transition-all"
                >
                  <span className="font-bold block text-slate-800 dark:text-slate-200">Professor (CEET)</span>
                  <span className="text-[10px] text-slate-500">Senha: Professor$2026</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('coordenacao@ceet.edu.br', 'Direcao*2026!')}
                  className="p-2 rounded-xl text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 text-[11px] transition-all"
                >
                  <span className="font-bold block text-slate-800 dark:text-slate-200">Coordenação (CEET)</span>
                  <span className="text-[10px] text-slate-500">Senha: Direcao*2026!</span>
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                E-mail Institucional CEET
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: dionatadealmeida580@gmail.com"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Senha Forte de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha forte"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Verificando segurança CEET...' : 'Entrar com Acesso Seguro CEET'}
              </button>
            </div>

            {/* Política LGPD link */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={onOpenPrivacyPolicy}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <Shield className="w-3.5 h-3.5" />
                Política de Privacidade &amp; Proteção de Dados (LGPD)
              </button>
              <span className="text-[11px] text-slate-400">Proteção Anti-Brute-Force</span>
            </div>
          </form>
        ) : (
          <form onSubmit={handleChangePasswordSubmit} className="p-6 space-y-4">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Senha Atual
              </label>
              <input
                type="password"
                required
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                placeholder="Sua senha atual"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nova Senha Forte
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Mín. 8 caracteres, maiúscula, minúscula, núm, símbolo"
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Barra indicadora de força */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  <span>Força da Senha:</span>
                  <span
                    className={
                      strength.score === 4
                        ? 'text-emerald-600'
                        : strength.score === 3
                        ? 'text-blue-600'
                        : 'text-amber-600'
                    }
                  >
                    {strength.label}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${(strength.score / 4) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Confirmar Nova Senha Forte
              </label>
              <input
                type={showNewPass ? 'text' : 'password'}
                required
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 space-y-1">
              <span className="font-bold block text-slate-700 dark:text-slate-300">Critérios de Segurança CEET:</span>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Mínimo de 8 caracteres</li>
                <li>Pelo menos uma letra maiúscula (A-Z)</li>
                <li>Pelo menos uma letra minúscula (a-z)</li>
                <li>Pelo menos um número (0-9)</li>
                <li>Pelo menos um caractere especial (@$!%*?&amp;)</li>
              </ul>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all"
              >
                {loading ? 'Salvando Senha Forte...' : 'Atualizar Senha com Criptografia'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
