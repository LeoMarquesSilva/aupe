import React from 'react';
import { Box, Typography, TextField } from '@mui/material';

interface DateTimePickerProps {
  scheduledDate: string;
  onChange: (date: string) => void;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({ scheduledDate, onChange }) => {
  // Formata a data para o formato esperado pelo input datetime-local
  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toISOString().slice(0, 16); // Formato YYYY-MM-DDTHH:MM
    } catch (error) {
      return '';
    }
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Data e Hora de Agendamento
      </Typography>
      <TextField
        type="datetime-local"
        fullWidth
        variant="outlined"
        value={formatDateForInput(scheduledDate)}
        onChange={(e) => onChange(e.target.value)}
        InputLabelProps={{
          shrink: true,
        }}
      />
      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
        Selecione a data e hora para agendamento da postagem
      </Typography>
    </Box>
  );
};

export default DateTimePicker;