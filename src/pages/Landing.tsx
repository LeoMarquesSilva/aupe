import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Chip,
  Stack,
  alpha,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Menu as MenuIcon,
  Schedule as ScheduleIcon,
  Analytics as AnalyticsIcon,
  People as PeopleIcon,
  AutoAwesome as AutoAwesomeIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  Instagram as InstagramIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  Collections as CollectionsIcon,
  TrendingUp as TrendingUpIcon,
  DataObject as DataObjectIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  CloudQueue as CloudIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import CountUp from 'react-countup';
import { subscriptionService, SubscriptionPlan } from '../services/subscriptionService';
import { supabase } from '../services/supabaseClient';

// Cores da identidade INSYT com gradientes tech
const INSYT_COLORS = {
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1E40AF',
  secondary: '#7C3AED',
  secondaryLight: '#8B5CF6',
  accent: '#06B6D4',
  accent2: '#EC4899',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  success: '#10B981',
  white: '#FFFFFF',
  // Gradientes tech
  gradientPrimary: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 50%, #EC4899 100%)',
  gradientSecondary: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
  gradientDark: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
  gradientTech: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
  gradientData: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
};

// Dados mockados para gráficos
const analyticsData = [
  { name: 'Jan', value: 4000, engagement: 2400 },
  { name: 'Fev', value: 3000, engagement: 1398 },
  { name: 'Mar', value: 5000, engagement: 3000 },
  { name: 'Abr', value: 4500, engagement: 2780 },
  { name: 'Mai', value: 6000, engagement: 3890 },
  { name: 'Jun', value: 5500, engagement: 3200 },
];

const performanceData = [
  { name: 'Seg', posts: 12, reach: 8500 },
  { name: 'Ter', posts: 15, reach: 10200 },
  { name: 'Qua', posts: 18, reach: 12800 },
  { name: 'Qui', posts: 14, reach: 9600 },
  { name: 'Sex', posts: 20, reach: 15000 },
  { name: 'Sáb', posts: 8, reach: 6200 },
  { name: 'Dom', posts: 10, reach: 7800 },
];

