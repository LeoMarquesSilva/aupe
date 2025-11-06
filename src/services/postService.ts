import { Client, PostImage, PostData, ScheduledPost, PostStatus } from '../types';
import { supabaseStorageService, UploadResult } from './supabaseStorageService';
import { supabaseVideoStorageService, VideoUploadResult } from './supabaseVideoStorageService';
import { postService } from './supabaseClient';
import { authService } from './supabaseClient';

// ✅ FUNÇÃO PRINCIPAL: Upload de imagens para Supabase Storage
export const uploadImagesToSupabaseStorage = async (images: PostImage[]): Promise<string[]> => {
  console.log(`🚀 Iniciando upload de ${images.length} imagens para Supabase Storage`);
  
  try {
    // Obter usuário atual
    const user = await authService.getCurrentUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const results: string[] = [];
    const errors: Error[] = [];
    
    // Processar as imagens uma por uma (sequencialmente)
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      try {
        console.log(`📤 Processando imagem ${i + 1}/${images.length} (ID: ${image.id})`);
        
        let uploadResult: UploadResult;
        
        // Se a imagem já é uma URL do Supabase, pular
        if (typeof image.url === 'string' && image.url.includes('supabase.co/storage')) {
          console.log(`✅ Imagem ${i + 1} já está no Supabase Storage:`, image.url);
          results.push(image.url);
          continue;
        }
        
        // Preferir o arquivo original, se disponível
        if (image.file) {
          console.log(`📁 Enviando arquivo original da imagem ${i + 1}`);
          uploadResult = await supabaseStorageService.uploadImage(image.file, user.id);
        } else {
          // Caso contrário, usar a URL (que pode ser uma data URL)
          console.log(`🔗 Enviando URL da imagem ${i + 1}`);
          uploadResult = await supabaseStorageService.uploadImageFromUrl(
            image.url, 
            user.id, 
            `image-${i + 1}.jpg`
          );
        }
        
        console.log(`✅ Upload da imagem ${i + 1} concluído:`, uploadResult.url);
        results.push(uploadResult.url);
        
      } catch (error) {
        console.error(`❌ Erro ao processar imagem ${i + 1} (ID: ${image.id}):`, error);
        errors.push(error as Error);
      }
    }
    
    // Se não conseguimos fazer upload de nenhuma imagem, lançar erro
    if (results.length === 0 && errors.length > 0) {
      throw new Error(`Falha ao fazer upload das imagens: ${errors[0].message}`);
    }
    
    // Retornar as URLs das imagens que conseguimos fazer upload
    console.log(`🎉 Upload concluído. ${results.length}/${images.length} imagens processadas com sucesso`);
    return results;
    
  } catch (error) {
    console.error('💥 Erro fatal no upload para Supabase Storage:', error);
    throw error;
  }
};

