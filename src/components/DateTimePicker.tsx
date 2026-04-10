import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Grid, 
  Paper,
  Chip,
  Button,
  Stack,
  Alert
} from '@mui/material';
import {
  Today as TodayIcon,
  Schedule as ScheduleIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { GLASS } from '../theme/glassTokens';

interface DateTimePickerProps {
  scheduledDate: string;
  onChange: (date: string) => void;
  disabled?: boolean;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({ scheduledDate, onChange, disabled = false }) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [validationMessage, setValidationMessage] = useState<string>('');
  const [_isValid, setIsValid] = useState<boolean>(true);

  // ✅ Inicializar valores quando scheduledDate muda
  useEffect(() => {
    if (scheduledDate) {
      try {
        const date = new Date(scheduledDate);
        // Usar toLocaleDateString e toLocaleTimeString para manter o fuso horário local
        const dateStr = date.getFullYear() + '-' + 
          String(date.getMonth() + 1).padStart(2, '0') + '-' + 
          String(date.getDate()).padStart(2, '0');
        const timeStr = String(date.getHours()).padStart(2, '0') + ':' + 
          String(date.getMinutes()).padStart(2, '0');
        
        setSelectedDate(dateStr);
        setSelectedTime(timeStr);
      } catch (error) {
        console.error('Erro ao parsear data:', error);
        setSelectedDate('');
        setSelectedTime('');
      }
    }
  }, [scheduledDate]);

  // ✅ Validar e atualizar apenas quando ambos os campos estão preenchidos
  useEffect(() => {
    if (selectedDate && selectedTime) {
      validateAndUpdate();
    } else if (!selectedDate && !selectedTime) {
      // Limpar apenas se ambos estão vazios
      setValidationMessage('');
      setIsValid(true);
      onChange('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedTime]);

  const validateAndUpdate = () => {
    if (!selectedDate || !selectedTime) return;

    try {
      // ✅ Criar data no fuso horário local
      const dateTimeString = `${selectedDate}T${selectedTime}:00`;
      const selectedDateTime = new Date(dateTimeString);
      const now = new Date();
      
      // ✅ Verificar se a data é válida
      if (isNaN(selectedDateTime.getTime())) {
        setValidationMessage('Data/hora inválida');
        setIsValid(false);
        onChange('');
        return;
      }
      
      // ✅ Verificar se é no futuro (com margem de 1 minuto)
      const oneMinuteFromNow = new Date(now.getTime() + 60000);
      
      if (selectedDateTime <= oneMinuteFromNow) {
        setValidationMessage('A data/hora deve ser pelo menos 1 minuto no futuro');
        setIsValid(false);
        onChange('');
        return;
      }
      
      // ✅ Verificar se não é muito distante (máximo 1 ano)
      const oneYearFromNow = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
      if (selectedDateTime > oneYearFromNow) {
        setValidationMessage('A data não pode ser mais de 1 ano no futuro');
        setIsValid(false);
        onChange('');
        return;
      }
      
      // ✅ Tudo válido - atualizar
      setValidationMessage('');
      setIsValid(true);
      onChange(selectedDateTime.toISOString());
      
    } catch (error) {
      console.error('Erro na validação:', error);
      setValidationMessage('Erro ao processar data/hora');
      setIsValid(false);
      onChange('');
    }
  };

  // ✅ Obter data mínima (hoje)
  const getMinDate = (): string => {
    const today = new Date();
    return today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');
  };

  // ✅ Obter hora mínima (se for hoje)
  const getMinTime = (): string => {
    const today = getMinDate();
    if (selectedDate === today) {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes() + 5; // 5 minutos de margem
      
      if (minutes >= 60) {
        return String(hours + 1).padStart(2, '0') + ':00';
      } else {
        return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
      }
    }
    return '00:00';
  };

  // Sugestões de datas rápidas
  const getDateSuggestions = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const formatDate = (date: Date) => {
      return date.getFullYear() + '-' + 
        String(date.getMonth() + 1).padStart(2, '0') + '-' + 
        String(date.getDate()).padStart(2, '0');
    };

    return [
      {
        label: 'Hoje',
        value: formatDate(today)
      },
      {
        label: 'Amanhã',
        value: formatDate(tomorrow)
      },
      {
        label: 'Próxima semana',
        value: formatDate(nextWeek)
      }
    ];
  };

  // Sugestões de horários comuns
  const commonTimes = ['09:00', '12:00', '15:00', '18:00', '20:00'];

  // ✅ Formatar data para exibição
  const formatDateDisplay = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
  };

  const handleTimeChange = (newTime: string) => {
    setSelectedTime(newTime);
  };

  const clearDateTime = () => {
    setSelectedDate('');
    setSelectedTime('');
    setValidationMessage('');
    setIsValid(true);
  };

  // ✅ Verificar se a data/hora atual é válida para exibição
  const getCurrentValidationStatus = () => {
    if (!selectedDate || !selectedTime) {
      return { isValid: true, message: '' };
    }
    
    if (validationMessage) {
      return { isValid: false, message: validationMessage };
    }
    
    return { isValid: true, message: 'Data e hora válidas' };
  };

  const currentStatus = getCurrentValidationStatus();

  return (
    <Box>
      <Typography variant="h6" sx={{ 
        mb: 3, 
        display: 'flex', 
        alignItems: 'center',
        fontWeight: 'medium'
      }}>
        <ScheduleIcon sx={{ mr: 1, color: GLASS.accent.orange }} />
        Data e Hora de Agendamento
      </Typography>

      <Grid container spacing={3}>
        {/* Seleção de Data */}
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              background: GLASS.surface.bg,
              backdropFilter: `blur(${GLASS.surface.blur})`,
              WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
              border: `1px solid ${GLASS.border.outer}`,
              borderRadius: GLASS.radius.inner,
              boxShadow: GLASS.shadow.cardInset,
            }}
          >
            <Typography variant="subtitle1" sx={{ 
              mb: 2, 
              fontWeight: 'medium',
              display: 'flex',
              alignItems: 'center',
              color: GLASS.text.heading,
            }}>
              <CalendarIcon sx={{ mr: 1, fontSize: 20, color: GLASS.accent.orange }} />
              Selecione a Data
            </Typography>

            {/* Sugestões de data */}
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
              {getDateSuggestions().map((suggestion) => (
                <Chip
                  key={suggestion.label}
                  label={suggestion.label}
                  onClick={disabled ? undefined : () => handleDateChange(suggestion.value)}
                  variant={selectedDate === suggestion.value ? 'filled' : 'outlined'}
                  size="small"
                  disabled={disabled}
                  sx={{ 
                    cursor: disabled ? 'default' : 'pointer',
                    ...(selectedDate === suggestion.value ? {
                      backgroundColor: GLASS.accent.orange,
                      color: '#fff',
                    } : {
                      borderColor: GLASS.border.outer,
                    }),
                    '&:hover': { 
                      backgroundColor: disabled ? undefined : (selectedDate === suggestion.value ? GLASS.accent.orangeDark : 'rgba(247,66,17,0.1)'),
                      color: disabled ? undefined : (selectedDate === suggestion.value ? 'white' : GLASS.accent.orange),
                    }
                  }}
                />
              ))}
            </Stack>

            <TextField
              type="date"
              fullWidth
              variant="outlined"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              disabled={disabled}
              inputProps={{
                min: getMinDate()
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />

            {selectedDate && (
              <Typography variant="body2" sx={{ mt: 2, fontWeight: 'medium', color: GLASS.accent.orange }}>
                📅 {formatDateDisplay(selectedDate)}
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Seleção de Hora */}
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              background: GLASS.surface.bg,
              backdropFilter: `blur(${GLASS.surface.blur})`,
              WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
              border: `1px solid ${GLASS.border.outer}`,
              borderRadius: GLASS.radius.inner,
              boxShadow: GLASS.shadow.cardInset,
            }}
          >
            <Typography variant="subtitle1" sx={{ 
              mb: 2, 
              fontWeight: 'medium',
              display: 'flex',
              alignItems: 'center',
              color: GLASS.text.heading,
            }}>
              <TimeIcon sx={{ mr: 1, fontSize: 20, color: GLASS.accent.orange }} />
              Selecione o Horário
            </Typography>

            {/* Sugestões de horário */}
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
              {commonTimes.map((time) => (
                <Chip
                  key={time}
                  label={time}
                  onClick={disabled ? undefined : () => handleTimeChange(time)}
                  variant={selectedTime === time ? 'filled' : 'outlined'}
                  size="small"
                  disabled={disabled}
                  sx={{ 
                    cursor: disabled ? 'default' : 'pointer',
                    ...(selectedTime === time ? {
                      backgroundColor: GLASS.accent.orange,
                      color: '#fff',
                    } : {
                      borderColor: GLASS.border.outer,
                    }),
                    '&:hover': { 
                      backgroundColor: disabled ? undefined : (selectedTime === time ? GLASS.accent.orangeDark : 'rgba(247,66,17,0.1)'),
                      color: disabled ? undefined : (selectedTime === time ? 'white' : GLASS.accent.orange),
                    }
                  }}
                />
              ))}
            </Stack>

            <TextField
              type="time"
              fullWidth
              variant="outlined"
              value={selectedTime}
              onChange={(e) => handleTimeChange(e.target.value)}
              disabled={disabled}
              inputProps={{
                min: selectedDate === getMinDate() ? getMinTime() : '00:00',
                step: 300 // 5 minutos
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />

            {selectedTime && (
              <Typography variant="body2" sx={{ mt: 2, fontWeight: 'medium', color: GLASS.accent.orange }}>
                🕐 {selectedTime}
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* ✅ Preview da data/hora selecionada - Melhorado */}
      {selectedDate && selectedTime && (
        <Paper 
          elevation={0} 
          sx={{ 
            mt: 3, 
            p: 3, 
            background: currentStatus.isValid ? 'rgba(247, 66, 17, 0.08)' : '#ffebee',
            backdropFilter: `blur(${GLASS.surface.blur})`,
            WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
            borderRadius: GLASS.radius.inner, 
            border: `1px solid ${currentStatus.isValid ? GLASS.accent.orange : '#f44336'}`,
            boxShadow: GLASS.shadow.cardInset,
          }}
        >
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1 }}>
            📋 Resumo do Agendamento:
          </Typography>
          <Typography variant="h6" sx={{ 
            color: currentStatus.isValid ? 'success.main' : 'error.main',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center'
          }}>
            <ScheduleIcon sx={{ mr: 1 }} />
            {formatDateDisplay(selectedDate)} às {selectedTime}
          </Typography>
          
          <Typography variant="body2" sx={{ 
            mt: 1,
            color: currentStatus.isValid ? 'success.dark' : 'error.main'
          }}>
            {currentStatus.isValid ? (
              '✅ Postagem será publicada automaticamente neste horário'
            ) : (
              `❌ ${currentStatus.message}`
            )}
          </Typography>
        </Paper>
      )}

      {/* ✅ Alertas informativos */}
      {selectedDate === getMinDate() && selectedTime && currentStatus.isValid && (
        <Alert severity="info" sx={{ mt: 2 }}>
          💡 Você selecionou hoje. Certifique-se de que há tempo suficiente para o processamento.
        </Alert>
      )}

      {/* Botões de ação */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<TodayIcon />}
          onClick={() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.getFullYear() + '-' + 
              String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + 
              String(tomorrow.getDate()).padStart(2, '0');
            handleDateChange(tomorrowStr);
            handleTimeChange('09:00');
          }}
          sx={{ textTransform: 'none' }}
        >
          Amanhã às 9h
        </Button>
        
        <Button
          variant="outlined"
          size="small"
          startIcon={<ScheduleIcon />}
          onClick={() => {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            const nextWeekStr = nextWeek.getFullYear() + '-' + 
              String(nextWeek.getMonth() + 1).padStart(2, '0') + '-' + 
              String(nextWeek.getDate()).padStart(2, '0');
            handleDateChange(nextWeekStr);
            handleTimeChange('18:00');
          }}
          sx={{ textTransform: 'none' }}
        >
          Próxima semana às 18h
        </Button>

        {(selectedDate || selectedTime) && (
          <Button
            variant="text"
            size="small"
            color="error"
            onClick={clearDateTime}
            sx={{ textTransform: 'none' }}
          >
            Limpar
          </Button>
        )}
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        💡 Dica: Escolha horários quando seu público está mais ativo para maior engajamento
      </Typography>
    </Box>
  );
};

export default DateTimePicker;