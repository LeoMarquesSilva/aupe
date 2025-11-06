// ===== INTERFACES EXISTENTES (MANTER TUDO) =====
export interface Client {
  id: string;
  name: string;
  instagram: string;
  logoUrl?: string;
  accessToken?: string;
  userId?: string;
  appId?: string;
  // Campos de timestamp
  createdAt?: string;
  updatedAt?: string;
  // Novos campos para autenticação do Instagram
  instagramAccountId?: string;
  username?: string; // Pode ser redundante com instagram
  profilePicture?: string;
  tokenExpiry?: Date;
  pageId?: string;
  pageName?: string;
}

export interface Post {
  id: string;
  clientId: string;
  caption: string;
  images: PostImage[];
  scheduledDate: string;
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
  createdAt: string;
}

export interface PostImage {
  id: string;
  url: string;
  order: number;
  file?: File; // Adicionando o arquivo original para preview
}

// Interfaces para Stories
export interface Story {
  id: string;
  clientId: string;
  image: StoryImage;
  elements: StoryElement[];
  scheduledDate: string;
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
  createdAt: string;
  duration?: number; // Duração em segundos (padrão do Instagram é 15s)
}

export interface StoryImage {
  id: string;
  url: string;
  file?: File;
  width: number;
  height: number;
  aspectRatio: number; // Geralmente 9:16 para stories
}

// Elementos que podem ser adicionados ao story
export interface StoryElement {
  id: string;
  type: StoryElementType;
  position: Position; // Posição relativa à imagem (0-1)
  size: Size; // Tamanho relativo à imagem (0-1)
  rotation: number; // Rotação em graus
  zIndex: number; // Ordem de empilhamento
  style: StoryElementStyle;
}

export type StoryElementType = 'text' | 'sticker' | 'emoji' | 'mention' | 'link' | 'poll' | 'question' | 'slider';

export interface Position {
  x: number; // 0-1 (percentual da largura)
  y: number; // 0-1 (percentual da altura)
}

export interface Size {
  width: number; // 0-1 (percentual da largura)
  height: number; // 0-1 (percentual da altura)
}

// Estilos específicos para cada tipo de elemento
export interface StoryElementStyle {
  // Estilos comuns
  opacity?: number;
  
  // Estilos para texto
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  backgroundColor?: string;
  padding?: number;
  borderRadius?: number;
  
  // Estilos para stickers/emojis
  imageUrl?: string;
  emoji?: string;
  
  // Estilos para menções
  mentionUsername?: string;
  
  // Estilos para links
  linkUrl?: string;
  linkText?: string;
  
  // Estilos para enquetes
  pollQuestion?: string;
  pollOptions?: string[];
  
  // Estilos para perguntas
  question?: string;
  
  // Estilos para sliders
  sliderQuestion?: string;
  sliderEmoji?: string;
}

// Interface para o histórico de edição (para desfazer/refazer)
export interface StoryEditHistory {
  elements: StoryElement[][];
  currentIndex: number;
}

// Interface para as ferramentas de edição
export interface StoryEditorTool {
  id: string;
  name: string;
  icon: string;
  type: StoryElementType;
}

// ===== NOVAS INTERFACES PARA REELS =====

// Interface principal para Reels
export interface Reel {
  id: string;
  clientId: string;
  video: ReelVideo;
  caption: string;
  scheduledDate: string;
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
  createdAt: string;
  updatedAt: string;
  // Campos específicos do Instagram
  instagramReelId?: string;
  coverImage?: string;
  shareToFeed?: boolean;
}

// Interface para vídeo do Reel
export interface ReelVideo {
  id: string;
  url: string;
  publicUrl: string;
  path: string;
  fileName: string;
  file?: File; // Arquivo original para preview
  size: number;
  duration: number; // Duração em segundos
  width: number;
  height: number;
  aspectRatio: number; // Geralmente 9:16 para reels
  thumbnail?: string; // Thumbnail gerado automaticamente
  format: string; // mp4, mov, etc.
}

// Interface para dados de criação de Reel
export interface ReelData {
  clientId: string;
  video: ReelVideo;
  caption: string;
  scheduledDate: string;
  immediate?: boolean;
  shareToFeed?: boolean;
  coverImage?: string;
}

// Interface para validação de vídeo de Reel
export interface ReelVideoValidation {
  valid: boolean;
  error?: string;
  warnings?: string[];
  suggestions?: string[];
}

// Interface para configurações de Reels
export interface ReelSettings {
  maxDuration: number; // Máximo 90 segundos
  minDuration: number; // Mínimo 3 segundos
  maxFileSize: number; // Máximo 50MB
  allowedFormats: string[];
  recommendedAspectRatio: number; // 9:16
  recommendedResolution: {
    width: number;
    height: number;
  };
}

// ===== INTERFACES PARA O SISTEMA DE AGENDAMENTO =====

// Interface para dados de post (para criar posts)
export interface PostData {
  clientId: string;
  caption: string;
  images: string[];
  scheduledDate: string;
  postType: 'post' | 'carousel' | 'reels' | 'stories';
  immediate?: boolean;
  // Campos específicos para Reels
  video?: string; // URL do vídeo para Reels
  shareToFeed?: boolean; // Para Reels
  coverImage?: string; // Para Reels
}

// Interface para posts agendados (nova tabela)
export interface ScheduledPost {
  id: string;
  clientId: string;
  caption: string;
  images: (string | { url: string })[];  // Tipo mais específico
  scheduledDate: string;
  postType: 'post' | 'carousel' | 'reels' | 'stories';
  status: 'pending' | 'sent_to_n8n' | 'processing' | 'posted' | 'failed' | 'cancelled';
  immediate?: boolean;
  userId: string;
  
  // Campos específicos para Reels
  video?: string; // URL do vídeo
  shareToFeed?: boolean;
  coverImage?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  postedAt?: string;
  
  // Campos de controle N8N
  n8nJobId?: string;
  instagramPostId?: string;
  errorMessage?: string;
  retryCount: number;
  lastRetryAt?: string;
  n8nResponse?: any;
  
  // Relacionamento
  clients?: Client;
}

// Interface para usuário (se não existir)
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// ===== CONSTANTES PARA O NOVO SISTEMA =====
export const POST_TYPES = {
  POST: 'post',
  CAROUSEL: 'carousel', 
  REELS: 'reels',
  STORIES: 'stories'
} as const;

export const POST_STATUS = {
  PENDING: 'pending',
  SENT_TO_N8N: 'sent_to_n8n',
  PROCESSING: 'processing',
  POSTED: 'posted',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

// Constantes específicas para Reels
export const REEL_SETTINGS: ReelSettings = {
  maxDuration: 90, // 90 segundos
  minDuration: 3,  // 3 segundos
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedFormats: ['video/mp4', 'video/mov', 'video/quicktime', 'video/webm'],
  recommendedAspectRatio: 9/16,
  recommendedResolution: {
    width: 1080,
    height: 1920
  }
};

// ===== TYPES AUXILIARES =====
export type PostType = typeof POST_TYPES[keyof typeof POST_TYPES];
export type PostStatus = typeof POST_STATUS[keyof typeof POST_STATUS];