// 🎯 FUNÇÃO PRINCIPAL: Agendar post (agora com Supabase Storage)
export const scheduleInstagramPost = async (
  postData: PostData, 
  client: Client
): Promise<{ supabasePost: ScheduledPost; message: string }> => {
  try {
    console.log('=== INICIANDO AGENDAMENTO - VERSÃO SUPABASE STORAGE ===');
    console.log('1. Dados recebidos:', postData);
    console.log('2. Cliente:', { id: client.id, name: client.name, instagram: client.instagram });
    
    // ✅ VALIDAÇÃO: Verificar credenciais do cliente
    if (!client.instagramAccountId || !client.accessToken) {
      throw new Error('Cliente não possui credenciais do Instagram configuradas. Conecte a conta do Instagram primeiro.');
    }

    // ✅ UPLOAD DE IMAGENS PARA SUPABASE STORAGE
    let processedImages: string[] = [];
    let processedCoverImage: string | undefined;

    if (postData.images && postData.images.length > 0) {
      console.log('=== FAZENDO UPLOAD DAS IMAGENS PARA SUPABASE STORAGE ===');
      
      // ✅ VERIFICAÇÃO MAIS ROBUSTA: Verificar se é PostImage ou string
      const firstItem = postData.images[0];
      
      if (typeof firstItem === 'string') {
        // Se são strings (URLs), usar diretamente
        console.log('✅ Imagens já são URLs, usando diretamente:', postData.images);
        processedImages = postData.images as string[];
      } else if (firstItem && typeof firstItem === 'object' && 'id' in firstItem) {
        // Se são objetos PostImage (verificando se tem propriedade 'id')
        console.log('✅ Imagens são objetos PostImage, fazendo upload...');
        const imageObjects = (postData.images as unknown) as PostImage[];
        processedImages = await uploadImagesToSupabaseStorage(imageObjects);
        console.log('✅ Imagens processadas:', processedImages);
      } else {
        throw new Error('Formato de imagens não reconhecido');
      }
    }

   // ✅ NOVO: UPLOAD DA CAPA DO REEL (se existir)
    if (postData.coverImage) {
      console.log('=== FAZENDO UPLOAD DA CAPA DO REEL PARA SUPABASE STORAGE ===');
      
      // Criar um PostImage temporário para a capa
      const coverImageData: PostImage = {
        id: `cover-${Date.now()}`,
        url: postData.coverImage,
        file: undefined, // Assumindo que é uma URL (pode ser ajustado se for File)
        order: 0 // ✅ ADICIONADO: Propriedade order obrigatória
      };

      try {
        const coverImageUrls = await uploadImagesToSupabaseStorage([coverImageData]);
        processedCoverImage = coverImageUrls[0];
        console.log('✅ Capa do Reel processada:', processedCoverImage);
      } catch (error) {
        console.warn('⚠️ Erro ao processar capa do Reel, usando original:', error);
        processedCoverImage = postData.coverImage; // Fallback para URL original
      }
    }

    // ✅ SALVAR NO SUPABASE (Webhook automático irá disparar)
    console.log('=== SALVANDO NO SUPABASE (Webhook automático irá disparar) ===');
    const savedPost = await postService.saveScheduledPost({
      clientId: postData.clientId,
      caption: postData.caption,
      images: processedImages, // URLs já processadas do Supabase Storage
      scheduledDate: postData.scheduledDate,
      postType: postData.postType || 'post',
      immediate: postData.immediate || false,
      status: 'pending', // ✅ Webhook do Supabase detecta isso automaticamente
      // ✅ CAMPOS ESPECÍFICOS PARA REELS
      video: postData.video, // Para Reels
      shareToFeed: postData.shareToFeed, // Para Reels
      coverImage: processedCoverImage // ✅ NOVO: URL processada da capa
    });
    
    console.log('✅ Post salvo no Supabase:', savedPost);
    console.log('🚀 Webhook do Supabase irá disparar automaticamente para N8N');
    
    // ✅ DETERMINAR MENSAGEM DE SUCESSO
    const now = new Date();
    const scheduledDate = new Date(postData.scheduledDate);
    const isImmediate = postData.immediate || scheduledDate <= now;
    
    let message: string;
    if (postData.postType === 'reels') {
      message = isImmediate 
        ? 'Reel salvo! O sistema irá processar imediatamente.' 
        : `Reel agendado com sucesso para ${scheduledDate.toLocaleString('pt-BR')}! Será processado automaticamente na data/hora correta.`;
    } else {
      message = isImmediate 
        ? 'Post salvo! O sistema irá processar imediatamente.' 
        : `Post agendado com sucesso para ${scheduledDate.toLocaleString('pt-BR')}! Será processado automaticamente na data/hora correta.`;
    }
    
    console.log('✅ AGENDAMENTO CONCLUÍDO');
    
    return {
      supabasePost: savedPost,
      message
    };
    
  } catch (error: any) {
    console.error('❌ ERRO NO AGENDAMENTO:', error);
    throw error;
  }
};

// 🔄 FUNÇÃO: Reprocessar posts falhados
export const retryFailedPost = async (postId: string): Promise<any> => {
  try {
    console.log(`=== REPROCESSANDO POST ${postId} ===`);
    
    // ✅ MARCAR COMO RETRY NO SUPABASE (webhook irá disparar novamente)
    await postService.retryFailedPost(postId);
    
    console.log('✅ Post marcado para retry - Webhook irá reprocessar automaticamente');
    
    return {
      message: 'Post marcado para reprocessamento. O sistema irá tentar novamente automaticamente.'
    };
    
  } catch (error) {
    console.error('Erro ao reprocessar post:', error);
    throw error;
  }
};

