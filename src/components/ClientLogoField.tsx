import React, { useRef, useEffect, useState } from 'react';
import { Avatar, Box, Button, Typography } from '@mui/material';
import { Image as ImageIcon, Delete as DeleteIcon } from '@mui/icons-material';

interface ClientLogoFieldProps {
  name: string;
  previewUrl?: string | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

const ClientLogoField: React.FC<ClientLogoFieldProps> = ({
  name,
  previewUrl,
  file,
  onFileChange,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const displayUrl = objectUrl || previewUrl || null;
  const letter = (name || 'C').trim().charAt(0).toUpperCase() || 'C';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Avatar
        src={displayUrl || undefined}
        alt={name || 'Logo do cliente'}
        sx={{ width: 64, height: 64, fontSize: '1.25rem' }}
      >
        {letter}
      </Avatar>

      <Box>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
          Logo do cliente
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Opcional. Aparece nos links de aprovação enviados ao cliente.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ImageIcon />}
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            {displayUrl ? 'Trocar imagem' : 'Enviar imagem'}
          </Button>
          {(file || previewUrl) && (
            <Button
              size="small"
              color="inherit"
              startIcon={<DeleteIcon />}
              disabled={disabled}
              onClick={() => {
                onFileChange(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
            >
              Remover
            </Button>
          )}
        </Box>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          onChange={(e) => {
            const picked = e.target.files?.[0] ?? null;
            onFileChange(picked);
          }}
        />
      </Box>
    </Box>
  );
};

export default ClientLogoField;
