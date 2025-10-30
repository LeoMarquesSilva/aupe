import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Badge,
  Chip,
  Button,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Instagram as InstagramIcon,
  AddBox as PostAddIcon,
  AddPhotoAlternate as StoryAddIcon,
  CalendarMonth as CalendarIcon
} from '@mui/icons-material';
import { Client } from '../types';
import { InstagramProfile } from '../services/instagramMetricsService';

interface ClientHeaderProps {
  client: Client;
  profile: InstagramProfile | null;
  onCreatePost: () => void;
  onCreateStory: () => void;
  onViewCalendar: () => void;
}

const ClientHeader: React.FC<ClientHeaderProps> = ({
  client,
  profile,
  onCreatePost,
  onCreateStory,
  onViewCalendar
}) => {
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const hasInstagramAuth = client.accessToken && client.instagramAccountId;

  // Função para obter a imagem do avatar - priorizar foto do Instagram
  const getAvatarImage = () => {
    // Priorizar a foto do perfil do Instagram
    if (profile?.profile_picture_url) {
      return profile.profile_picture_url;
    }
    // Fallback para profilePicture do cliente (salvo no banco)
    if (client.profilePicture) {
      return client.profilePicture;
    }
    // Último fallback para o logo do cliente
    return client.logoUrl;
  };

  return (
    <Box sx={{ 
      p: 3, 
      mb: 4, 
      borderRadius: 2,
      background: `linear-gradient(to right, ${theme.palette.primary.main}22, ${theme.palette.primary.main}11)`,
    }}>
      <Box sx={{ display: 'flex', flexDirection: isTablet ? 'column' : 'row', alignItems: isTablet ? 'flex-start' : 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: isTablet ? 2 : 0 }}>
          <Badge 
            color={hasInstagramAuth ? "success" : "error"} 
            overlap="circular"
            badgeContent={hasInstagramAuth ? <InstagramIcon fontSize="small" /> : '!'}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
          >
            <Avatar 
              src={getAvatarImage()} 
              alt={client.name}
              sx={{ width: 64, height: 64, mr: 2 }}
            >
              {client.name.charAt(0)}
            </Avatar>
          </Badge>
          <Box>
            <Typography variant="h5" component="h1">{client.name}</Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
              <InstagramIcon fontSize="small" sx={{ mr: 0.5 }} />
              @{client.instagram}
              {profile && (
                <Chip 
                  label={`${profile.followers_count.toLocaleString()} seguidores`} 
                  size="small" 
                  sx={{ ml: 1 }} 
                />
              )}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button 
            variant="contained" 
            startIcon={<PostAddIcon />}
            onClick={onCreatePost}
            sx={{ color: '#ffffff' }}
          >
            Criar Post
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<StoryAddIcon />}
            onClick={onCreateStory}
          >
            Criar Story
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<CalendarIcon />}
            onClick={onViewCalendar}
          >
            Calendário
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ClientHeader;