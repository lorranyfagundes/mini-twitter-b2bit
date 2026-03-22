import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Mail, Eye, EyeOff, User } from 'lucide-react';

const registerSchema = z.object({
  name: z.string().min(2, 'O nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Digite um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export function Register() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterForm) {
    try {
      setApiError('');
      await api.post('/auth/register', data);
      
      // Cadastro feito? Vamos mandar ele pro login com uma mensagem de sucesso
      alert('Conta criada com sucesso! Agora é só fazer login.');
      navigate('/login');
    } catch (error: any) {
      if (error.response?.status === 400) {
        setApiError('Este e-mail já está em uso.');
      } else {
        setApiError('Ocorreu um erro ao criar a conta. Tente novamente.');
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 font-sans text-white">
      
      <h1 className="text-4xl font-bold text-white mb-10">Mini Twitter</h1>

      <div className="w-full max-w-sm">
        
        {/* ABAS (Invertidas agora) */}
        <div className="flex w-full mb-8">
          <Link 
            to="/login" 
            className="flex-1 text-center pb-3 border-b-2 border-transparent border-b-slate-700 text-gray-500 hover:text-gray-300 font-semibold text-lg transition"
          >
            Login
          </Link>
          <div className="flex-1 text-center pb-3 border-b-2 border-blue-500 text-white font-semibold text-lg cursor-default">
            Cadastrar
          </div>
        </div>

        {/* TEXTO DE BOAS VINDAS */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Olá, vamos começar!</h2>
          <p className="text-gray-400 text-sm">Por favor, insira os dados solicitados para fazer cadastro.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
            <div className="relative">
              <input 
                {...register('name')}
                placeholder="Insira o seu nome"
                className="w-full bg-[#1E293B] border border-slate-700 rounded-xl py-3 pl-4 pr-10 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
              <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            </div>
            {errors.name && <span className="text-red-500 text-sm mt-1 block">{errors.name.message}</span>}
          </div>

          {/* E-mail */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">E-mail</label>
            <div className="relative">
              <input 
                {...register('email')}
                type="email"
                placeholder="Insira o seu e-mail"
                className="w-full bg-[#1E293B] border border-slate-700 rounded-xl py-3 pl-4 pr-10 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            </div>
            {errors.email && <span className="text-red-500 text-sm mt-1 block">{errors.email.message}</span>}
          </div>

          {/* Senha */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Senha</label>
            <div className="relative">
              <input 
                {...register('password')}
                type={showPassword ? "text" : "password"}
                placeholder="Insira a sua senha"
                className="w-full bg-[#1E293B] border border-slate-700 rounded-xl py-3 pl-4 pr-10 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && <span className="text-red-500 text-sm mt-1 block">{errors.password.message}</span>}
          </div>

          {apiError && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center font-medium">
              {apiError}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-[#0EA5E9] text-white font-bold py-3 rounded-full hover:bg-blue-500 transition shadow-[0_0_15px_rgba(14,165,233,0.3)] disabled:opacity-50 mt-4"
          >
            {isSubmitting ? 'Criando conta...' : 'Continuar'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-8 leading-relaxed">
          Ao clicar em continuar, você concorda com nossos <br />
          <a href="#" className="underline hover:text-gray-300">Termos de Serviço</a> e <a href="#" className="underline hover:text-gray-300">Política de Privacidade</a>.
        </p>

      </div>
    </div>
  );
}