const Landing: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 300], [1, 0.3]);
  const scale = useTransform(scrollY, [0, 300], [1, 0.95]);

  // Buscar planos reais do banco
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const dbPlans = await subscriptionService.getAllPlans();
        
        // Mapear planos do banco para formato da UI
        const mappedPlans = dbPlans
          .filter(plan => plan.active && plan.stripe_price_id) // Apenas planos ativos com Stripe configurado
          .map((plan, index) => {
            // Formatar preço (amount está em centavos)
            const priceInReais = (plan.amount / 100).toFixed(2);
            const priceFormatted = `R$ ${priceInReais.replace('.', ',')}`;
            
            // Gerar features baseado nos limites do plano
            const features = [
              `Até ${plan.max_clients} contas Instagram`,
              `${plan.max_posts_per_month.toLocaleString('pt-BR')} posts agendados/mês`,
              `Até ${plan.max_profiles} pessoas com acesso`,
              'Analytics avançados',
              'Suporte por email',
              'Agendamento de posts e stories',
            ];

            // Adicionar features extras do JSON se existirem
            if (plan.features && typeof plan.features === 'object') {
              if (plan.features.analytics) features.push('Analytics em tempo real');
              if (plan.features.api_access) features.push('API access');
              if (plan.features.support === 'priority') features.push('Suporte prioritário');
            }

            return {
              id: plan.id,
              name: plan.name.charAt(0).toUpperCase() + plan.name.slice(1), // Capitalizar primeira letra
              price: priceFormatted,
              period: '/mês',
              description: plan.name === 'starter' ? 'Perfeito para começar' :
                          plan.name === 'professional' ? 'Para profissionais e agências' :
                          plan.name === 'business' ? 'Para empresas em crescimento' : 'Plano completo',
              features,
              popular: plan.name === 'professional', // Professional é o mais popular
              gradient: plan.name === 'starter' 
                ? 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)'
                : plan.name === 'professional'
                ? INSYT_COLORS.gradientPrimary
                : 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
            };
          })
          .sort((a, b) => {
            // Ordenar: Starter, Professional, Business
            const order: { [key: string]: number } = { 'Starter': 1, 'Professional': 2, 'Business': 3 };
            return (order[a.name] || 99) - (order[b.name] || 99);
          });

        setPlans(mappedPlans);
      } catch (error) {
        console.error('❌ Erro ao carregar planos:', error);
        // Fallback para planos padrão em caso de erro
        setPlans([
          {
            id: 'fallback-starter',
            name: 'Starter',
            price: 'R$ 87,90',
            period: '/mês',
            description: 'Perfeito para começar',
            features: ['Até 3 contas Instagram', '900 posts agendados/mês', 'Analytics básicos', 'Suporte por email'],
            popular: false,
            gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
          },
        ]);
      } finally {
        setLoadingPlans(false);
      }
    };

    loadPlans();
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleGetStarted = async (planId?: string) => {
    // Verificar se usuário está logado
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Se não estiver logado, redirecionar para CADASTRO (não login)
      // Passar planId na URL para o cadastro
      if (planId) {
        navigate(`/signup?plan=${planId}`);
      } else {
        navigate('/signup');
      }
      return;
    }

    // Se estiver logado e tiver planId, ir direto para checkout
    if (planId) {
      navigate(`/checkout?plan=${planId}`);
    } else {
      // Se não tiver planId, ir para dashboard ou home
      navigate('/');
    }
  };

  // Wrapper para botões genéricos (sem planId)
  const handleGetStartedGeneric = async () => {
    await handleGetStarted();
  };

  const features = [
    {
      icon: <DataObjectIcon sx={{ fontSize: 48 }} />,
      title: 'Inteligência de Dados',
      description: 'Analytics avançados com machine learning para otimizar cada post. Decisões baseadas em dados reais, não em suposições.',
      gradient: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
    },
    {
      icon: <SpeedIcon sx={{ fontSize: 48 }} />,
      title: 'Automação Inteligente',
      description: 'Sistema de agendamento 24/7 com retry automático e cache inteligente. Publicação garantida no horário exato.',
      gradient: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
    },
    {
      icon: <AnalyticsIcon sx={{ fontSize: 48 }} />,
      title: 'Analytics em Tempo Real',
      description: 'Métricas detalhadas de alcance, engajamento, conversão e ROI. Dashboards interativos com visualizações avançadas.',
      gradient: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 48 }} />,
      title: 'Infraestrutura Robusta',
      description: 'Arquitetura escalável com Supabase, N8N e APIs oficiais. Segurança e confiabilidade enterprise-grade.',
      gradient: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
    },
  ];

  const stats = [
    { value: 100, suffix: '%', label: 'Automação', icon: <AutoAwesomeIcon /> },
    { value: 24, suffix: '/7', label: 'Disponibilidade', icon: <CloudIcon /> },
    { value: 1000, suffix: '+', label: 'Posts Agendados', icon: <ScheduleIcon /> },
    { value: 99, suffix: '.9%', label: 'Uptime', icon: <SecurityIcon /> },
  ];

  const postTypes = [
    { icon: <ImageIcon />, name: 'Posts', color: INSYT_COLORS.primary, gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)' },
    { icon: <CollectionsIcon />, name: 'Carrosséis', color: INSYT_COLORS.secondary, gradient: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)' },
    { icon: <VideoIcon />, name: 'Reels', color: INSYT_COLORS.success, gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)' },
    { icon: <InstagramIcon />, name: 'Stories', color: '#E1306C', gradient: 'linear-gradient(135deg, #E1306C 0%, #F56040 100%)' },
  ];

  // Planos agora são carregados do banco via useEffect acima

  const faqs = [
    {
      question: 'O que é o INSYT?',
      answer: 'INSYT é uma plataforma completa de agendamento e analytics para Instagram. Com tecnologia de ponta, oferecemos automação inteligente, análise de dados em tempo real e gestão multi-cliente para transformar sua presença nas redes sociais.',
    },
    {
      question: 'Como funciona o agendamento?',
      answer: 'O INSYT utiliza integração direta com a Instagram Graph API através de automação N8N. Você agenda seus posts, carrosséis, reels ou stories com data e hora, e nossa plataforma publica automaticamente no horário exato, 24/7.',
    },
    {
      question: 'Quais tipos de conteúdo posso agendar?',
      answer: 'Você pode agendar posts simples (1 imagem), carrosséis (2-10 imagens), reels (vídeos) e stories. Todos os tipos de conteúdo são suportados com a mesma facilidade e precisão.',
    },
    {
      question: 'Os dados são seguros?',
      answer: 'Sim! Utilizamos Supabase (PostgreSQL) com criptografia de ponta a ponta, autenticação segura e infraestrutura enterprise-grade. Seus dados e tokens do Instagram são protegidos com os mais altos padrões de segurança.',
    },
    {
      question: 'Posso gerenciar múltiplas contas?',
      answer: 'Sim! O INSYT foi desenvolvido para gestão multi-cliente. Você pode gerenciar múltiplas contas Instagram em um só lugar, cada uma com seu próprio dashboard, analytics e configurações.',
    },
    {
      question: 'Como funcionam os analytics?',
      answer: 'Nossos analytics são atualizados em tempo real através da Instagram Graph API. Você tem acesso a métricas detalhadas de alcance, engajamento, likes, comentários, salvamentos e muito mais, com visualizações interativas e relatórios personalizados.',
    },
    {
      question: 'Posso cancelar a qualquer momento?',
      answer: 'Sim! Você pode cancelar sua assinatura a qualquer momento sem taxas ou multas. Seu acesso permanece ativo até o final do período pago.',
    },
    {
      question: 'Há limite de posts agendados?',
      answer: 'Depende do plano. O plano Starter permite 50 posts/mês, Professional e Enterprise têm posts ilimitados. Todos os planos permitem agendamento com semanas ou meses de antecedência.',
    },
  ];

  return (
    <Box
      sx={{
        bgcolor: '#0F172A',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
        '& *': {
          fontFamily: 'inherit',
        },
      }}
    >
      {/* Background Tech Pattern */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 50%, rgba(37, 99, 235, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(124, 58, 237, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 20%, rgba(236, 72, 153, 0.1) 0%, transparent 50%),
            #0F172A
          `,
          zIndex: 0,
        }}
      />

      {/* Grid Pattern Overlay */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(rgba(37, 99, 235, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37, 99, 235, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          zIndex: 0,
        }}
      />

      {/* Content */}
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header/Navbar */}
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            bgcolor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(20px)',
            borderBottom: `1px solid ${alpha(INSYT_COLORS.primary, 0.2)}`,
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', py: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  background: INSYT_COLORS.gradientPrimary,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    fontSize: '1.5rem',
                  }}
                >
                  INSYT
                </Typography>
              </Box>
            </Box>

            {!isMobile && (
              <Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <Button
                color="inherit"
                onClick={() => {
                  const element = document.getElementById('features');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                sx={{
                  color: INSYT_COLORS.gray300,
                  fontWeight: 500,
                  '&:hover': { color: INSYT_COLORS.primaryLight },
                }}
              >
                Funcionalidades
              </Button>
              <Button
                color="inherit"
                onClick={() => {
                  const element = document.getElementById('precos');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                sx={{
                  color: INSYT_COLORS.gray300,
                  fontWeight: 500,
                  '&:hover': { color: INSYT_COLORS.primaryLight },
                }}
              >
                Preços
              </Button>
              <Button
                color="inherit"
                onClick={() => {
                  const element = document.getElementById('faq');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                sx={{
                  color: INSYT_COLORS.gray300,
                  fontWeight: 500,
                  '&:hover': { color: INSYT_COLORS.primaryLight },
                }}
              >
                FAQ
              </Button>
                <Button
                  variant="contained"
                  onClick={handleGetStartedGeneric}
                  sx={{
                    background: INSYT_COLORS.gradientPrimary,
                    color: INSYT_COLORS.white,
                    px: 3,
                    py: 1,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    boxShadow: `0 4px 14px ${alpha(INSYT_COLORS.primary, 0.4)}`,
                    '&:hover': {
                      background: INSYT_COLORS.gradientPrimary,
                      transform: 'translateY(-2px)',
                      boxShadow: `0 6px 20px ${alpha(INSYT_COLORS.primary, 0.5)}`,
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Começar Agora
                </Button>
              </Box>
            )}

            {isMobile && (
              <IconButton onClick={handleDrawerToggle} sx={{ color: INSYT_COLORS.gray300 }}>
                <MenuIcon />
              </IconButton>
            )}
          </Toolbar>
        </AppBar>

        {/* Mobile Drawer */}
        <Drawer
          anchor="right"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          sx={{
            '& .MuiDrawer-paper': {
              width: 280,
              pt: 8,
              bgcolor: INSYT_COLORS.gray900,
              borderLeft: `1px solid ${alpha(INSYT_COLORS.primary, 0.2)}`,
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <List>
              <ListItem>
                <ListItemButton
                  onClick={() => {
                    setMobileOpen(false);
                    setTimeout(() => {
                      const element = document.getElementById('features');
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                >
                  <ListItemText primary="Funcionalidades" sx={{ color: INSYT_COLORS.gray300 }} />
                </ListItemButton>
              </ListItem>
              <ListItem>
                <ListItemButton
                  onClick={() => {
                    setMobileOpen(false);
                    setTimeout(() => {
                      const element = document.getElementById('precos');
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                >
                  <ListItemText primary="Preços" sx={{ color: INSYT_COLORS.gray300 }} />
                </ListItemButton>
              </ListItem>
              <ListItem>
                <ListItemButton
                  onClick={() => {
                    setMobileOpen(false);
                    setTimeout(() => {
                      const element = document.getElementById('faq');
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                >
                  <ListItemText primary="FAQ" sx={{ color: INSYT_COLORS.gray300 }} />
                </ListItemButton>
              </ListItem>
              <Divider sx={{ my: 2, bgcolor: alpha(INSYT_COLORS.primary, 0.2) }} />
              <ListItem>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleGetStartedGeneric}
                  sx={{
                    background: INSYT_COLORS.gradientPrimary,
                    color: INSYT_COLORS.white,
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Começar Agora
                </Button>
              </ListItem>
            </List>
          </Box>
        </Drawer>

        {/* Hero Section */}
        <Box
          component="section"
          sx={{
            pt: { xs: 18, md: 24 },
            pb: { xs: 12, md: 16 },
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Container maxWidth="lg">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Box sx={{ textAlign: 'center', maxWidth: '900px', mx: 'auto' }}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <Chip
                    label="Tecnologia & Dados"
                    sx={{
                      background: alpha(INSYT_COLORS.primary, 0.2),
                      color: INSYT_COLORS.primaryLight,
                      mb: 4,
                      fontWeight: 600,
                      border: `1px solid ${alpha(INSYT_COLORS.primary, 0.3)}`,
                      fontSize: '0.875rem',
                      py: 2.5,
                    }}
                    icon={<CodeIcon sx={{ color: INSYT_COLORS.primaryLight }} />}
                  />
                </motion.div>

                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '3rem', md: '5.5rem' },
                    fontWeight: 900,
                    mb: 3,
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      background: INSYT_COLORS.gradientPrimary,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      display: 'block',
                      mb: 1,
                    }}
                  >
                    INSYT
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      color: INSYT_COLORS.gray100,
                      display: 'block',
                    }}
                  >
                    Inteligência para o Instagram
                  </Box>
                </Typography>

                <Typography
                  variant="h5"
                  sx={{
                    color: INSYT_COLORS.gray400,
                    mb: 5,
                    fontWeight: 400,
                    maxWidth: '700px',
                    mx: 'auto',
                    lineHeight: 1.6,
                  }}
                >
                  Plataforma de agendamento e analytics baseada em dados. 
                  <Box component="span" sx={{ color: INSYT_COLORS.primaryLight }}>
                    {' '}Automação inteligente{' '}
                  </Box>
                  que transforma sua presença no Instagram.
                </Typography>

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={3}
                  justifyContent="center"
                  sx={{ mb: 8 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleGetStartedGeneric}
                      endIcon={<ArrowForwardIcon />}
                      sx={{
                        background: INSYT_COLORS.gradientPrimary,
                        color: INSYT_COLORS.white,
                        px: 5,
                        py: 2,
                        borderRadius: 3,
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        boxShadow: `0 8px 24px ${alpha(INSYT_COLORS.primary, 0.4)}`,
                        '&:hover': {
                          background: INSYT_COLORS.gradientPrimary,
                          transform: 'translateY(-3px)',
                          boxShadow: `0 12px 32px ${alpha(INSYT_COLORS.primary, 0.5)}`,
                        },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      Começar Grátis
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="outlined"
                      size="large"
                      sx={{
                        borderColor: alpha(INSYT_COLORS.primary, 0.5),
                        color: INSYT_COLORS.gray200,
                        px: 5,
                        py: 2,
                        borderRadius: 3,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        borderWidth: 2,
                        '&:hover': {
                          borderColor: INSYT_COLORS.primary,
                          bgcolor: alpha(INSYT_COLORS.primary, 0.1),
                          borderWidth: 2,
                        },
                      }}
                    >
                      Ver Demo
                    </Button>
                  </motion.div>
                </Stack>

                {/* Stats Grid */}
                <Grid container spacing={4} sx={{ mt: 10 }}>
                  {stats.map((stat, index) => (
                    <Grid item xs={6} md={3} key={index}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                      >
                        <Card
                          sx={{
                            background: `linear-gradient(135deg, ${alpha(INSYT_COLORS.primary, 0.1)} 0%, ${alpha(INSYT_COLORS.secondary, 0.1)} 100%)`,
                            border: `1px solid ${alpha(INSYT_COLORS.primary, 0.2)}`,
                            borderRadius: 3,
                            p: 3,
                            textAlign: 'center',
                            backdropFilter: 'blur(10px)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              borderColor: INSYT_COLORS.primary,
                              boxShadow: `0 8px 24px ${alpha(INSYT_COLORS.primary, 0.3)}`,
                            },
                          }}
                        >
                          <Box
                            sx={{
                              color: INSYT_COLORS.primaryLight,
                              mb: 1,
                              display: 'flex',
                              justifyContent: 'center',
                            }}
                          >
                            {stat.icon}
                          </Box>
                          <Typography
                            variant="h3"
                            sx={{
                              fontWeight: 800,
                              background: INSYT_COLORS.gradientPrimary,
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                              mb: 0.5,
                            }}
                          >
                            <CountUp end={stat.value} duration={2} delay={0.5 + index * 0.2} />
                            {stat.suffix}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ color: INSYT_COLORS.gray400, fontWeight: 500 }}
                          >
                            {stat.label}
                          </Typography>
                        </Card>
                      </motion.div>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </motion.div>
          </Container>
        </Box>

        {/* Analytics Preview Section */}
        <Box
          component="section"
          sx={{
            py: { xs: 10, md: 16 },
            position: 'relative',
          }}
        >
          <Container maxWidth="lg">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <Box sx={{ textAlign: 'center', mb: 8 }}>
                <Typography
                  variant="h2"
                  sx={{
                    fontSize: { xs: '2.5rem', md: '4rem' },
                    fontWeight: 900,
                    mb: 2,
                    background: INSYT_COLORS.gradientPrimary,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Analytics em Tempo Real
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ color: INSYT_COLORS.gray400, maxWidth: '600px', mx: 'auto' }}
                >
                  Visualize dados, identifique tendências e otimize sua estratégia com insights poderosos
                </Typography>
              </Box>

              <Card
                sx={{
                  background: `linear-gradient(135deg, ${alpha(INSYT_COLORS.gray900, 0.8)} 0%, ${alpha(INSYT_COLORS.gray800, 0.8)} 100%)`,
                  border: `1px solid ${alpha(INSYT_COLORS.primary, 0.3)}`,
                  borderRadius: 4,
                  p: 4,
                  backdropFilter: 'blur(20px)',
                  boxShadow: `0 20px 60px ${alpha(INSYT_COLORS.primary, 0.2)}`,
                }}
              >
                <Grid container spacing={4}>
                  <Grid item xs={12} md={8}>
                    <Typography
                      variant="h6"
                      sx={{
                        color: INSYT_COLORS.gray200,
                        mb: 3,
                        fontWeight: 600,
                      }}
                    >
                      Performance Semanal
                    </Typography>
                    <Box sx={{ height: 300, width: '100%' }}>
                      <ResponsiveContainer>
                        <AreaChart data={performanceData}>
                          <defs>
                            <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={INSYT_COLORS.primary} stopOpacity={0.8} />
                              <stop offset="95%" stopColor={INSYT_COLORS.primary} stopOpacity={0.1} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="name" stroke={INSYT_COLORS.gray400} />
                          <YAxis stroke={INSYT_COLORS.gray400} />
                          <Tooltip
                            contentStyle={{
                              background: INSYT_COLORS.gray800,
                              border: `1px solid ${alpha(INSYT_COLORS.primary, 0.3)}`,
                              borderRadius: 8,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="reach"
                            stroke={INSYT_COLORS.primary}
                            fill="url(#colorReach)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography
                      variant="h6"
                      sx={{
                        color: INSYT_COLORS.gray200,
                        mb: 3,
                        fontWeight: 600,
                      }}
                    >
                      Crescimento Mensal
                    </Typography>
                    <Box sx={{ height: 300, width: '100%' }}>
                      <ResponsiveContainer>
                        <LineChart data={analyticsData}>
                          <XAxis dataKey="name" stroke={INSYT_COLORS.gray400} />
                          <YAxis stroke={INSYT_COLORS.gray400} />
                          <Tooltip
                            contentStyle={{
                              background: INSYT_COLORS.gray800,
                              border: `1px solid ${alpha(INSYT_COLORS.primary, 0.3)}`,
                              borderRadius: 8,
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={INSYT_COLORS.secondary}
                            strokeWidth={3}
                            dot={{ fill: INSYT_COLORS.secondary, r: 4 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="engagement"
                            stroke={INSYT_COLORS.accent}
                            strokeWidth={3}
                            dot={{ fill: INSYT_COLORS.accent, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>
                </Grid>
              </Card>
            </motion.div>
          </Container>
        </Box>

        {/* Features Section */}
        <Box
          component="section"
          id="features"
          sx={{
            py: { xs: 10, md: 16 },
            position: 'relative',
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ textAlign: 'center', mb: 10 }}>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '2.5rem', md: '4rem' },
                  fontWeight: 900,
                  mb: 2,
                  background: INSYT_COLORS.gradientPrimary,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Tecnologia & Dados
              </Typography>
              <Typography
                variant="h6"
                sx={{ color: INSYT_COLORS.gray400, maxWidth: '700px', mx: 'auto' }}
              >
                Funcionalidades poderosas construídas com as melhores tecnologias do mercado
              </Typography>
            </Box>

            <Grid container spacing={4}>
              {features.map((feature, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card
                      sx={{
                        height: '100%',
                        background: `linear-gradient(135deg, ${alpha(INSYT_COLORS.gray900, 0.8)} 0%, ${alpha(INSYT_COLORS.gray800, 0.8)} 100%)`,
                        border: `1px solid ${alpha(INSYT_COLORS.primary, 0.2)}`,
                        borderRadius: 4,
                        p: 4,
                        backdropFilter: 'blur(20px)',
                        transition: 'all 0.4s ease',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '4px',
                          background: feature.gradient,
                        },
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          borderColor: INSYT_COLORS.primary,
                          boxShadow: `0 20px 40px ${alpha(INSYT_COLORS.primary, 0.3)}`,
                        },
                      }}
                    >
                      <Box
                        sx={{
                          mb: 3,
                          display: 'inline-flex',
                          p: 2,
                          borderRadius: 2,
                          background: alpha(INSYT_COLORS.primary, 0.1),
                          color: INSYT_COLORS.primaryLight,
                        }}
                      >
                        {feature.icon}
                      </Box>
                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: 800,
                          mb: 2,
                          color: INSYT_COLORS.gray100,
                        }}
                      >
                        {feature.title}
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ color: INSYT_COLORS.gray400, lineHeight: 1.8, fontSize: '1.05rem' }}
                      >
                        {feature.description}
                      </Typography>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* Pricing Section */}
        <Box
          component="section"
          id="precos"
          sx={{
            py: { xs: 10, md: 16 },
            position: 'relative',
            background: `linear-gradient(135deg, ${alpha(INSYT_COLORS.gray900, 0.5)} 0%, ${alpha(INSYT_COLORS.gray800, 0.5)} 100%)`,
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '2.5rem', md: '4rem' },
                  fontWeight: 900,
                  mb: 2,
                  background: INSYT_COLORS.gradientPrimary,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Planos & Preços
              </Typography>
              <Typography
                variant="h6"
                sx={{ color: INSYT_COLORS.gray400, maxWidth: '600px', mx: 'auto' }}
              >
                Escolha o plano ideal para suas necessidades. Todos incluem teste gratuito.
              </Typography>
            </Box>

            <Grid container spacing={4} justifyContent="center">
              {loadingPlans ? (
                <Grid item xs={12}>
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <CircularProgress sx={{ color: INSYT_COLORS.primary }} />
                    <Typography sx={{ color: INSYT_COLORS.gray400, mt: 2 }}>
                      Carregando planos...
                    </Typography>
                  </Box>
                </Grid>
              ) : plans.length === 0 ? (
                <Grid item xs={12}>
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography sx={{ color: INSYT_COLORS.gray400 }}>
                      Nenhum plano disponível no momento.
                    </Typography>
                  </Box>
                </Grid>
              ) : (
                plans.map((plan, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card
                      sx={{
                        height: '100%',
                        background: plan.popular
                          ? `linear-gradient(135deg, ${alpha(INSYT_COLORS.primary, 0.2)} 0%, ${alpha(INSYT_COLORS.secondary, 0.2)} 100%)`
                          : `linear-gradient(135deg, ${alpha(INSYT_COLORS.gray900, 0.8)} 0%, ${alpha(INSYT_COLORS.gray800, 0.8)} 100%)`,
                        border: plan.popular
                          ? `2px solid ${INSYT_COLORS.primary}`
                          : `1px solid ${alpha(INSYT_COLORS.primary, 0.2)}`,
                        borderRadius: 4,
                        p: 4,
                        backdropFilter: 'blur(20px)',
                        position: 'relative',
                        transition: 'all 0.4s ease',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: `0 20px 40px ${alpha(INSYT_COLORS.primary, 0.3)}`,
                        },
                      }}
                    >
                      {plan.popular && (
                        <Chip
                          label="Mais Popular"
                          sx={{
                            position: 'absolute',
                            top: -12,
                            right: 20,
                            background: INSYT_COLORS.gradientPrimary,
                            color: INSYT_COLORS.white,
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        />
                      )}
                      <Box sx={{ mb: 3 }}>
                        <Typography
                          variant="h4"
                          sx={{
                            fontWeight: 800,
                            mb: 1,
                            color: INSYT_COLORS.gray100,
                          }}
                        >
                          {plan.name}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: INSYT_COLORS.gray400 }}
                        >
                          {plan.description}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
                          <Typography
                            variant="h3"
                            sx={{
                              fontWeight: 900,
                              background: plan.gradient,
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }}
                          >
                            {plan.price}
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{ color: INSYT_COLORS.gray400, ml: 1 }}
                          >
                            {plan.period}
                          </Typography>
                        </Box>
                      </Box>
                      <Stack spacing={2} sx={{ mb: 4 }}>
                        {plan.features.map((feature, idx) => (
                          <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                            <CheckCircleIcon
                              sx={{
                                color: INSYT_COLORS.success,
                                fontSize: 20,
                                mt: 0.5,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              variant="body2"
                              sx={{ color: INSYT_COLORS.gray300, lineHeight: 1.6 }}
                            >
                              {feature}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                      <Button
                        fullWidth
                        variant={plan.popular ? 'contained' : 'outlined'}
                        onClick={() => handleGetStarted(plan.id)}
                        sx={{
                          background: plan.popular ? plan.gradient : 'transparent',
                          color: plan.popular ? INSYT_COLORS.white : INSYT_COLORS.primary,
                          borderColor: INSYT_COLORS.primary,
                          borderWidth: 2,
                          py: 1.5,
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: '1rem',
                          '&:hover': {
                            background: plan.popular ? plan.gradient : alpha(INSYT_COLORS.primary, 0.1),
                            borderColor: INSYT_COLORS.primary,
                            transform: 'translateY(-2px)',
                          },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        Começar Agora
                      </Button>
                    </Card>
                  </motion.div>
                </Grid>
                ))
              )}
            </Grid>
          </Container>
        </Box>

        {/* FAQ Section */}
        <Box
          component="section"
          id="faq"
          sx={{
            py: { xs: 10, md: 16 },
            position: 'relative',
          }}
        >
          <Container maxWidth="md">
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '2.5rem', md: '4rem' },
                  fontWeight: 900,
                  mb: 2,
                  background: INSYT_COLORS.gradientPrimary,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Perguntas Frequentes
              </Typography>
              <Typography
                variant="h6"
                sx={{ color: INSYT_COLORS.gray400, maxWidth: '600px', mx: 'auto' }}
              >
                Tire suas dúvidas sobre o INSYT
              </Typography>
            </Box>

            <Box>
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Accordion
                    sx={{
                      background: `linear-gradient(135deg, ${alpha(INSYT_COLORS.gray900, 0.8)} 0%, ${alpha(INSYT_COLORS.gray800, 0.8)} 100%)`,
                      border: `1px solid ${alpha(INSYT_COLORS.primary, 0.2)}`,
                      borderRadius: 2,
                      mb: 2,
                      backdropFilter: 'blur(20px)',
                      '&:before': {
                        display: 'none',
                      },
                      '&.Mui-expanded': {
                        borderColor: INSYT_COLORS.primary,
                        boxShadow: `0 8px 24px ${alpha(INSYT_COLORS.primary, 0.2)}`,
                      },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={
                        <ExpandMoreIcon sx={{ color: INSYT_COLORS.primaryLight }} />
                      }
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
                          fontSize: '1.1rem',
                        }}
                      >
                        {faq.question}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 3, pb: 3 }}>
                      <Typography
                        variant="body1"
                        sx={{
                          color: INSYT_COLORS.gray400,
                          lineHeight: 1.8,
                        }}
                      >
                        {faq.answer}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                </motion.div>
              ))}
            </Box>
          </Container>
        </Box>

        {/* Post Types Section */}
        <Box
          component="section"
          sx={{
            py: { xs: 10, md: 16 },
            position: 'relative',
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '2.5rem', md: '4rem' },
                  fontWeight: 900,
                  mb: 2,
                  background: INSYT_COLORS.gradientPrimary,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Todos os Tipos de Conteúdo
              </Typography>
              <Typography
                variant="h6"
                sx={{ color: INSYT_COLORS.gray400, maxWidth: '600px', mx: 'auto' }}
              >
                Agende qualquer tipo de conteúdo com a mesma facilidade e precisão
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {postTypes.map((type, index) => (
                <Grid item xs={6} md={3} key={index}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <Card
                      sx={{
                        textAlign: 'center',
                        p: 4,
                        background: `linear-gradient(135deg, ${alpha(INSYT_COLORS.gray900, 0.8)} 0%, ${alpha(INSYT_COLORS.gray800, 0.8)} 100%)`,
                        border: `2px solid ${alpha(INSYT_COLORS.primary, 0.2)}`,
                        borderRadius: 4,
                        backdropFilter: 'blur(20px)',
                        transition: 'all 0.4s ease',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: type.gradient,
                          opacity: 0,
                          transition: 'opacity 0.4s ease',
                        },
                        '&:hover': {
                          borderColor: type.color,
                          transform: 'translateY(-8px)',
                          boxShadow: `0 16px 32px ${alpha(type.color, 0.4)}`,
                          '&::before': {
                            opacity: 0.1,
                          },
                        },
                      }}
                    >
                      <Box
                        sx={{
                          color: type.color,
                          mb: 2,
                          position: 'relative',
                          zIndex: 1,
                          '& svg': { fontSize: 56 },
                        }}
                      >
                        {type.icon}
                      </Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: INSYT_COLORS.gray100,
                          position: 'relative',
                          zIndex: 1,
                        }}
                      >
                        {type.name}
                      </Typography>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* CTA Section */}
        <Box
          component="section"
          sx={{
            py: { xs: 12, md: 20 },
            position: 'relative',
            background: INSYT_COLORS.gradientPrimary,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `
                radial-gradient(circle at 30% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 70% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)
              `,
            }}
          />
          <Container maxWidth="md">
            <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '2.5rem', md: '4.5rem' },
                  fontWeight: 900,
                  mb: 3,
                  color: INSYT_COLORS.white,
                }}
              >
                Pronto para transformar seu Instagram?
              </Typography>
              <Typography
                variant="h5"
                sx={{ mb: 6, color: alpha(INSYT_COLORS.white, 0.9), fontWeight: 400 }}
              >
                Comece hoje e veja a diferença que a automação inteligente faz
              </Typography>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleGetStartedGeneric}
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    bgcolor: INSYT_COLORS.white,
                    color: INSYT_COLORS.primary,
                    px: 6,
                    py: 2.5,
                    borderRadius: 3,
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '1.2rem',
                    boxShadow: `0 12px 32px ${alpha('#000', 0.3)}`,
                    '&:hover': {
                      bgcolor: INSYT_COLORS.gray100,
                      transform: 'translateY(-3px)',
                      boxShadow: `0 16px 40px ${alpha('#000', 0.4)}`,
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Começar Agora - É Grátis
                </Button>
              </motion.div>
            </Box>
          </Container>
        </Box>

        {/* Footer */}
        <Box
          component="footer"
          sx={{
            py: 6,
            bgcolor: INSYT_COLORS.gray900,
            borderTop: `1px solid ${alpha(INSYT_COLORS.primary, 0.2)}`,
          }}
        >
          <Container maxWidth="lg">
            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    mb: 2,
                    background: INSYT_COLORS.gradientPrimary,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    letterSpacing: '0.1em',
                  }}
                >
                  INSYT
                </Typography>
                <Typography variant="body2" sx={{ color: INSYT_COLORS.gray400, lineHeight: 1.7 }}>
                  Sua inteligência para o Instagram. Agende, analise e cresça de forma inteligente com tecnologia de ponta.
                </Typography>
              </Grid>
              <Grid item xs={12} md={8}>
                <Grid container spacing={4}>
                  <Grid item xs={6} md={3}>
                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 2, color: INSYT_COLORS.gray200, fontWeight: 700 }}
                    >
                      Produto
                    </Typography>
                    <Stack spacing={1}>
                      <Typography
                        variant="body2"
                        onClick={() => {
                          const element = document.getElementById('features');
                          element?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        sx={{
                          color: INSYT_COLORS.gray400,
                          cursor: 'pointer',
                          '&:hover': { color: INSYT_COLORS.primaryLight },
                        }}
                      >
                        Funcionalidades
                      </Typography>
                      <Typography
                        variant="body2"
                        onClick={() => {
                          const element = document.getElementById('precos');
                          element?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        sx={{
                          color: INSYT_COLORS.gray400,
                          cursor: 'pointer',
                          '&:hover': { color: INSYT_COLORS.primaryLight },
                        }}
                      >
                        Preços
                      </Typography>
                    </Stack>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 2, color: INSYT_COLORS.gray200, fontWeight: 700 }}
                    >
                      Empresa
                    </Typography>
                    <Stack spacing={1}>
                      <Typography
                        variant="body2"
                        onClick={() => {
                          const element = document.getElementById('faq');
                          element?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        sx={{
                          color: INSYT_COLORS.gray400,
                          cursor: 'pointer',
                          '&:hover': { color: INSYT_COLORS.primaryLight },
                        }}
                      >
                        FAQ
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: INSYT_COLORS.gray400,
                          cursor: 'pointer',
                          '&:hover': { color: INSYT_COLORS.primaryLight },
                        }}
                      >
                        Contato
                      </Typography>
                    </Stack>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 2, color: INSYT_COLORS.gray200, fontWeight: 700 }}
                    >
                      Legal
                    </Typography>
                    <Stack spacing={1}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: INSYT_COLORS.gray400,
                          cursor: 'pointer',
                          '&:hover': { color: INSYT_COLORS.primaryLight },
                        }}
                      >
                        Privacidade
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: INSYT_COLORS.gray400,
                          cursor: 'pointer',
                          '&:hover': { color: INSYT_COLORS.primaryLight },
                        }}
                      >
                        Termos
                      </Typography>
                    </Stack>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            <Divider sx={{ my: 4, bgcolor: alpha(INSYT_COLORS.primary, 0.2) }} />
            <Typography
              variant="body2"
              sx={{ textAlign: 'center', color: INSYT_COLORS.gray500 }}
            >
              © 2025 INSYT. Todos os direitos reservados. Tecnologia & Dados.
            </Typography>
          </Container>
        </Box>
      </Box>
    </Box>
  );
};

export default Landing;
