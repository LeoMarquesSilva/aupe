import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import Stories from 'react-insta-stories';
import { Story, StoryElement, Position, Size } from '../types';
import { imageUrlService } from '../services/imageUrlService';

interface StoryPreviewProps {
  story: Story;
  isEditing?: boolean;
  onElementSelect?: (element: StoryElement) => void;
  selectedElementId?: string;
  onElementUpdate?: (element: StoryElement) => void;
}

// Interface para os props da função content do react-insta-stories
interface StoryContentProps {
  story: any;
  action: string;
  isPaused: boolean;
  config: any;
}

// Tipo para as histórias do react-insta-stories
type InstaStory = {
  url?: string;
  duration?: number;
  header?: {
    heading: string;
    subheading: string;
    profileImage: string;
  };
  seeMore?: Function;
  content?: (props: StoryContentProps) => React.ReactElement;
};

const StoryPreview: React.FC<StoryPreviewProps> = ({ 
  story, 
  isEditing = false,
  onElementSelect,
  selectedElementId,
  onElementUpdate
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  // Estado para rastrear o elemento sendo arrastado
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    element: StoryElement | null;
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
  }>({
    isDragging: false,
    element: null,
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0
  });
  
  // Estado para rastrear o elemento sendo redimensionado
  const [resizeState, setResizeState] = useState<{
    isResizing: boolean;
    element: StoryElement | null;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  }>({
    isResizing: false,
    element: null,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0
  });

  // CORRIGIDO: Processar a URL da imagem do story corretamente
  const getStoryImageUrl = () => {
    // Se a URL já é uma data URL (base64), usar diretamente
    if (story.image.url.startsWith('data:')) {
      return story.image.url;
    }
    // Caso contrário, usar o imageUrlService
    return imageUrlService.getPublicUrl(story.image.url);
  };
  
  const storyImageUrl = getStoryImageUrl();
  
  // Efeito para calcular o tamanho do container
  useEffect(() => {
    if (containerRef.current) {
      const updateSize = () => {
        const container = containerRef.current;
        if (container) {
          setContainerSize({
            width: container.clientWidth,
            height: container.clientHeight
          });
        }
      };
      
      updateSize();
      window.addEventListener('resize', updateSize);
      
      return () => {
        window.removeEventListener('resize', updateSize);
      };
    }
  }, []);
  
  // Efeito para lidar com eventos de mouse para arrastar e redimensionar
  useEffect(() => {
    if (!isEditing) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      // Lidar com arrasto
      if (dragState.isDragging && dragState.element) {
        const deltaX = e.clientX - dragState.startX;
        const deltaY = e.clientY - dragState.startY;
        
        const newX = Math.max(0, Math.min(containerSize.width - 10, dragState.startPosX + deltaX));
        const newY = Math.max(0, Math.min(containerSize.height - 10, dragState.startPosY + deltaY));
        
        const newPosition = getRelativePosition(newX, newY);
        
        if (onElementUpdate) {
          onElementUpdate({
            ...dragState.element,
            position: newPosition
          });
        }
      }
      
      // Lidar com redimensionamento
      if (resizeState.isResizing && resizeState.element) {
        const deltaX = e.clientX - resizeState.startX;
        const deltaY = e.clientY - resizeState.startY;
        
        const newWidth = Math.max(20, resizeState.startWidth + deltaX);
        const newHeight = Math.max(20, resizeState.startHeight + deltaY);
        
        const newSize = getRelativeSize(newWidth, newHeight);
        
        if (onElementUpdate) {
          onElementUpdate({
            ...resizeState.element,
            size: newSize
          });
        }
      }
    };
    
    const handleMouseUp = () => {
      setDragState(prev => ({ ...prev, isDragging: false, element: null }));
      setResizeState(prev => ({ ...prev, isResizing: false, element: null }));
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, resizeState, containerSize, onElementUpdate, isEditing]);
  
  // Função para converter posição relativa (0-1) para pixels
  const getPixelPosition = (position: Position): { x: number, y: number } => {
    return {
      x: position.x * containerSize.width,
      y: position.y * containerSize.height
    };
  };
  
  // Função para converter tamanho relativo (0-1) para pixels
  const getPixelSize = (size: Size): { width: number, height: number } => {
    return {
      width: size.width * containerSize.width,
      height: size.height * containerSize.height
    };
  };
  
  // Função para converter pixels para posição relativa (0-1)
  const getRelativePosition = (x: number, y: number): Position => {
    return {
      x: x / containerSize.width,
      y: y / containerSize.height
    };
  };
  
  // Função para converter pixels para tamanho relativo (0-1)
  const getRelativeSize = (width: number, height: number): Size => {
    return {
      width: width / containerSize.width,
      height: height / containerSize.height
    };
  };
  
  // Iniciar arrasto de elemento
  const handleDragStart = (element: StoryElement, e: React.MouseEvent) => {
    if (!isEditing) return;
    
    const pixelPosition = getPixelPosition(element.position);
    
    setDragState({
      isDragging: true,
      element,
      startX: e.clientX,
      startY: e.clientY,
      startPosX: pixelPosition.x,
      startPosY: pixelPosition.y
    });
    
    // Selecionar o elemento ao começar a arrastar
    if (onElementSelect) {
      onElementSelect(element);
    }
    
    e.stopPropagation();
  };
  
  // Iniciar redimensionamento de elemento
  const handleResizeStart = (element: StoryElement, e: React.MouseEvent) => {
    if (!isEditing) return;
    
    const pixelSize = getPixelSize(element.size);
    
    setResizeState({
      isResizing: true,
      element,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: pixelSize.width,
      startHeight: pixelSize.height
    });
    
    e.stopPropagation();
  };
  
  // Renderizar um elemento do story
  const renderElement = (element: StoryElement) => {
    const pixelPosition = getPixelPosition(element.position);
    const pixelSize = getPixelSize(element.size);
    
    // Estilos comuns para todos os elementos
    const commonStyle: React.CSSProperties = {
      position: 'absolute',
      left: pixelPosition.x,
      top: pixelPosition.y,
      width: pixelSize.width,
      height: pixelSize.height,
      opacity: element.style.opacity || 1,
      transform: `rotate(${element.rotation}deg)`,
      zIndex: element.zIndex,
      cursor: isEditing ? 'move' : 'default',
      border: selectedElementId === element.id ? '2px dashed #E1306C' : 'none',
      boxSizing: 'border-box'
    };
    
    // Conteúdo específico para cada tipo de elemento
    let content;
    
    switch (element.type) {
      case 'text':
        content = (
          <Typography 
            style={{
              fontFamily: element.style.fontFamily,
              fontSize: element.style.fontSize,
              fontWeight: element.style.fontWeight,
              fontStyle: element.style.fontStyle,
              textAlign: element.style.textAlign as any,
              color: element.style.color,
              backgroundColor: element.style.backgroundColor,
              padding: element.style.padding,
              borderRadius: element.style.borderRadius,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: element.style.textAlign === 'left' ? 'flex-start' : 
                             element.style.textAlign === 'right' ? 'flex-end' : 'center',
              overflow: 'hidden',
              wordBreak: 'break-word'
            }}
          >
            {element.style.text}
          </Typography>
        );
        break;
        
      case 'emoji':
        content = (
          <Box 
            style={{
              fontSize: Math.min(pixelSize.width, pixelSize.height) * 0.8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%'
            }}
          >
            {element.style.emoji}
          </Box>
        );
        break;
        
      case 'poll':
        content = (
          <Box 
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: 8,
              padding: 10,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Typography 
              style={{ 
                fontWeight: 'bold', 
                marginBottom: 8,
                fontSize: 16
              }}
            >
              {element.style.pollQuestion}
            </Typography>
            {element.style.pollOptions?.map((option, index) => (
              <Box 
                key={index}
                style={{
                  backgroundColor: '#f0f0f0',
                  borderRadius: 4,
                  padding: '6px 10px',
                  marginBottom: 4,
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
              >
                <Typography>{option}</Typography>
                <Typography>0%</Typography>
              </Box>
            ))}
          </Box>
        );
        break;
        
      case 'question':
        content = (
          <Box 
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: 8,
              padding: 10,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Typography 
              style={{ 
                fontWeight: 'bold', 
                marginBottom: 8,
                fontSize: 16
              }}
            >
              {element.style.question}
            </Typography>
            <Box 
              style={{
                backgroundColor: '#f0f0f0',
                borderRadius: 4,
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Typography style={{ color: '#888' }}>Digite sua resposta...</Typography>
            </Box>
          </Box>
        );
        break;
        
      case 'slider':
        content = (
          <Box 
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: 8,
              padding: 10,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Typography 
              style={{ 
                fontWeight: 'bold', 
                marginBottom: 8,
                fontSize: 16
              }}
            >
              {element.style.sliderQuestion}
            </Typography>
            <Box 
              style={{
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Box 
                style={{
                  flex: 1,
                  height: 4,
                  backgroundColor: '#ddd',
                  borderRadius: 2,
                  position: 'relative'
                }}
              >
                <Box 
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: -6,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: '#E1306C',
                    transform: 'translateX(-50%)'
                  }}
                />
              </Box>
              <Typography style={{ marginLeft: 8 }}>{element.style.sliderEmoji}</Typography>
            </Box>
          </Box>
        );
        break;
        
      default:
        content = null;
    }
    
    if (isEditing) {
      return (
        <Box
          key={element.id}
          style={commonStyle}
          onMouseDown={(e) => handleDragStart(element, e)}
          onClick={(e) => {
            e.stopPropagation();
            onElementSelect && onElementSelect(element);
          }}
        >
          {content}
          
          {/* Alça de redimensionamento no canto inferior direito */}
          <Box
            style={{
              position: 'absolute',
              right: -5,
              bottom: -5,
              width: 10,
              height: 10,
              backgroundColor: selectedElementId === element.id ? '#E1306C' : 'transparent',
              cursor: 'se-resize',
              borderRadius: '50%',
              zIndex: 10
            }}
            onMouseDown={(e) => handleResizeStart(element, e)}
          />
        </Box>
      );
    } else {
      return (
        <Box
          key={element.id}
          style={commonStyle}
        >
          {content}
        </Box>
      );
    }
  };

  // Se estamos no modo de edição, usamos nossa implementação personalizada
  if (isEditing) {
    return (
      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 2,
          bgcolor: '#000',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        {/* Imagem de fundo - CORRIGIDO: Melhor tratamento de erro */}
        <Box
          component="img"
          src={storyImageUrl}
          alt="Story Background"
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center'
          }}
          onError={(e) => {
            console.error('Erro ao carregar imagem do story:', storyImageUrl);
            // Fallback para imagem de placeholder em caso de erro
            const target = e.target as HTMLImageElement;
            target.src = imageUrlService.getPlaceholder(400, 600, 'Erro na imagem');
          }}
          onLoad={() => {
            console.log('Imagem carregada com sucesso:', storyImageUrl);
          }}
        />
        
        {/* Elementos do story */}
        {containerSize.width > 0 && story.elements.map(renderElement)}
      </Box>
    );
  }
  
  // Se estamos no modo de visualização, usamos a biblioteca react-insta-stories
  const storyContent = [
    {
      url: storyImageUrl,
      duration: story.duration || 15,
      header: {
        heading: 'username',
        subheading: '2h',
        profileImage: 'https://via.placeholder.com/40'
      },
      seeMore: () => {
        return <div>Ver mais</div>;
      },
      content: (props: StoryContentProps) => {
        return (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <img 
              src={storyImageUrl} 
              alt="Story" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain' 
              }}
              onError={(e) => {
                console.error('Erro ao carregar imagem do story:', storyImageUrl);
                const target = e.target as HTMLImageElement;
                target.src = imageUrlService.getPlaceholder(400, 600, 'Erro na imagem');
              }}
            />
            {story.elements.map(renderElement)}
          </div>
        );
      }
    }
  ];

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 2
      }}
    >
      <Stories
        stories={storyContent as any}
        defaultInterval={15000}
        width="100%"
        height="100%"
        storyStyles={{
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      />
    </Box>
  );
};

export default StoryPreview;