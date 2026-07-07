import React from 'react';
import { Box, Container, Typography, Grid, Card, Chip, Stack, Button, LinearProgress } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CheckIcon from '@mui/icons-material/Check';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import CollectionsIcon from '@mui/icons-material/Collections';
import ImageIcon from '@mui/icons-material/Image';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import LinkIcon from '@mui/icons-material/Link';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { motion } from 'framer-motion';
import { INSYT_COLORS, featureSections } from './LandingContent';

const sectionBg = (tone: string) => {
  if (tone === 'warm') return '#fff7f3';
  if (tone === 'navy') return '#0a0f2d';
  return '#f6f6f6';
};

type PreviewProps = {
  id: string;
  isDark: boolean;
};

const previewCardSx = (isDark: boolean) => ({
  bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
  border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(82, 86, 99, 0.12)'}`,
  color: isDark ? '#ffffff' : '#0a0f2d',
});

const SchedulingPreview: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const posts = [
    { type: 'Reels', title: 'Tour do produto', time: '09:30', icon: <VideoLibraryIcon />, color: INSYT_COLORS.primary },
    { type: 'Carrossel', title: 'Antes e depois', time: '14:00', icon: <CollectionsIcon />, color: '#06B6D4' },
    { type: 'Story', title: 'Prova social', time: '18:15', icon: <ImageIcon />, color: '#10B981' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box sx={{ width: 38, height: 38, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: alpha(INSYT_COLORS.primary, 0.12), color: INSYT_COLORS.primary }}>
            <CalendarMonthIcon />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 900, color: isDark ? '#fff' : '#0a0f2d' }}>Abril 2026</Typography>
            <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280', fontSize: '0.82rem' }}>Calendário da conta @cliente</Typography>
          </Box>
        </Box>
        <Chip label="3 agendados" size="small" sx={{ bgcolor: alpha(INSYT_COLORS.primary, 0.1), color: INSYT_COLORS.primary, fontWeight: 800 }} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.75, mb: 2.5 }}>
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, index) => (
          <Typography key={`${day}-${index}`} sx={{ textAlign: 'center', color: isDark ? 'rgba(255,255,255,0.45)' : '#9CA3AF', fontSize: '0.72rem', fontWeight: 800 }}>
            {day}
          </Typography>
        ))}
        {Array.from({ length: 14 }).map((_, index) => {
          const active = [2, 5, 10].includes(index);
          return (
            <Box
              key={index}
              sx={{
                height: 42,
                borderRadius: 2,
                bgcolor: active ? alpha(INSYT_COLORS.primary, 0.1) : isDark ? 'rgba(255,255,255,0.04)' : '#f7f7f8',
                border: `1px solid ${active ? alpha(INSYT_COLORS.primary, 0.24) : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(82,86,99,0.08)'}`,
                display: 'grid',
                placeItems: 'center',
                color: active ? INSYT_COLORS.primary : isDark ? 'rgba(255,255,255,0.55)' : '#525663',
                fontWeight: active ? 900 : 600,
                fontSize: '0.82rem',
              }}
            >
              {index + 8}
            </Box>
          );
        })}
      </Box>

      <Stack spacing={1.1}>
        {posts.map((post) => (
          <Box key={post.title} sx={{ ...previewCardSx(isDark), display: 'grid', gridTemplateColumns: '34px 1fr auto', alignItems: 'center', gap: 1.25, borderRadius: 2.5, p: 1.35 }}>
            <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: alpha(post.color, 0.12), color: post.color, '& svg': { fontSize: 18 } }}>
              {post.icon}
            </Box>
            <Box>
              <Typography sx={{ color: isDark ? '#fff' : '#0a0f2d', fontWeight: 800, fontSize: '0.9rem' }}>{post.title}</Typography>
              <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#6B7280', fontSize: '0.76rem' }}>{post.type}</Typography>
            </Box>
            <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.65)' : '#525663', fontWeight: 800, fontSize: '0.8rem' }}>{post.time}</Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

