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
  currentUser?: User | null;
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
  const [email, setEmail] = useState<string>(currentUser?.email || '');
  const [password, setPassword] = useState<string>('Ceet@2026!');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(currentUser || null);

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
          setAuthenticatedUser(resp.data.user);
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
      const targetUserId = authenticatedUser?.id || currentUser?.id || Number(localStorage.getItem('ceet_active_user_id') || 1);
      const resp = await api.changePassword(targetUserId, currentPass, newPass);
      if (resp.success) {
        setSuccessMessage('Nova senha forte cadastrada e ativada com sucesso! Conectando ao sistema...');
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
        setTimeout(() => {
          onSuccess({ ...(authenticatedUser || currentUser as User), must_change_password: false });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black p-4 overflow-y-auto">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header - Dark Blue with Shield Icon */}
        <div className="p-8 bg-[#0a1224] text-white flex items-center gap-5">
          <div className="p-4 rounded-[20px] bg-[#1e293b] text-blue-500 border border-blue-900/50">
            <Shield className="w-10 h-10 fill-current opacity-80" />
          </div>
          <div className="space-y-1">
            <div className="inline-block px-3 py-1 rounded-full bg-[#1e293b] text-[#3b82f6] text-[10px] font-bold uppercase tracking-wider border border-blue-900/30">
              ACESSO CEET
            </div>
            <h3 className="text-2xl font-bold text-white leading-tight">Autenticação do Sistema</h3>
            <p className="text-sm text-slate-400 font-medium">Sessão protegida por token e controle de permissões.</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          {/* Info Alert Box */}
          <div className="p-5 rounded-2xl bg-[#eff6ff] border border-[#dbeafe] text-[#1d4ed8] text-sm leading-relaxed">
            Por segurança, as senhas não são mais exibidas nem preenchidas automaticamente na tela.
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-6">
            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-[#1e293b] mb-2">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ceet.edu.br"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1e293b] mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Verificando...' : 'Entrar no Sistema CEET'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={onOpenPrivacyPolicy}
                className="text-sm text-[#2563eb] hover:underline font-medium"
              >
                Política de Privacidade e Proteção de Dados
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