// 📊 FUNÇÃO: Buscar posts agendados
export const getScheduledPosts = async (clientId?: string): Promise<ScheduledPost[]> => {
  try {
    if (clientId) {
      return await postService.getScheduledPostsByClient(clientId);
    }
    return await postService.getScheduledPostsWithClient();
  } catch (error) {
    console.error('Erro ao buscar posts agendados:', error);
    throw error;
  }
};

// ❌ FUNÇÃO: Cancelar post agendado
export const cancelScheduledPost = async (postId: string): Promise<void> => {
  try {
    await postService.updatePostStatus(postId, 'cancelled' as PostStatus, {
      errorMessage: 'Cancelado pelo usuário'
    });
  } catch (error) {
    console.error('Erro ao cancelar post:', error);
    throw error;
  }
};

// 🔄 FUNÇÃO: Atualizar status do post (para uso do N8N via webhook de retorno)
export const updatePostStatus = async (
  postId: string, 
  status: PostStatus,
  metadata?: any
): Promise<ScheduledPost> => {
  try {
    return await postService.updatePostStatus(postId, status, metadata);
  } catch (error) {
    console.error('Erro ao atualizar status do post:', error);
    throw error;
  }
};

// 📈 FUNÇÃO: Buscar estatísticas dos posts
export const getPostStats = async (clientId?: string): Promise<any> => {
  try {
    const posts = clientId 
      ? await postService.getScheduledPostsByClient(clientId)
      : await postService.getScheduledPostsWithClient();
    
    const stats = {
      total: posts.length,
      pending: posts.filter(p => p.status === 'pending').length,
      sent_to_n8n: posts.filter(p => p.status === 'sent_to_n8n').length,
      processing: posts.filter(p => p.status === 'processing').length,
      posted: posts.filter(p => p.status === 'posted').length,
      failed: posts.filter(p => p.status === 'failed').length,
      cancelled: posts.filter(p => p.status === 'cancelled').length,
    };
    
    return stats;
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    throw error;
  }
};

// 🔍 FUNÇÃO: Buscar posts por status
export const getPostsByStatus = async (status: PostStatus): Promise<ScheduledPost[]> => {
  try {
    return await postService.getPostsByStatus(status);
  } catch (error) {
    console.error('Erro ao buscar posts por status:', error);
    throw error;
  }
};

// Função auxiliar para extrair URL de string ou objeto
const extractUrlFromImageData = (imageData: string | { url: string }): string => {
  if (typeof imageData === 'string') {
    return imageData;
  }
  if (typeof imageData === 'object' && imageData.url) {
    return imageData.url;
  }
  throw new Error('Formato de imagem inválido');
};

// 🧹 FUNÇÃO: Limpar posts antigos
export const cleanupOldPosts = async (daysOld: number = 30): Promise<number> => {
  try {
    const posts = await postService.getScheduledPostsWithClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    let cleanedCount = 0;
    
    for (const post of posts) {
      const postDate = new Date(post.scheduledDate);
      const isOld = postDate < cutoffDate;
      const isCompleted = ['posted', 'failed', 'cancelled'].includes(post.status);
      
      if (isOld && isCompleted) {
        // ✅ NOVO: Deletar imagens/vídeos do storage antes de deletar o post
        if (post.images && post.images.length > 0) {
          try {
            const mediaPaths = post.images
              .map(imageData => {
                try {
                  const url = extractUrlFromImageData(imageData);
                  if (url.includes('supabase.co/storage')) {
                    // Extrair o caminho da URL do Supabase Storage
                    if (url.includes('/post-images/')) {
                      const match = url.match(/\/storage\/v1\/object\/public\/post-images\/(.+)$/);
                      return { type: 'image', path: match ? match[1] : null };
                    } else if (url.includes('/reels-videos/')) {
                      const match = url.match(/\/storage\/v1\/object\/public\/reels-videos\/(.+)$/);
                      return { type: 'video', path: match ? match[1] : null };
                    }
                  }
                  return null;
                } catch (error) {
                  console.warn('Erro ao processar URL da imagem:', error);
                  return null;
                }
              })
              .filter(Boolean) as { type: string; path: string }[];
            
            // Separar imagens e vídeos
            const imagePaths = mediaPaths.filter(m => m.type === 'image').map(m => m.path);
            const videoPaths = mediaPaths.filter(m => m.type === 'video').map(m => m.path);
            
            // Deletar imagens
            if (imagePaths.length > 0) {
              await supabaseStorageService.deleteMultipleImages(imagePaths);
              console.log(`🗑️ Deletadas ${imagePaths.length} imagens do post ${post.id}`);
            }
            
            // Deletar vídeos
            if (videoPaths.length > 0) {
              await supabaseVideoStorageService.deleteMultipleVideos(videoPaths);
              console.log(`🗑️ Deletados ${videoPaths.length} vídeos do post ${post.id}`);
            }
          } catch (error) {
            console.error(`Erro ao deletar mídia do post ${post.id}:`, error);
          }
        }
        
        await postService.deleteScheduledPost(post.id);
        cleanedCount++;
      }
    }
    
    console.log(`Limpeza concluída: ${cleanedCount} posts antigos removidos`);
    return cleanedCount;
  } catch (error) {
    console.error('Erro na limpeza de posts antigos:', error);
    throw error;
  }
};

