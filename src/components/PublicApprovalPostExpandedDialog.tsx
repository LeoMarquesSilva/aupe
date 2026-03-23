import React from 'react';
import {
  Dialog,
  DialogContent,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import {
  PostMediaPreview,
  getFirstImageUrl,
  getImageUrls,
  POST_TYPE,
} from './PublicApprovalPostMedia';

/** Post shape suficiente para mídia + legenda (link cliente ou revisão interna). */
export interface PublicApprovalExpandedPost {
  id: string;
  caption?: string;
  images?: (string | { url: string })[];
  video?: string;
  coverImage?: string;
  postType?: string;
}

interface PublicApprovalPostExpandedDialogProps {
  open: boolean;
  onClose: () => void;
  post: PublicApprovalExpandedPost | null;
}

const PublicApprovalPostExpandedDialog: React.FC<PublicApprovalPostExpandedDialogProps> = ({
  open,
  onClose,
  post,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!post) return null;

  const postType = post.postType || 'post';
  const firstImage = getFirstImageUrl(post);
  const imageUrls = getImageUrls(post);
  const caption = post.caption ?? '';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="lg"
      fullWidth
      scroll="paper"
      aria-labelledby="public-approval-expanded-title"
      PaperProps={{
        sx: isMobile
          ? { bgcolor: 'background.default' }
          : {
              bgcolor: 'background.default',
              maxHeight: 'min(92vh, 980px)',
              m: 2,
            },
      }}
    >
      <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <Typography id="public-approval-expanded-title" variant="subtitle1" sx={{ flex: 1, fontWeight: 600 }}>
            Ver conteúdo completo
          </Typography>
          <IconButton
            edge="end"
            onClick={onClose}
            aria-label="Fechar visualização ampliada"
            sx={{ minWidth: 44, minHeight: 44 }}
          >
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <DialogContent
        sx={{
          px: { xs: 1.5, sm: 3 },
          py: { xs: 2, sm: 2.5 },
          width: '100%',
          maxWidth: 1200,
          mx: 'auto',
          overflow: 'auto',
        }}
      >
        {postType === POST_TYPE.ROTEIRO ? (
          <Box sx={{ py: 1 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1 }}>
              Roteiro
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.75, maxWidth: '65ch' }}>
              {caption}
            </Typography>
          </Box>
        ) : (
          <>
            <PostMediaPreview
              postType={postType}
              imageUrls={imageUrls}
              firstImage={firstImage}
              videoUrl={post.video}
              coverImageUrl={post.coverImage}
              size="expanded"
            />
            {caption ? (
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.75, mt: 2.5 }}>
                {caption}
              </Typography>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PublicApprovalPostExpandedDialog;
