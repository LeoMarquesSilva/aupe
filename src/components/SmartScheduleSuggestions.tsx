import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Stack,
  Paper,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon
} from '@mui/icons-material';

interface SmartScheduleSuggestionsProps {
  onSelectDateTime: (date: string, time: string) => void;
}

const SmartScheduleSuggestions: React.FC<SmartScheduleSuggestionsProps> = ({ onSelectDateTime }) => {
  // Melhores horários baseados em estudos do Instagram
  const bestTimes = [
    {
      day: 'Segunda-feira',
      times: ['11:00', '14:00', '17:00'],
      engagement: 'Alto',
      color: 'success' as const
    },
    {
      day: 'Terça-feira',
      times: ['09:00', '11:00', '15:00'],
      engagement: 'Muito Alto',
      color: 'primary' as const
    },
    {
      day: 'Quarta-feira',
      times: ['09:00', '11:00', '15:00'],
      engagement: 'Muito Alto',
      color: 'primary' as const
    },
    {
      day: 'Quinta-feira',
      times: ['09:00', '12:00', '19:00'],
      engagement: 'Alto',
      color: 'success' as const
    },
    {
      day: 'Sexta-feira',
      times: ['09:00', '13:00', '15:00'],
      engagement: 'Médio',
      color: 'warning' as const
    },
    {
      day: 'Sábado',
      times: ['10:00', '11:00', '14:00'],
      engagement: 'Médio',
      color: 'warning' as const
    },
    {
      day: 'Domingo',
      times: ['10:00', '12:00', '16:00'],
      engagement: 'Baixo',
      color: 'error' as const
    }
  ];

  // Obter próximas datas para cada dia da semana
  const getNextDateForDay = (dayName: string): string => {
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const targetDay = days.indexOf(dayName);
    const today = new Date();
    const currentDay = today.getDay();
    
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0) {
      daysToAdd += 7; // Próxima semana
    }
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);
    
    return targetDate.toISOString().split('T')[0];
  };

  // Sugestões rápidas para hoje e amanhã
  const getQuickSuggestions = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const currentHour = now.getHours();
    
    // Horários ainda disponíveis hoje
    const todayTimes = ['18:00', '19:00', '20:00', '21:00'].filter(time => {
      const [hour] = time.split(':').map(Number);
      return hour > currentHour + 1; // Pelo menos 1 hora no futuro
    });

    // Melhores horários para amanhã
    const tomorrowTimes = ['09:00', '11:00', '15:00', '18:00'];

    return [
      ...(todayTimes.length > 0 ? [{
        label: 'Hoje',
        date: today,
        times: todayTimes,
        priority: 'medium' as const
      }] : []),
      {
        label: 'Amanhã',
        date: tomorrowStr,
        times: tomorrowTimes,
        priority: 'high' as const
      }
    ];
  };

  const quickSuggestions = getQuickSuggestions();

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 3, 
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 2,
        backgroundColor: '#f8f9ff'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ 
          fontWeight: 'medium',
          display: 'flex',
          alignItems: 'center'
        }}>
          <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
          Sugestões Inteligentes
        </Typography>
        
        <Tooltip title="Baseado em estudos de engajamento do Instagram">
          <IconButton size="small">
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Sugestões Rápidas */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
          🚀 Sugestões Rápidas
        </Typography>
        <Stack spacing={2}>
          {quickSuggestions.map((suggestion) => (
            <Box key={suggestion.label}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                {suggestion.label}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {suggestion.times.map((time) => (
                  <Chip
                    key={`${suggestion.date}-${time}`}
                    label={time}
                    onClick={() => onSelectDateTime(suggestion.date, time)}
                    variant="outlined"
                    color={suggestion.priority === 'high' ? 'primary' : 'default'}
                    size="small"
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { 
                        backgroundColor: suggestion.priority === 'high' ? 'primary.light' : 'action.hover',
                        color: suggestion.priority === 'high' ? 'white' : 'inherit'
                      }
                    }}
                  />
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Melhores Horários por Dia da Semana */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
          📊 Melhores Horários por Dia da Semana
        </Typography>
        <Stack spacing={2}>
          {bestTimes.map((dayInfo) => (
            <Box key={dayInfo.day}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  {dayInfo.day}
                </Typography>
                <Chip 
                  label={`Engajamento ${dayInfo.engagement}`}
                  size="small"
                  color={dayInfo.color}
                  variant="outlined"
                />
              </Box>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {dayInfo.times.map((time) => (
                  <Chip
                    key={`${dayInfo.day}-${time}`}
                    label={time}
                    onClick={() => onSelectDateTime(getNextDateForDay(dayInfo.day), time)}
                    variant="outlined"
                    size="small"
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { 
                        backgroundColor: `${dayInfo.color}.light`,
                        color: 'white'
                      }
                    }}
                  />
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      </Box>

      <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(25, 118, 210, 0.08)', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
          <InfoIcon sx={{ fontSize: 14, mr: 0.5 }} />
          Dica: Os melhores horários podem variar conforme seu público. Monitore o engajamento para otimizar.
        </Typography>
      </Box>
    </Paper>
  );
};

export default SmartScheduleSuggestions;