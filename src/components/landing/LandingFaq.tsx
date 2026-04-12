import React from 'react';
import { Box, Container, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { motion } from 'framer-motion';
import { GLASS } from '../../theme/glassTokens';
import { INSYT_COLORS, faqs } from './LandingContent';

const LandingFaq: React.FC = () => (
  <Box
    component="section"
    id="faq"
    sx={{
      py: { xs: 10, md: 14 },
      position: 'relative',
    }}
  >
    <Container maxWidth="md">
      <Box sx={{ textAlign: 'center', mb: 8 }}>
        <Typography
          variant="h2"
          sx={{
            fontFamily: '"Cabinet Grotesk", "Poppins", sans-serif',
            fontSize: { xs: '2.25rem', md: '3.25rem' },
            fontWeight: 800,
            mb: 2,
            background: INSYT_COLORS.gradientPrimary,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Dúvidas sobre a operação
        </Typography>
        <Typography variant="h6" sx={{ color: INSYT_COLORS.gray400, maxWidth: 560, mx: 'auto', fontWeight: 400 }}>
          Entenda como funcionam agendamento, aprovação e compartilhamento com o cliente
        </Typography>
      </Box>

      <Box>
        {faqs.map((faq, index) => (
          <motion.div
            key={faq.question}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: index * 0.04 }}
          >
            <Accordion
              sx={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: `${GLASS.radius.inner} !important`,
                mb: 2,
                backdropFilter: `blur(${GLASS.surface.blur})`,
                boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.05) inset',
                '&:before': {
                  display: 'none',
                },
                '&.Mui-expanded': {
                  background: 'rgba(255, 255, 255, 0.09)',
                  borderColor: 'rgba(247, 66, 17, 0.25)',
                  boxShadow: '0 8px 24px rgba(247, 66, 17, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.08) inset',
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: INSYT_COLORS.primaryLight }} />}
                sx={{
                  py: 2,
                  px: 3,
                  '& .MuiAccordionSummary-content': {
                    my: 1,
                  },
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    color: INSYT_COLORS.gray100,
                    fontWeight: 600,
                    fontSize: '1.05rem',
                  }}
                >
                  {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 3, pb: 3 }}>
                <Typography variant="body1" sx={{ color: INSYT_COLORS.gray400, lineHeight: 1.8 }}>
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          </motion.div>
        ))}
      </Box>
    </Container>
  </Box>
);

export default LandingFaq;
