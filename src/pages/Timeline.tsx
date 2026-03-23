import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../services/api';
import { useState, useRef, useEffect } from 'react';
import { Search, Image as ImageIcon, Heart, LogOut, Pencil, Trash2, Loader2 } from 'lucide-react';

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
  const observerTarget = useRef<HTMLDivElement>(null); // Referência para o final da página
  
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [editingPostId, setEditingPostId] = useState<string | number | null>(null);
  const [oldImage, setOldImage] = useState<string | null>(null);

  const isLogged = !!localStorage.getItem('token');
  const loggedUserId = Number(localStorage.getItem('userId'));

  const { register, handleSubmit, reset, formState: { errors, isSubmitting }, setValue } = useForm<PostForm>({
    resolver: zodResolver(postSchema),
  });

  // Debounce da pesquisa
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 500); 

    return () => clearTimeout(delayDebounceFn);
  }, [searchInput]);

  // SCROLL INFINITO: Trocamos o useQuery pelo useInfiniteQuery
  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteQuery({
    queryKey: ['posts', searchTerm],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      let url = `/posts?page=${pageParam}`;
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
    },
    getNextPageParam: (lastPage, allPages) => {
      const maxPages = Math.ceil(lastPage.total / lastPage.limit);
      const nextPage = allPages.length + 1;
      return nextPage <= maxPages ? nextPage : undefined;
    }
  });

  // Junta todas as páginas carregadas em uma lista única
  const posts = data?.pages.flatMap(page => page.posts) || [];

  // Observador para verificar se o usuário chegou no final da tela
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage, isFetchingNextPage]);

  // Mutações...
  const createPostMutation = useMutation({
    mutationFn: async (payload: any) => await api.post('/posts', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      cancelEdit();
    }
  });

  const updatePostMutation = useMutation({
    mutationFn: async (data: { id: string | number; payload: any }) => await api.put(`/posts/${data.id}`, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      cancelEdit();
    }
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string | number) => await api.delete(`/posts/${postId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] })
  });

  const likePostMutation = useMutation({
    mutationFn: async (postId: string | number) => await api.post(`/posts/${postId}/like`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] })
  });

  async function onSubmit(data: PostForm) {
    if (!isLogged) return alert("Logue primeiro!");

    let imageString = oldImage || ""; 
    if (selectedFile) imageString = await convertToBase64(selectedFile);

    const payload = { title: data.title, content: data.content, image: imageString };

    if (editingPostId) {
      updatePostMutation.mutate({ id: editingPostId, payload });
    } else {
      createPostMutation.mutate(payload);
    }
  }

  function handleEditClick(post: Post) {
    setEditingPostId(post.id);
    setValue('title', post.title);
    setValue('content', post.content);
    setOldImage(post.image || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingPostId(null);
    setOldImage(null);
    setSelectedFile(null);
    reset(); 
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleDeleteClick(postId: string | number) {
    if (window.confirm("Apagar publicação?")) deletePostMutation.mutate(postId);
  }

  function handleLogout() {
    localStorage.clear();
    window.location.reload(); 
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white font-sans flex flex-col">
      
      {/* HEADER FULL WIDTH */}
      <header className="sticky top-0 z-50 bg-[#0F172A] border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="w-1/4">
          <h1 className="text-xl font-normal text-white">Mini Twitter</h1>
        </div>
        
        <div className="flex-1 flex justify-center px-4">
          <div className="w-full max-w-3xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
            <input 
              type="search" 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por post..." 
              className="w-full bg-[#1E293B] border border-slate-700/50 rounded-lg py-2.5 pl-10 pr-4 text-sm text-gray-300 focus:border-blue-500 focus:outline-none transition shadow-sm" 
            />
          </div>
        </div>

        <div className="w-1/4 flex justify-end">
          <button onClick={handleLogout} className="text-gray-400 hover:text-white bg-[#1E293B] hover:bg-slate-700 p-2.5 rounded-full border border-slate-700/50 transition">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto p-4 space-y-6 mt-6">
        
        {/* CARD DE POSTAGEM */}
        <div className={`bg-[#1E293B] border rounded-2xl p-6 shadow-xl transition-all ${editingPostId ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-800'}`}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <input 
              {...register('title')}
              placeholder="Título do post"
              className="w-full bg-transparent text-lg font-bold text-white placeholder:text-gray-600 focus:outline-none mb-2"
            />
            {errors.title && <p className="text-red-500 text-xs mb-2">{errors.title.message}</p>}
            
            <div className="border-t border-slate-700/50 my-4"></div>

            <textarea 
              {...register('content')}
              placeholder="E aí, o que está rolando?"
              rows={3}
              className="w-full bg-transparent text-gray-300 placeholder:text-gray-500 focus:outline-none resize-none text-lg"
            />
            {errors.content && <p className="text-red-500 text-xs mb-2">{errors.content.message}</p>}

            {(selectedFile || oldImage) && (
              <p className="text-xs text-blue-400 mt-2 bg-blue-950/30 p-2 rounded">
                📎 {selectedFile ? selectedFile.name : 'Imagem original selecionada'}
              </p>
            )}

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/50">
              <div className="flex gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-blue-500 hover:bg-blue-500/10 p-2 rounded-lg transition">
                  <ImageIcon className="h-6 w-6" />
                </button>
                <input type="file" ref={fileInputRef} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="hidden" accept="image/*" />
                
                {editingPostId && (
                  <button type="button" onClick={cancelEdit} className="text-gray-400 text-sm font-semibold hover:text-white px-4">Cancelar</button>
                )}
              </div>
              
              <button 
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 px-8 rounded-full shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
              >
                {editingPostId ? 'Salvar' : 'Postar'}
              </button>
            </div>
          </form>
        </div>

        {/* LISTA DE POSTS */}
        <div className="space-y-5 pb-6">
          {isLoading ? <p className="text-center animate-pulse text-gray-500">Carregando...</p> : 
            posts.map((post) => {
              const isMyPost = String(post.authorId) === String(loggedUserId);
              return (
                <div key={post.id} className="bg-[#1E293B] p-6 rounded-2xl border border-slate-800 relative group hover:border-slate-700 transition shadow-sm">
                  {isMyPost && (
                    <div className="absolute top-6 right-6 flex gap-3">
                      <button onClick={() => handleEditClick(post)} className="text-gray-500 hover:text-blue-400"><Pencil className="h-5 w-5"/></button>
                      <button onClick={() => handleDeleteClick(post.id)} className="text-gray-500 hover:text-red-500"><Trash2 className="h-5 w-5"/></button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-white">{post.authorName || 'Usuário'}</span>
                    <span className="text-gray-500 text-sm">@{ (post.authorName || 'user').toLowerCase().replace(/\s/g, '') }</span>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">{post.title}</h2>
                  <p className="text-gray-300 leading-relaxed mb-4">{post.content}</p>
                  {post.image && <img src={post.image} className="rounded-xl border border-slate-700 w-full mb-4 max-h-96 object-cover" />}
                  <button onClick={() => likePostMutation.mutate(post.id)} className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition mt-2">
                    <Heart className={`h-5 w-5 ${post.likesCount > 0 ? 'fill-red-500 text-red-500' : ''}`} />
                    <span>{post.likesCount || 0}</span>
                  </button>
                </div>
              )
            })
          }
        </div>

        {/* GATILHO DO SCROLL INFINITO (Invisível, mas ativa a próxima página) */}
        <div ref={observerTarget} className="h-10 w-full flex justify-center pb-10">
          {isFetchingNextPage && <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />}
          {!hasNextPage && posts.length > 0 && <p className="text-slate-500 text-sm">Você chegou ao fim dos posts!</p>}
        </div>

      </main>

      {/* FOOTER */}
      <footer className="bg-[#1E293B] border-t border-slate-800 px-6 py-5 mt-auto shadow-inner">
        <h1 className="text-lg font-normal text-white">Mini Twitter</h1>
      </footer>

    </div>
  );
}