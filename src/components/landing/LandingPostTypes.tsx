import React from 'react';
import { Box, Container, Typography, Stack, Chip } from '@mui/material';
import { motion } from 'framer-motion';
import { postTypes } from './LandingContent';

const LandingPostTypes: React.FC = () => (
  <Box
    component="section"
    sx={{
      py: { xs: 5, md: 7 },
      position: 'relative',
    }}
  >
    <Container maxWidth="md">
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          variant="h3"
          sx={{
            fontFamily: '"Cabinet Grotesk", "Poppins", sans-serif',
            fontSize: { xs: '1.8rem', md: '2.35rem' },
            fontWeight: 800,
            mb: 1.5,
            color: '#0a0f2d',
          }}
        >
          Todos os formatos no mesmo calendário
        </Typography>
        <Typography variant="body1" sx={{ color: '#525663', maxWidth: 580, mx: 'auto', mb: 3 }}>
          Sem cards chamativos ou ícones desnecessários: o importante é deixar claro que a rotina cobre os formatos que a agência já vende.
        </Typography>
        <Stack direction="row" spacing={1.25} useFlexGap flexWrap="wrap" justifyContent="center">
          {postTypes.map((type, index) => (
            <motion.div
              key={type.name}
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
            >
              <Chip
                label={type.name}
                sx={{
                  bgcolor: '#ffffff',
                  color: '#0a0f2d',
                  border: '1px solid rgba(82, 86, 99, 0.14)',
                  fontWeight: 700,
                  px: 1,
                  height: 40,
                  '& .MuiChip-label': { px: 1.4 },
                }}
              />
            </motion.div>
          ))}
        </Stack>
      </Box>
    </Container>
  </Box>
);

export default LandingPostTypes;
