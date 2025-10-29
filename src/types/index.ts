// No arquivo types.ts ou onde estiver definida a interface Client
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