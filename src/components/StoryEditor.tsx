import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  IconButton, 
  TextField, 
  Slider, 
  Tooltip, 
  Divider, 
  Stack,
  Menu,
  MenuItem,
  Tabs,
  Tab,
  CircularProgress,
  Popover
} from '@mui/material';
import {
  TextFields as TextIcon,
  EmojiEmotions as EmojiIcon,
  Link as LinkIcon,
  Poll as PollIcon,
  Help as QuestionIcon,
  LinearScale as SliderIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatAlignLeft as AlignLeftIcon,
  FormatAlignCenter as AlignCenterIcon,
  FormatAlignRight as AlignRightIcon,
  FormatColorFill as ColorFillIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Delete as DeleteIcon,
  AddPhotoAlternate as AddPhotoIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { SketchPicker } from 'react-color';
import EmojiPicker from 'emoji-picker-react';
import StoryPreview from './StoryPreview';
import { 
  Story, 
  StoryElement, 
  StoryElementType, 
  StoryImage, 
  Position, 
  Size, 
  StoryEditHistory 
} from '../types';

interface StoryEditorProps {
  clientId: string;
  onSave: (story: Story) => void;
  initialStory?: Story;
}

const StoryEditor: React.FC<StoryEditorProps> = ({ clientId, onSave, initialStory }) => {
  // Estado para a imagem do story
  const [storyImage, setStoryImage] = useState<StoryImage | null>(
    initialStory?.image || null
  );
  
  // Estado para os elementos do story
  const [elements, setElements] = useState<StoryElement[]>(
    initialStory?.elements || []
  );
  
  // Estado para o elemento selecionado atualmente
  const [selectedElement, setSelectedElement] = useState<StoryElement | null>(null);
  
  // Estado para o histórico de edições (para desfazer/refazer)
  const [history, setHistory] = useState<StoryEditHistory>({
    elements: initialStory ? [initialStory.elements] : [[]],
    currentIndex: 0
  });
  
  // Estado para a ferramenta selecionada
  const [selectedTool, setSelectedTool] = useState<StoryElementType | null>(null);
  
  // Estados para controle de UI
  const [loading, setLoading] = useState<boolean>(false);
  const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);
  const [emojiPickerAnchor, setEmojiPickerAnchor] = useState<HTMLElement | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Efeito para salvar no histórico quando os elementos mudam
  useEffect(() => {
    if (elements !== history.elements[history.currentIndex]) {
      const newHistory = {
        elements: [...history.elements.slice(0, history.currentIndex + 1), [...elements]],
        currentIndex: history.currentIndex + 1
      };
      setHistory(newHistory);
    }
  }, [elements]);
  
  // Função para carregar uma imagem
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.height / img.width;
        const newImage: StoryImage = {
          id: Date.now().toString(),
          url: e.target?.result as string,
          file,
          width: img.width,
          height: img.height,
          aspectRatio
        };
        setStoryImage(newImage);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };
  
  // Função para adicionar um novo elemento
  const addElement = (type: StoryElementType) => {
    const newElement: StoryElement = {
      id: Date.now().toString(),
      type,
      position: { x: 0.5, y: 0.5 }, // Centro da imagem
      size: { width: 0.3, height: 0.1 }, // Tamanho padrão
      rotation: 0,
      zIndex: elements.length + 1,
      style: {
        opacity: 1,
        text: type === 'text' ? 'Digite seu texto aqui' : undefined,
        fontSize: 24,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'center' as 'center', // Tipo explícito para garantir compatibilidade
        color: '#ffffff',
        backgroundColor: type === 'text' ? 'rgba(0,0,0,0.5)' : undefined,
        padding: 10,
        borderRadius: 5,
        emoji: type === 'emoji' ? '😊' : undefined,
        pollQuestion: type === 'poll' ? 'Faça sua pergunta' : undefined,
        pollOptions: type === 'poll' ? ['Sim', 'Não'] : undefined,
        question: type === 'question' ? 'Faça sua pergunta' : undefined,
        sliderQuestion: type === 'slider' ? 'Avalie de 0 a 10' : undefined,
        sliderEmoji: type === 'slider' ? '🔥' : undefined,
      }
    };
    
    setElements([...elements, newElement]);
    setSelectedElement(newElement);
    setSelectedTool(null);
  };
  
  // Função para atualizar um elemento
  const updateElement = (updatedElement: StoryElement) => {
    const updatedElements = elements.map(element => 
      element.id === updatedElement.id ? updatedElement : element
    );
    setElements(updatedElements);
    setSelectedElement(updatedElement);
  };
  
  // Função para remover um elemento
  const removeElement = (elementId: string) => {
    const updatedElements = elements.filter(element => element.id !== elementId);
    setElements(updatedElements);
    setSelectedElement(null);
  };
  
  // Função para desfazer
  const handleUndo = () => {
    if (history.currentIndex > 0) {
      const newIndex = history.currentIndex - 1;
      setHistory({
        ...history,
        currentIndex: newIndex
      });
      setElements(history.elements[newIndex]);
      setSelectedElement(null);
    }
  };
  
  // Função para refazer
  const handleRedo = () => {
    if (history.currentIndex < history.elements.length - 1) {
      const newIndex = history.currentIndex + 1;
      setHistory({
        ...history,
        currentIndex: newIndex
      });
      setElements(history.elements[newIndex]);
      setSelectedElement(null);
    }
  };
  
  // Função para salvar o story
  const handleSave = () => {
    if (!storyImage) return;
    
    setLoading(true);
    
    const story: Story = {
      id: initialStory?.id || Date.now().toString(),
      clientId,
      image: storyImage,
      elements,
      scheduledDate: initialStory?.scheduledDate || new Date().toISOString(),
      status: 'draft',
      createdAt: initialStory?.createdAt || new Date().toISOString(),
      duration: 15 // Duração padrão de 15 segundos
    };
    
    setTimeout(() => {
      onSave(story);
      setLoading(false);
    }, 1000);
  };
  
  // Função auxiliar para definir o alinhamento do texto com tipo correto
  const setTextAlign = (element: StoryElement, align: 'left' | 'center' | 'right') => {
    const updatedElement = {
      ...element,
      style: {
        ...element.style,
        textAlign: align
      }
    };
    updateElement(updatedElement);
  };
  
  // Renderização condicional para quando não há imagem
  if (!storyImage) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: 400,
          border: '2px dashed #ccc',
          borderRadius: 2,
          p: 3
        }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          Selecione uma imagem para o Story
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddPhotoIcon />}
          onClick={() => fileInputRef.current?.click()}
        >
          Carregar Imagem
        </Button>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Recomendado: Imagem na proporção 9:16 (1080 x 1920 pixels)
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
      {/* Painel de ferramentas à esquerda */}
      <Box sx={{ width: { xs: '100%', md: '25%' }, minWidth: { md: '300px' } }}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Ferramentas
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Tooltip title="Adicionar Texto">
              <IconButton 
                color={selectedTool === 'text' ? 'primary' : 'default'}
                onClick={() => setSelectedTool(selectedTool === 'text' ? null : 'text')}
              >
                <TextIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Adicionar Emoji">
              <IconButton 
                color={selectedTool === 'emoji' ? 'primary' : 'default'}
                onClick={() => setSelectedTool(selectedTool === 'emoji' ? null : 'emoji')}
              >
                <EmojiIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Adicionar Link">
              <IconButton 
                color={selectedTool === 'link' ? 'primary' : 'default'}
                onClick={() => setSelectedTool(selectedTool === 'link' ? null : 'link')}
              >
                <LinkIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Adicionar Enquete">
              <IconButton 
                color={selectedTool === 'poll' ? 'primary' : 'default'}
                onClick={() => setSelectedTool(selectedTool === 'poll' ? null : 'poll')}
              >
                <PollIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Adicionar Pergunta">
              <IconButton 
                color={selectedTool === 'question' ? 'primary' : 'default'}
                onClick={() => setSelectedTool(selectedTool === 'question' ? null : 'question')}
              >
                <QuestionIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Adicionar Slider">
              <IconButton 
                color={selectedTool === 'slider' ? 'primary' : 'default'}
                onClick={() => setSelectedTool(selectedTool === 'slider' ? null : 'slider')}
              >
                <SliderIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          {/* Botões de ação - CORRIGIDO: Envolvendo botões desabilitados com Box */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Tooltip title={history.currentIndex === 0 ? "Nada para desfazer" : "Desfazer"}>
              <Box>
                <IconButton 
                  onClick={handleUndo}
                  disabled={history.currentIndex === 0}
                >
                  <UndoIcon />
                </IconButton>
              </Box>
            </Tooltip>
            
            <Tooltip title={history.currentIndex === history.elements.length - 1 ? "Nada para refazer" : "Refazer"}>
              <Box>
                <IconButton 
                  onClick={handleRedo}
                  disabled={history.currentIndex === history.elements.length - 1}
                >
                  <RedoIcon />
                </IconButton>
              </Box>
            </Tooltip>
            
            <Tooltip title="Trocar Imagem">
              <IconButton onClick={() => fileInputRef.current?.click()}>
                <AddPhotoIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          
          <Divider sx={{ my: 2 }} />
          
          {/* Painel de edição do elemento selecionado */}
          {selectedElement && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Editar {selectedElement.type === 'text' ? 'Texto' : 
                       selectedElement.type === 'emoji' ? 'Emoji' : 
                       selectedElement.type === 'link' ? 'Link' : 
                       selectedElement.type === 'poll' ? 'Enquete' : 
                       selectedElement.type === 'question' ? 'Pergunta' : 'Slider'}
              </Typography>
              
              {/* Controles específicos para cada tipo de elemento */}
              {selectedElement.type === 'text' && (
                <>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Texto"
                    value={selectedElement.style.text || ''}
                    onChange={(e) => {
                      const updatedElement = {
                        ...selectedElement,
                        style: {
                          ...selectedElement.style,
                          text: e.target.value
                        }
                      };
                      updateElement(updatedElement);
                    }}
                    sx={{ mb: 2 }}
                  />
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Tooltip title="Negrito">
                      <IconButton 
                        size="small"
                        color={selectedElement.style.fontWeight === 'bold' ? 'primary' : 'default'}
                        onClick={() => {
                          const updatedElement = {
                            ...selectedElement,
                            style: {
                              ...selectedElement.style,
                              fontWeight: selectedElement.style.fontWeight === 'bold' ? 'normal' : 'bold'
                            }
                          };
                          updateElement(updatedElement);
                        }}
                      >
                        <BoldIcon />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Itálico">
                      <IconButton 
                        size="small"
                        color={selectedElement.style.fontStyle === 'italic' ? 'primary' : 'default'}
                        onClick={() => {
                          const updatedElement = {
                            ...selectedElement,
                            style: {
                              ...selectedElement.style,
                              fontStyle: selectedElement.style.fontStyle === 'italic' ? 'normal' : 'italic'
                            }
                          };
                          updateElement(updatedElement);
                        }}
                      >
                        <ItalicIcon />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Alinhar à Esquerda">
                      <IconButton 
                        size="small"
                        color={selectedElement.style.textAlign === 'left' ? 'primary' : 'default'}
                        onClick={() => setTextAlign(selectedElement, 'left')}
                      >
                        <AlignLeftIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Centralizar">
                      <IconButton 
                        size="small"
                        color={selectedElement.style.textAlign === 'center' ? 'primary' : 'default'}
                        onClick={() => setTextAlign(selectedElement, 'center')}
                      >
                        <AlignCenterIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Alinhar à Direita">
                      <IconButton 
                        size="small"
                        color={selectedElement.style.textAlign === 'right' ? 'primary' : 'default'}
                        onClick={() => setTextAlign(selectedElement, 'right')}
                      >
                        <AlignRightIcon />
                      </IconButton>
                    </Tooltip>                    
                    <Tooltip title="Cor do Texto">
                      <IconButton 
                        size="small"
                        onClick={(e) => setColorPickerAnchor(e.currentTarget)}
                        sx={{ 
                          bgcolor: selectedElement.style.color,
                          '&:hover': { bgcolor: selectedElement.style.color }
                        }}
                      >
                        <ColorFillIcon sx={{ color: '#fff' }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  <Typography variant="body2" gutterBottom>
                    Tamanho da Fonte
                  </Typography>
                  <Slider
                    value={selectedElement.style.fontSize || 24}
                    min={12}
                    max={72}
                    step={1}
                    onChange={(_, newValue) => {
                      const updatedElement = {
                        ...selectedElement,
                        style: {
                          ...selectedElement.style,
                          fontSize: newValue as number
                        }
                      };
                      updateElement(updatedElement);
                    }}
                    sx={{ mb: 2 }}
                  />
                </>
              )}
              
              {selectedElement.type === 'emoji' && (
                <>
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      fontSize: '2rem',
                      mb: 2,
                      p: 2,
                      border: '1px solid #eee',
                      borderRadius: 1,
                      cursor: 'pointer'
                    }}
                    onClick={(e) => setEmojiPickerAnchor(e.currentTarget)}
                  >
                    {selectedElement.style.emoji || '😊'}
                  </Box>
                  <Button 
                    fullWidth 
                    variant="outlined"
                    onClick={(e) => setEmojiPickerAnchor(e.currentTarget)}
                  >
                    Escolher Emoji
                  </Button>
                </>
              )}
              
              {/* Controles comuns para todos os elementos */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Opacidade
                </Typography>
                <Slider
                  value={selectedElement.style.opacity || 1}
                  min={0.1}
                  max={1}
                  step={0.1}
                  onChange={(_, newValue) => {
                    const updatedElement = {
                      ...selectedElement,
                      style: {
                        ...selectedElement.style,
                        opacity: newValue as number
                      }
                    };
                    updateElement(updatedElement);
                  }}
                />
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Rotação
                </Typography>
                <Slider
                  value={selectedElement.rotation}
                  min={-180}
                  max={180}
                  step={1}
                  onChange={(_, newValue) => {
                    const updatedElement = {
                      ...selectedElement,
                      rotation: newValue as number
                    };
                    updateElement(updatedElement);
                  }}
                />
              </Box>
              
              <Button 
                fullWidth 
                variant="outlined" 
                color="error" 
                startIcon={<DeleteIcon />}
                onClick={() => removeElement(selectedElement.id)}
                sx={{ mt: 2 }}
              >
                Remover
              </Button>
            </Box>
          )}
          
          {/* Botão para adicionar o elemento selecionado */}
          {selectedTool && (
            <Button 
              fullWidth 
              variant="contained" 
              onClick={() => addElement(selectedTool)}
              sx={{ mt: 2 }}
            >
              Adicionar {selectedTool === 'text' ? 'Texto' : 
                       selectedTool === 'emoji' ? 'Emoji' : 
                       selectedTool === 'link' ? 'Link' : 
                       selectedTool === 'poll' ? 'Enquete' : 
                       selectedTool === 'question' ? 'Pergunta' : 'Slider'}
            </Button>
          )}
          
          {/* Botão de salvar */}
          <Button 
            fullWidth 
            variant="contained" 
            color="success"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={loading || !storyImage}
            sx={{ mt: 2 }}
          >
            {loading ? 'Salvando...' : 'Salvar Story'}
          </Button>
        </Paper>
      </Box>
      
      {/* Área de edição/preview */}
      <Box sx={{ width: { xs: '100%', md: '75%' }, flexGrow: 1 }}>
        <Paper 
          sx={{ 
            height: '80vh', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            bgcolor: '#f5f5f5',
            p: 2,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div ref={editorRef} style={{ position: 'relative', height: '100%' }}>
            <StoryPreview 
              story={{ 
                id: 'preview', 
                clientId, 
                image: storyImage, 
                elements, 
                scheduledDate: '', 
                status: 'draft', 
                createdAt: '' 
              }}
              isEditing={true}
              onElementSelect={setSelectedElement}
              selectedElementId={selectedElement?.id}
              onElementUpdate={updateElement}
            />
          </div>
        </Paper>
      </Box>
      
      {/* Color Picker Popover */}
      <Popover
        open={Boolean(colorPickerAnchor)}
        anchorEl={colorPickerAnchor}
        onClose={() => setColorPickerAnchor(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <SketchPicker
          color={selectedElement?.style.color || '#ffffff'}
          onChange={(color) => {
            if (selectedElement) {
              const updatedElement = {
                ...selectedElement,
                style: {
                  ...selectedElement.style,
                  color: color.hex
                }
              };
              updateElement(updatedElement);
            }
          }}
        />
      </Popover>
      
      {/* Emoji Picker Popover */}
      <Popover
        open={Boolean(emojiPickerAnchor)}
        anchorEl={emojiPickerAnchor}
        onClose={() => setEmojiPickerAnchor(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 1 }}>
          <EmojiPicker
            onEmojiClick={(emojiData) => {
              if (selectedElement) {
                const updatedElement = {
                  ...selectedElement,
                  style: {
                    ...selectedElement.style,
                    emoji: emojiData.emoji
                  }
                };
                updateElement(updatedElement);
                setEmojiPickerAnchor(null);
              }
            }}
          />
        </Box>
      </Popover>
    </Box>
  );
};

export default StoryEditor;