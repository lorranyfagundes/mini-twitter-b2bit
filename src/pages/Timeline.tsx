import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../services/api';
import { useState, useRef, useEffect } from 'react';
import { Search, Image, Heart, LogOut } from 'lucide-react';

interface Post {
  id: string | number;
  title: string;
  content: string;
  createdAt?: string;
  image?: string | null;
  authorName?: string;
  authorId?: number;
  likesCount: number;
}

const postSchema = z.object({
  title: z.string().min(3, 'O título precisa ter pelo menos 3 letras'),
  content: z.string().min(5, 'Escreva pelo menos 5 letras no conteúdo'),
});

type PostForm = z.infer<typeof postSchema>;

// Função mágica para transformar Arquivo em String (Base64)
const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.readAsDataURL(file);
    fileReader.onload = () => resolve(fileReader.result as string);
    fileReader.onerror = (error) => reject(error);
  });
};

export function Timeline() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado da Paginação
  const [currentPage, setCurrentPage] = useState(1);

  // Estados da Busca
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // Esse é o que vai pra API com atraso

  // Efeito de "Debounce" para não floodar a API
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1); // Sempre que pesquisar algo novo, volta pra página 1
    }, 500); // Espera 500ms depois que parar de digitar

    return () => clearTimeout(delayDebounceFn);
  }, [searchInput]);

  const isLogged = !!localStorage.getItem('token');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PostForm>({
    resolver: zodResolver(postSchema),
  });

  // Buscando os posts com base na página e na busca
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['posts', currentPage, searchTerm],
    queryFn: async () => {
      // Monta a URL base com a página
      let url = `/posts?page=${currentPage}`;
      
      // Se tiver algo na busca, adiciona o &search= na URL
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }

      const response = await api.get(url);
      
      const postsList = (response.data?.posts || []) as Post[];
      
      const sortedPosts = postsList.slice().sort((a,b) => parseInt(String(b.id)) - parseInt(String(a.id)));

      return {
        posts: sortedPosts,
        total: response.data?.total || 0,
        limit: response.data?.limit || 10,
      };
    }
  });

  // Para facilitar o uso lá embaixo
  const posts = data?.posts || [];
  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  const createPostMutation = useMutation({
    mutationFn: async (data: PostForm) => {
      let imageString = "";
      
      if (selectedFile) {
        imageString = await convertToBase64(selectedFile);
      }

      const payload = {
        title: data.title,
        content: data.content,
        image: imageString
      };

      return await api.post('/posts', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      // Se postar com sucesso, volta para a página 1 para ver o post novo
      setCurrentPage(1);
      refetch(); 
      reset(); 
      setSelectedFile(null); 
    },
    onError: (error: any) => {
      console.error("Erro ao postar:", error.response?.data);
      alert("Erro ao postar. Tente novamente.");
    }
  });

  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await api.post(`/posts/${postId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });

  function onSubmit(data: PostForm) {
    if (!isLogged) {
      alert("Você precisa estar logado para criar um post!");
      return;
    }
    createPostMutation.mutate(data);
  }

  function handleLike(postId: string) {
    if (!isLogged) {
      alert("Você precisa estar logado para curtir um post!");
      return;
    }
    likePostMutation.mutate(postId);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      const maxSizeBytes = 5 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        alert("A imagem não pode ultrapassar 5MB.");
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert("O arquivo selecionado não é uma imagem.");
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  }

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error("Erro ao deslogar", error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      window.location.reload(); 
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-4 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        
        <header className="grid grid-cols-3 items-center bg-[#1E293B]/60 p-3 rounded-2xl shadow-lg border border-slate-700 backdrop-blur-sm sticky top-4 z-50">
          <h1 className="text-xl font-extrabold text-white pl-2">Mini Twitter</h1>
          
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 h-5 w-5" />
            <input 
                type="search" 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar por post..." 
                className="w-full bg-[#0F172A] border border-slate-700 rounded-full py-2.5 pl-10 pr-4 text-sm text-gray-300 placeholder:text-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition" 
            />
            </div>

          <div className="flex justify-end gap-2 pr-2">
            {isLogged ? (
              <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 transition p-2" title="Sair">
                <LogOut className="h-6 w-6" />
              </button>
            ) : (
              <>
                <Link to="/register" className="bg-slate-800 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-slate-700 transition">Registrar-se</Link>
                <Link to="/login" className="bg-blue-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-blue-600 transition shadow-lg shadow-blue-500/20">Login</Link>
              </>
            )}
          </div>
        </header>

        {/* Formulário de Nova Postagem */}
        <div className="bg-[#1E293B] p-6 rounded-2xl shadow-xl border border-slate-700">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input 
              {...register('title')} 
              placeholder="Título do post" 
              className="w-full bg-transparent text-xl font-semibold text-white placeholder:text-gray-600 focus:outline-none p-1 border-b border-slate-700 pb-2 focus:border-blue-500 transition"
            />
            {errors.title && <span className="text-red-500 text-sm pl-1">{errors.title.message}</span>}

            <textarea 
              {...register('content')} 
              placeholder="E aí, o que está rolando?" 
              rows={3}
              className="w-full bg-[#0F172A] border border-slate-700 rounded-xl p-4 text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition resize-none"
            />
            {errors.content && <span className="text-red-500 text-sm pl-1">{errors.content.message}</span>}

            {selectedFile && (
              <p className="text-sm text-blue-400 bg-blue-950 p-2 rounded-lg">
                Imagem: {selectedFile.name}
              </p>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-700">
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                className="text-blue-500 hover:bg-blue-950 p-2.5 rounded-xl transition mt-2"
              >
                <Image className="h-6 w-6" />
              </button>
              
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

              <button 
                type="submit" 
                disabled={createPostMutation.isPending}
                className="bg-blue-500 text-white px-8 py-2.5 mt-2 rounded-full font-bold hover:bg-blue-600 transition disabled:opacity-50 shadow-lg shadow-blue-500/20"
              >
                {createPostMutation.isPending ? 'Postando...' : 'Postar'}
              </button>
            </div>
          </form>
        </div>

        {/* TIMELINE */}
        {isLoading && <p className="text-center text-gray-600 font-medium animate-pulse">Carregando timeline...</p>}
        {error && <p className="text-center text-red-500 font-medium">Erro ao carregar os posts.</p>}

        <div className="space-y-5 pb-10">
          {/* AQUI ESTÁ O BLOCO QUE TINHA SUMIDO! */}
          {posts?.map((post) => {
            const finalAuthorName = post.authorName || 'Usuário';
            const authorHandle = finalAuthorName.toLowerCase().replace(/\s+/g, '');

            return (
              <div key={post.id} className="bg-[#1E293B] p-6 rounded-2xl shadow-lg border border-slate-700 hover:border-slate-600 transition">
                <div className="flex items-baseline gap-2 mb-4">
                  <div className="font-bold text-white text-lg">{finalAuthorName}</div>
                  <div className="text-sm text-gray-500">
                    @{authorHandle} • {post.createdAt ? new Date(post.createdAt).toLocaleDateString('pt-BR') : ''}
                  </div>
                </div>

                <h2 className="text-2xl font-extrabold text-white mb-3">{post.title}</h2>
                <p className="text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">{post.content}</p>
                
                {post.image && (
                  <img 
                    src={post.image} 
                    alt="Imagem do post" 
                    className="w-full h-auto rounded-xl my-5 border border-slate-700 object-cover shadow-lg"
                  />
                )}

                <div className="mt-5 flex items-center gap-6">
                  <button 
                      onClick={() => handleLike(String(post.id))} 
                      className="flex items-center gap-2.5 text-gray-500 text-sm font-semibold transition group"
                  >
                    {post.likesCount > 0 ? (
                      <Heart className="h-6 w-6 text-red-500 fill-red-500 transition group-hover:scale-110" />
                    ) : (
                      <Heart className="h-6 w-6 text-gray-600 transition group-hover:text-red-500 group-hover:scale-110" />
                    )}
                    <span className={`${post.likesCount > 0 ? 'text-red-500' : 'group-hover:text-red-500'}`}>
                      {post.likesCount || 0}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
          
          {posts?.length === 0 && (
            <div className="text-center text-gray-600 py-16 bg-[#1E293B] rounded-2xl border border-dashed border-slate-700">
                <p className="text-xl font-bold">Nenhum post encontrado.</p>
            </div>
          )}
        </div>

        {/* CONTROLES DE PAGINAÇÃO */}
        {posts.length > 0 && (
          <div className="flex justify-between items-center bg-[#1E293B] p-4 rounded-2xl border border-slate-700 mt-6 shadow-lg">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="bg-slate-800 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            
            <span className="text-gray-400 font-medium">
              Página {currentPage} de {totalPages || 1}
            </span>

            <button 
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={currentPage >= totalPages}
              className="bg-slate-800 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próxima
            </button>
          </div>
        )}

      </div>
    </div>
  );
}