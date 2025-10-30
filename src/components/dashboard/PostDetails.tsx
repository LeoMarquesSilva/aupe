import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardMedia,
  Typography,
  Box,
  Chip,
  Paper,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ThumbUp as LikeIcon,
  ChatBubbleOutline as CommentIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  ViewCarousel as CarouselIcon
} from '@mui/icons-material';
import { InstagramPost, instagramMetricsService } from '../../services/instagramMetricsService';

interface PostDetailsProps {
  open: boolean;
  post: InstagramPost | null;
  onClose: () => void;
  formatTimestamp: (timestamp: string) => string;
}

const PostDetails: React.FC<PostDetailsProps> = ({
  open,
  post,
  onClose,
  formatTimestamp
}) => {
  if (!post) return null;

  const getMediaTypeIcon = (type: string) => {
    switch (type) {
      case 'IMAGE':
        return <ImageIcon />;
      case 'VIDEO':
        return <VideoIcon />;
      case 'CAROUSEL_ALBUM':
        return <CarouselIcon />;
      default:
        return <ImageIcon />;
    }
  };

  const getMediaTypeLabel = (type: string) => {
    switch (type) {
      case 'IMAGE':
        return 'Imagem';
      case 'VIDEO':
        return 'Vídeo';
      case 'CAROUSEL_ALBUM':
        return 'Carrossel';
      default:
        return type;
    }
  };

  // Cálculo correto do engajamento: Likes + Comments + Saved
  const likes = post.like_count || 0;
  const comments = post.comments_count || 0;
  const saved = post.insights?.saved || 0;
  const reach = post.insights?.reach || 0;
  const impressions = post.insights?.impressions || 0;
  
  const totalEngagement = likes + comments + saved;
  const engagementRate = reach > 0 ? (totalEngagement / reach) : 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Detalhes do Post
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardMedia
                component="img"
                image={post.thumbnail_url || post.media_url}
                alt={post.caption}
                sx={{ maxHeight: 400, objectFit: 'contain' }}
              />
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Informações do Post
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Data de publicação
              </Typography>
              <Typography variant="body1">
                {formatTimestamp(post.timestamp)}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Tipo de mídia
              </Typography>
              <Chip 
                icon={getMediaTypeIcon(post.media_type)}
                label={getMediaTypeLabel(post.media_type)}
                size="small"
              />
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Métricas de Engajamento
              </Typography>
              <Grid container spacing={1} sx={{ mt: 0.5 }}>
                <Grid item xs={4}>
                  <Paper elevation={0} sx={{ p: 1, textAlign: 'center', bgcolor: 'secondary.light' }}>
                    <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 'bold' }}>{likes}</Typography>
                    <Typography variant="caption" sx={{ color: '#ffffff' }}>Curtidas</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper elevation={0} sx={{ p: 1, textAlign: 'center', bgcolor: 'success.light' }}>
                    <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 'bold' }}>{comments}</Typography>
                    <Typography variant="caption" sx={{ color: '#ffffff' }}>Comentários</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper elevation={0} sx={{ p: 1, textAlign: 'center', bgcolor: 'warning.light' }}>
                    <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 'bold' }}>{saved}</Typography>
                    <Typography variant="caption" sx={{ color: '#ffffff' }}>Salvos</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Engajamento Total
              </Typography>
              <Grid container spacing={1} sx={{ mt: 0.5 }}>
                <Grid item xs={6}>
                  <Paper elevation={0} sx={{ p: 1, textAlign: 'center', bgcolor: 'info.light' }}>
                    <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
                      {totalEngagement}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#ffffff' }}>Engajamento</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper elevation={0} sx={{ p: 1, textAlign: 'center', bgcolor: 'info.dark' }}>
                    <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
                      {(engagementRate * 100).toFixed(2)}%
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#ffffff' }}>Taxa Eng.</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
            
            {post.insights && (reach > 0 || impressions > 0) && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Métricas de Alcance
                </Typography>
                <Grid container spacing={1} sx={{ mt: 0.5 }}>
                  {reach > 0 && (
                    <Grid item xs={impressions > 0 ? 6 : 12}>
                      <Paper elevation={0} sx={{ p: 1, textAlign: 'center', bgcolor: 'primary.light' }}>
                        <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 'bold' }}>{reach}</Typography>
                        <Typography variant="caption" sx={{ color: '#ffffff' }}>Alcance</Typography>
                      </Paper>
                    </Grid>
                  )}
                  {impressions > 0 && (
                    <Grid item xs={reach > 0 ? 6 : 12}>
                      <Paper elevation={0} sx={{ p: 1, textAlign: 'center', bgcolor: 'primary.dark' }}>
                        <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 'bold' }}>{impressions}</Typography>
                        <Typography variant="caption" sx={{ color: '#ffffff' }}>Impressões</Typography>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
            
            <Button 
              variant="outlined" 
              startIcon={<LinkIcon />}
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              fullWidth
              sx={{ mt: 1 }}
            >
              Ver no Instagram
            </Button>
          </Grid>
          
          <Grid item xs={12}>
            <Accordion defaultExpanded>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="caption-content"
                id="caption-header"
              >
                <Typography>Legenda</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {post.caption || 'Sem legenda'}
                </Typography>
                
                {post.caption && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Tempo de leitura estimado: {instagramMetricsService.estimateReadingTime(post.caption)} min
                    </Typography>
                    
                    {instagramMetricsService.extractHashtags(post.caption).length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">Hashtags:</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                          {instagramMetricsService.extractHashtags(post.caption).map((tag, idx) => (
                            <Chip key={idx} label={tag} size="small" />
                          ))}
                        </Box>
                      </Box>
                    )}
                    
                    {instagramMetricsService.extractMentions(post.caption).length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">Menções:</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                          {instagramMetricsService.extractMentions(post.caption).map((mention, idx) => (
                            <Chip key={idx} label={mention} size="small" color="primary" />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PostDetails;