const ApprovalPreview: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const columns = [
    { title: 'Pré-aprovação interna', count: 2, color: '#525663', items: ['Legenda institucional', 'Roteiro Reels'] },
    { title: 'Aguardando cliente', count: 3, color: '#f59e0b', items: ['Carrossel campanha', 'Story oferta'] },
    { title: 'Ajustes', count: 1, color: INSYT_COLORS.primary, items: ['Post produto'] },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2.5 }}>
        <Box sx={{ width: 38, height: 38, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: alpha(INSYT_COLORS.primary, 0.12), color: INSYT_COLORS.primary }}>
          <FactCheckIcon />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 900, color: isDark ? '#fff' : '#0a0f2d' }}>Fluxo de aprovação</Typography>
          <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280', fontSize: '0.82rem' }}>Mesmo conceito do kanban real de aprovações</Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.25 }}>
        {columns.map((column) => (
          <Box key={column.title} sx={{ ...previewCardSx(isDark), borderTop: `3px solid ${column.color}`, borderRadius: 2.5, p: 1.2, minHeight: 230 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.3 }}>
              <Typography sx={{ color: isDark ? '#fff' : '#0a0f2d', fontWeight: 900, fontSize: '0.78rem', lineHeight: 1.25 }}>
                {column.title}
              </Typography>
              <Chip label={column.count} size="small" sx={{ height: 20, minWidth: 22, bgcolor: alpha(column.color, 0.12), color: column.color, fontWeight: 900 }} />
            </Box>
            <Stack spacing={1}>
              {column.items.map((item, index) => (
                <Box key={item} sx={{ borderRadius: 2, p: 1, bgcolor: isDark ? 'rgba(255,255,255,0.05)' : '#fbfbfb', border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(82,86,99,0.08)'}` }}>
                  <Typography sx={{ color: isDark ? '#fff' : '#0a0f2d', fontWeight: 800, fontSize: '0.76rem', mb: 0.6 }}>{item}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {index === 0 ? <LinkIcon sx={{ fontSize: 14, color: column.color }} /> : <CheckCircleIcon sx={{ fontSize: 14, color: column.color }} />}
                    <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#6B7280', fontSize: '0.68rem' }}>
                      {index === 0 ? 'link ativo' : 'em revisão'}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const DashboardPreview: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const metrics = [
    { label: 'Alcance', value: '12.4k', change: '+18%' },
    { label: 'Engajamento', value: '6.8%', change: '+9%' },
    { label: 'Posts', value: '34', change: 'mês' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box sx={{ width: 38, height: 38, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: alpha(INSYT_COLORS.primary, 0.14), color: INSYT_COLORS.primary }}>
            <AnalyticsIcon />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 900, color: isDark ? '#fff' : '#0a0f2d' }}>Dashboard do cliente</Typography>
            <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280', fontSize: '0.82rem' }}>Link somente leitura</Typography>
          </Box>
        </Box>
        <Chip icon={<VisibilityIcon sx={{ fontSize: '16px !important' }} />} label="Cliente" size="small" sx={{ bgcolor: alpha('#10B981', 0.12), color: '#10B981', fontWeight: 800 }} />
      </Box>

      <Grid container spacing={1.25} sx={{ mb: 2.25 }}>
        {metrics.map((metric) => (
          <Grid item xs={4} key={metric.label}>
            <Box sx={{ ...previewCardSx(isDark), borderRadius: 2.5, p: 1.4 }}>
              <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.52)' : '#6B7280', fontSize: '0.72rem', mb: 0.75 }}>{metric.label}</Typography>
              <Typography sx={{ color: isDark ? '#fff' : '#0a0f2d', fontWeight: 900, fontSize: { xs: '1rem', sm: '1.25rem' } }}>{metric.value}</Typography>
              <Typography sx={{ color: '#10B981', fontWeight: 800, fontSize: '0.7rem' }}>{metric.change}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ ...previewCardSx(isDark), borderRadius: 2.5, p: 2, mb: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.8 }}>
          <Typography sx={{ color: isDark ? '#fff' : '#0a0f2d', fontWeight: 900 }}>Performance no período</Typography>
          <TrendingUpIcon sx={{ color: '#10B981' }} />
        </Box>
        {[72, 48, 86, 64].map((value, index) => (
          <Box key={value} sx={{ mb: index === 3 ? 0 : 1.3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
              <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.58)' : '#6B7280', fontSize: '0.72rem' }}>Semana {index + 1}</Typography>
              <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.58)' : '#6B7280', fontSize: '0.72rem' }}>{value}%</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={value}
              sx={{
                height: 8,
                borderRadius: 999,
                bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(82,86,99,0.08)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 999,
                  bgcolor: index === 2 ? INSYT_COLORS.primary : '#10B981',
                },
              }}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const FeaturePreview: React.FC<PreviewProps> = ({ id, isDark }) => {
  if (id === 'agendamento') return <SchedulingPreview isDark={isDark} />;
  if (id === 'aprovacao') return <ApprovalPreview isDark={isDark} />;
  return <DashboardPreview isDark={isDark} />;
};

const LandingFeatures: React.FC = () => (
  <Box
    component="section"
    id="features"
    sx={{
      position: 'relative',
    }}
  >
    {featureSections.map((section, index) => {
      const isDark = section.tone === 'navy';
      const reverse = index % 2 === 1;
      return (
        <Box
          key={section.id}
          component="section"
          id={section.id}
          sx={{
            py: { xs: 8, md: 12 },
            bgcolor: sectionBg(section.tone),
            scrollMarginTop: 110,
          }}
        >
          <Container
            maxWidth={false}
            sx={{
              maxWidth: 1360,
              mx: 'auto',
              px: { xs: 2.5, md: 3 },
            }}
          >
            <Grid
              container
              spacing={{ xs: 4, md: 7 }}
              alignItems="center"
              direction={{ xs: 'column', md: reverse ? 'row-reverse' : 'row' }}
            >
              <Grid item xs={12} md={6}>
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45 }}
                >
                  <Chip
                    label={section.eyebrow}
                    sx={{
                      mb: 2,
                      bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                      color: isDark ? INSYT_COLORS.primaryLight : INSYT_COLORS.primary,
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : alpha(INSYT_COLORS.primary, 0.18)}`,
                      fontWeight: 800,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                    }}
                  />
                  <Typography
                    variant="h2"
                    sx={{
                      fontFamily: '"Cabinet Grotesk", "Poppins", sans-serif',
                      fontSize: { xs: '2rem', md: '3.1rem' },
                      fontWeight: 900,
                      lineHeight: 1.02,
                      letterSpacing: '-0.04em',
                      mb: 2,
                      color: isDark ? '#ffffff' : '#0a0f2d',
                    }}
                  >
                    {section.title}
                  </Typography>
                  <Typography
                    sx={{
                      color: isDark ? 'rgba(255,255,255,0.72)' : '#525663',
                      lineHeight: 1.75,
                      fontSize: { xs: '1rem', md: '1.08rem' },
                      maxWidth: 620,
                      mb: 3,
                    }}
                  >
                    {section.description}
                  </Typography>
                  <Stack spacing={1.35}>
                    {section.bullets.map((bullet) => (
                      <Box key={bullet} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                        <Box
                          sx={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                            mt: 0.2,
                            bgcolor: isDark ? 'rgba(247, 66, 17, 0.16)' : 'rgba(247, 66, 17, 0.1)',
                            color: INSYT_COLORS.primary,
                          }}
                        >
                          <CheckIcon sx={{ fontSize: 15 }} />
                        </Box>
                        <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.78)' : '#3a3d47', lineHeight: 1.55 }}>
                          {bullet}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </motion.div>
              </Grid>

              <Grid item xs={12} md={6}>
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: 0.08 }}
                >
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: { xs: 4, md: 5 },
                      p: { xs: 2.5, md: 3 },
                      bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(82, 86, 99, 0.12)'}`,
                      boxShadow: isDark
                        ? '0 26px 70px -44px rgba(0,0,0,0.9)'
                        : '0 22px 58px -40px rgba(10, 15, 45, 0.6)',
                    }}
                  >
                    <FeaturePreview id={section.id} isDark={isDark} />
                    {index === featureSections.length - 1 && (
                      <Button
                        component="a"
                        href="#precos"
                        endIcon={<ArrowForwardIcon />}
                        sx={{
                          mt: 3,
                          bgcolor: INSYT_COLORS.primary,
                          color: '#fff',
                          borderRadius: 999,
                          px: 2.5,
                          py: 1.15,
                          textTransform: 'none',
                          fontWeight: 800,
                          '&:hover': { bgcolor: INSYT_COLORS.primaryDark },
                        }}
                      >
                        Ver planos
                      </Button>
                    )}
                  </Card>
                </motion.div>
              </Grid>
            </Grid>
          </Container>
        </Box>
      );
    })}
  </Box>
);

export default LandingFeatures;