// 🎯 FUNÇÃO: Verificar posts pendentes que deveriam ter sido processados
export const checkStuckPosts = async (): Promise<ScheduledPost[]> => {
  try {
    const posts = await postService.getPostsByStatus('pending');
    const now = new Date();
    
    // Posts que deveriam ter sido processados (mais de 5 minutos de atraso)
    const stuckPosts = posts.filter(post => {
      const scheduledDate = new Date(post.scheduledDate);
      const minutesLate = (now.getTime() - scheduledDate.getTime()) / (1000 * 60);
      return minutesLate > 5;
    });
    
    console.log(`Encontrados ${stuckPosts.length} posts atrasados`);
    return stuckPosts;
  } catch (error) {
    console.error('Erro ao verificar posts atrasados:', error);
    throw error;
  }
};

// 🆕 FUNÇÃO: Migrar imagens do ImgBB para Supabase Storage
export const migrateImagesFromImgBBToSupabase = async (): Promise<void> => {
  try {
    console.log('🔄 Iniciando migração de imagens do ImgBB para Supabase Storage...');
    
    const user = await authService.getCurrentUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }
    
    // Buscar todos os posts que têm imagens do ImgBB
    const posts = await postService.getScheduledPostsWithClient();
    const postsWithImgBB = posts.filter(post => 
      post.images && post.images.some(imageData => {
        try {
          const url = extractUrlFromImageData(imageData);
          return url.includes('i.ibb.co') || url.includes('image.ibb.co');
        } catch (error) {
          return false;
        }
      })
    );
    
    console.log(`📊 Encontrados ${postsWithImgBB.length} posts com imagens do ImgBB`);
    
    for (const post of postsWithImgBB) {
      try {
        console.log(`🔄 Migrando post ${post.id}...`);
        
        const newImageUrls: string[] = [];
        
        for (const imageData of post.images) {
          try {
            const imageUrl = extractUrlFromImageData(imageData);
            
            if (imageUrl.includes('i.ibb.co') || imageUrl.includes('image.ibb.co')) {
              // Migrar esta imagem
              const uploadResult = await supabaseStorageService.uploadImageFromUrl(
                imageUrl, 
                user.id, 
                `migrated-${Date.now()}.jpg`
              );
              newImageUrls.push(uploadResult.url);
              console.log(`✅ Imagem migrada: ${imageUrl} -> ${uploadResult.url}`);
            } else {
              // Manter URL existente
              newImageUrls.push(imageUrl);
            }
          } catch (error) {
            console.warn('Erro ao processar imagem individual:', error);
            // Em caso de erro, manter a imagem original
            try {
              const originalUrl = extractUrlFromImageData(imageData);
              newImageUrls.push(originalUrl);
            } catch (e) {
              console.error('Erro ao extrair URL original:', e);
            }
          }
        }
        
        // Atualizar post com novas URLs
        await postService.updateScheduledPost(post.id, {
          images: newImageUrls
        });
        
        console.log(`✅ Post ${post.id} migrado com sucesso`);
        
      } catch (error) {
        console.error(`❌ Erro ao migrar post ${post.id}:`, error);
      }
    }
    
    console.log('🎉 Migração concluída!');
    
  } catch (error) {
    console.error('💥 Erro na migração:', error);
    throw error;
  }
};