import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Mail, Eye, EyeOff } from 'lucide-react';


// Validação do Zod
const loginSchema = z.object({
  email: z.string().email('Digite um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Estado para o "Olho" da senha

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginForm) {
    try {
      setApiError('');
      const response = await api.post('/auth/login', data);
      
      const token = response.data.token || response.data.data?.token;
      if (token) {
        // 1. Salva o token
        localStorage.setItem('token', token);
        
        // 2. Abre a "maleta" do token (decodifica o JWT) para pegar o ID
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        // 3. Salva o ID no localStorage
        const userId = payload.sub || payload.id;
        if (userId) {
          localStorage.setItem('userId', String(userId));
        }

        // 4. Vai pra Timeline
        navigate('/timeline');
      }
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 404) {
        setApiError('E-mail ou senha inválidos.');
      } else {
        setApiError('Ocorreu um erro ao fazer login. Tente novamente.');
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 font-sans text-white">
      
      {/* TÍTULO */}
      <h1 className="text-4xl font-normal text-white mb-10">Mini Twitter</h1>

      <div className="w-full max-w-sm">
        
        {/* ABAS (Tabs) */}
        <div className="flex w-full mb-8">
          <div className="flex-1 text-center pb-3 border-b-2 border-blue-500 text-white font-semibold text-lg cursor-default">
            Login
          </div>
          <Link 
            to="/register" 
            className="flex-1 text-center pb-3 border-b-2 border-transparent border-b-slate-700 text-gray-500 hover:text-gray-300 font-semibold text-lg transition"
          >
            Cadastrar
          </Link>
        </div>

        {/* TEXTO DE BOAS VINDAS */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Olá, de novo!</h2>
          <p className="text-gray-400 text-sm">Por favor, insira os seus dados para fazer login.</p>
        </div>

        {/* FORMULÁRIO */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          
          {/* Campo E-mail */}
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

          {/* Campo Senha */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Senha</label>
            <div className="relative">
              <input 
                {...register('password')}
                type={showPassword ? "text" : "password"} // Muda de bolinhas para texto
                placeholder="Insira a sua senha"
                className="w-full bg-[#1E293B] border border-slate-700 rounded-xl py-3 pl-4 pr-10 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
              {/* Botão do Olho */}
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

          {/* Erro da API (E-mail ou senha incorretos) */}
          {apiError && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center">
              {apiError}
            </div>
          )}

          {/* Botão Continuar */}
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-[#0EA5E9] text-white font-bold py-3 rounded-full hover:bg-blue-500 transition shadow-[0_0_15px_rgba(14,165,233,0.3)] disabled:opacity-50 mt-4"
          >
            {isSubmitting ? 'Carregando...' : 'Continuar'}
          </button>
        </form>
          
          <div className="mt-6 text-center">
  <p className="text-gray-400 mb-2">Apenas dando uma olhada?</p>
  <Link 
    to="/timeline" 
    className="text-blue-500 font-semibold hover:text-blue-400 hover:underline transition"
  >
    Entrar como visitante
  </Link>
</div>

        {/* FOOTER */}
        <p className="text-center text-xs text-gray-500 mt-8 leading-relaxed">
          Ao clicar em continuar, você concorda com nossos <br />
          <a href="#" className="underline hover:text-gray-300">Termos de Serviço</a> e <a href="#" className="underline hover:text-gray-300">Política de Privacidade</a>.
        </p>

      </div>
    </div>
  );
}