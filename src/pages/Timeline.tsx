import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../services/api';
// Importamos os ícones que vamos usar
import { Search, Image, LogOut, UserCircle } from 'lucide-react';

interface Post {
  id: string;
  title: string;
  content: string;
  author: {
    name: string;
    username?: string; // Opcional, caso a API não mande
  };
  likesCount: number;
}

const postSchema = z.object({
  title: z.string().min(3, 'O título precisa ter pelo menos 3 letras'),
  content: z.string().min(5, 'Escreva pelo menos 5 letras no conteúdo'),
});

type PostForm = z.infer<typeof postSchema>;

export function Timeline() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PostForm>({
    resolver: zodResolver(postSchema),
  });

  // 1. Buscar posts com blindagem (já atualizado)
  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const response = await api.get('/posts');
      if (Array.isArray(response.data)) return response.data as Post[];
      if (response.data && Array.isArray(response.data.data)) return response.data.data as Post[];
      return [] as Post[];
    }
  });

  // 2. Criar post (Mutation)
  const createPostMutation = useMutation({
    mutationFn: async (data: PostForm) => {
      await api.post('/posts', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      reset();
    }
  });

  function onSubmit(data: PostForm) {
    createPostMutation.mutate(data);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    navigate('/login');
  }

  return (
    // Fundo ultra escuro (igual ao protótipo)
    <div className="min-h-screen bg-[#0F172A] text-white p-4 font-sans">
      <div className="max-w-2xl mx-auto">
        
        {/* CABEÇALHO (Escuro, com busca) */}
        <header className="flex justify-between items-center bg-[#1E293B] p-4 rounded-xl shadow-md mb-6 border border-slate-700">
          <h1 className="text-xl font-bold text-white">Mini Twitter</h1>
          
          {/* Barra de Busca (Nova!) */}
          <div className="relative w-full max-w-xs mx-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
            <input 
              type="search" 
              placeholder="Buscar por post..." 
              className="w-full bg-[#0F172A] border border-slate-700 rounded-full py-2 pl-10 pr-4 text-sm text-gray-300 placeholder:text-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 transition">
            <LogOut className="h-6 w-6" />
          </button>
        </header>

        {/* CAIXA DE CRIAR POST (Escura, com ícone de foto) */}
        <form onSubmit={handleSubmit(onSubmit)} className="bg-[#1E293B] p-5 rounded-xl shadow-md mb-6 border border-slate-700">
          <div className="flex gap-4">
            {/* Avatar genérico */}
            <UserCircle className="h-10 w-10 text-gray-600 mt-1 flex-shrink-0" />
            
            <div className="w-full space-y-3">
              <div>
                <input 
                  {...register('title')} 
                  placeholder="Título do post" 
                  className="w-full bg-transparent text-lg font-semibold text-white placeholder:text-gray-600 focus:outline-none p-1"
                />
                {errors.title && <span className="text-red-500 text-sm pl-1">{errors.title.message}</span>}
              </div>

              <div>
                <textarea 
                  {...register('content')} 
                  // Texto do placeholder igual ao protótipo!
                  placeholder="E aí, o que está rolando?" 
                  rows={2}
                  className="w-full bg-transparent text-gray-300 placeholder:text-gray-600 focus:outline-none resize-none p-1"
                />
                {errors.content && <span className="text-red-500 text-sm pl-1">{errors.content.message}</span>}
              </div>

              {/* Linha de ação (Ícone de foto + Botão) */}
              <div className="flex justify-between items-center border-t border-slate-700 pt-3 mt-1">
                <button type="button" className="text-blue-500 hover:bg-blue-950 p-2 rounded-lg transition">
                  <Image className="h-6 w-6" />
                </button>
                <button 
                  type="submit" 
                  disabled={createPostMutation.isPending}
                  // Botão azul igual ao protótipo!
                  className="bg-blue-500 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-600 transition disabled:opacity-50"
                >
                  {createPostMutation.isPending ? 'Postando...' : 'Postar'}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* LISTA DE POSTS (Cartões Escuros) */}
        {isLoading && <p className="text-center text-gray-600 font-medium animate-pulse">Carregando...</p>}
        {error && <p className="text-center text-red-500 font-medium">Erro ao carregar os posts.</p>}

        <div className="space-y-4">
          {posts?.map((post) => (
            <div key={post.id} className="bg-[#1E293B] p-5 rounded-xl shadow-sm border border-slate-700">
              <div className="flex gap-3 mb-3">
                <UserCircle className="h-9 w-9 text-gray-600 mt-1 flex-shrink-0" />
                <div>
                  {/* Nome e Usuário como no protótipo */}
                  <div className="font-bold text-white text-base">{post.author?.name || 'Usuário'}</div>
                  <div className="text-xs text-gray-500">@{post.author?.username || 'user'} • Hoje</div>
                </div>
              </div>

              {/* Conteúdo do post */}
              <h2 className="text-xl font-bold text-white mb-2">{post.title}</h2>
              <p className="text-gray-300 text-base leading-relaxed whitespace-pre-wrap">{post.content}</p>
              
              {/* Espaço para imagem opcional (como no protótipo do b2bit) */}
              {post.title.includes("b2bit") && (
                <div className="bg-[#0F172A] border border-slate-700 h-40 rounded-lg my-4 flex items-center justify-center">
                    <span className="text-4xl font-black text-white">b2bit</span>
                </div>
              )}

              {/* Botão Curtir */}
              <div className="mt-4 flex items-center gap-2 text-gray-500 text-sm font-medium cursor-pointer w-max hover:bg-slate-800 p-2 rounded-lg transition">
                👍 {post.likesCount || 0} curtidas
              </div>
            </div>
          ))}
          
          {posts?.length === 0 && (
            <p className="text-center text-gray-600 mt-12">Nenhum post encontrado. Seja o primeiro!</p>
          )}
        </div>

      </div>
    </div>
  );
}