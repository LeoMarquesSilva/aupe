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
      py: { xs: 8, md: 11 },
      position: 'relative',
      bgcolor: '#fff7f3',
    }}
  >
    <Container maxWidth="md">
      <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
        <Typography
          variant="h2"
          sx={{
            fontFamily: '"Cabinet Grotesk", "Poppins", sans-serif',
            fontSize: { xs: '2.25rem', md: '3.25rem' },
            fontWeight: 800,
            mb: 2,
            color: '#0a0f2d',
          }}
        >
          Dúvidas sobre a operação
        </Typography>
        <Typography variant="h6" sx={{ color: '#525663', maxWidth: 560, mx: 'auto', fontWeight: 400 }}>
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
                background: '#ffffff',
                border: '1px solid rgba(82, 86, 99, 0.12)',
                borderRadius: `${GLASS.radius.inner} !important`,
                mb: 2,
                boxShadow: '0 12px 34px -30px rgba(10, 15, 45, 0.35)',
                '&:before': {
                  display: 'none',
                },
                '&.Mui-expanded': {
                  background: '#ffffff',
                  borderColor: 'rgba(247, 66, 17, 0.28)',
                  boxShadow: '0 18px 44px -32px rgba(247, 66, 17, 0.42)',
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: INSYT_COLORS.primary }} />}
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
                    color: '#0a0f2d',
                    fontWeight: 800,
                    fontSize: '1.05rem',
                  }}
                >
                  {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 3, pb: 3 }}>
                <Typography variant="body1" sx={{ color: '#525663', lineHeight: 1.8 }}>
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
