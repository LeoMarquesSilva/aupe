import React from 'react';
import {
  Schedule as ScheduleIcon,
  Analytics as AnalyticsIcon,
  AutoAwesome as AutoAwesomeIcon,
  Instagram as InstagramIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  Collections as CollectionsIcon,
  DataObject as DataObjectIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  CloudQueue as CloudIcon,
} from '@mui/icons-material';
import { GLASS } from '../../theme/glassTokens';

const icon48 = { fontSize: 48 };

export const INSYT_COLORS = {
  primary: GLASS.accent.orange,
  primaryLight: GLASS.accent.orangeLight,
  primaryDark: GLASS.accent.orangeDark,
  secondary: '#06B6D4',
  secondaryLight: '#22d3ee',
  accent: '#06B6D4',
  accent2: GLASS.accent.orangeLight,
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
  gradientPrimary: `linear-gradient(135deg, ${GLASS.accent.orange} 0%, ${GLASS.accent.orangeDark} 50%, #8c2d0d 100%)`,
  gradientSecondary: `linear-gradient(135deg, #06B6D4 0%, ${GLASS.accent.orange} 100%)`,
  gradientDark: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
  gradientTech: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
  gradientData: `linear-gradient(135deg, ${GLASS.accent.orange} 0%, ${GLASS.accent.orangeDark} 100%)`,
};

export const analyticsData = [
  { name: 'Jan', value: 4000, engagement: 2400 },
  { name: 'Fev', value: 3000, engagement: 1398 },
  { name: 'Mar', value: 5000, engagement: 3000 },
  { name: 'Abr', value: 4500, engagement: 2780 },
  { name: 'Mai', value: 6000, engagement: 3890 },
  { name: 'Jun', value: 5500, engagement: 3200 },
];

export const performanceData = [
  { name: 'Seg', posts: 12, reach: 8500 },
  { name: 'Ter', posts: 15, reach: 10200 },
  { name: 'Qua', posts: 18, reach: 12800 },
  { name: 'Qui', posts: 14, reach: 9600 },
  { name: 'Sex', posts: 20, reach: 15000 },
  { name: 'Sáb', posts: 8, reach: 6200 },
  { name: 'Dom', posts: 10, reach: 7800 },
];

export const features = [
  {
    icon: React.createElement(DataObjectIcon, { sx: icon48 }),
    title: 'Inteligência de Dados',
    description:
      'Analytics avançados com machine learning para otimizar cada post. Decisões baseadas em dados reais, não em suposições.',
    gradient: `linear-gradient(135deg, ${GLASS.accent.orange} 0%, #06B6D4 100%)`,
  },
  {
    icon: React.createElement(SpeedIcon, { sx: icon48 }),
    title: 'Automação Inteligente',
    description:
      'Sistema de agendamento 24/7 com retry automático e cache inteligente. Publicação garantida no horário exato.',
    gradient: `linear-gradient(135deg, ${GLASS.accent.orangeDark} 0%, ${GLASS.accent.orangeLight} 100%)`,
  },
  {
    icon: React.createElement(AnalyticsIcon, { sx: icon48 }),
    title: 'Analytics em Tempo Real',
    description:
      'Métricas detalhadas de alcance, engajamento, conversão e ROI. Dashboards interativos com visualizações avançadas.',
    gradient: `linear-gradient(135deg, #06B6D4 0%, ${GLASS.accent.orange} 100%)`,
  },
  {
    icon: React.createElement(SecurityIcon, { sx: icon48 }),
    title: 'Infraestrutura Robusta',
    description:
      'Arquitetura escalável com Supabase, N8N e APIs oficiais. Segurança e confiabilidade enterprise-grade.',
    gradient: `linear-gradient(135deg, ${GLASS.accent.orange} 0%, #06B6D4 100%)`,
  },
];

export const stats = [
  { value: 100, suffix: '%', label: 'Automação', icon: React.createElement(AutoAwesomeIcon) },
  { value: 24, suffix: '/7', label: 'Disponibilidade', icon: React.createElement(CloudIcon) },
  { value: 1000, suffix: '+', label: 'Posts Agendados', icon: React.createElement(ScheduleIcon) },
  { value: 99, suffix: '.9%', label: 'Uptime', icon: React.createElement(SecurityIcon) },
];

export const postTypes = [
  {
    icon: React.createElement(ImageIcon),
    name: 'Posts',
    color: GLASS.accent.orange,
    gradient: `linear-gradient(135deg, ${GLASS.accent.orange} 0%, ${GLASS.accent.orangeLight} 100%)`,
  },
  {
    icon: React.createElement(CollectionsIcon),
    name: 'Carrosséis',
    color: '#06B6D4',
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #22d3ee 100%)',
  },
  {
    icon: React.createElement(VideoIcon),
    name: 'Reels',
    color: GLASS.accent.orangeLight,
    gradient: `linear-gradient(135deg, ${GLASS.accent.orangeDark} 0%, ${GLASS.accent.orangeLight} 100%)`,
  },
  {
    icon: React.createElement(InstagramIcon),
    name: 'Stories',
    color: '#0f766e',
    gradient: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
  },
];

export const faqs = [
  {
    question: 'O que é o INSYT?',
    answer:
      'INSYT é uma plataforma completa de agendamento e analytics para Instagram. Com tecnologia de ponta, oferecemos automação inteligente, análise de dados em tempo real e gestão multi-cliente para transformar sua presença nas redes sociais.',
  },
  {
    question: 'Como funciona o agendamento?',
    answer:
      'O INSYT utiliza integração direta com a Instagram Graph API através de automação N8N. Você agenda seus posts, carrosséis, reels ou stories com data e hora, e nossa plataforma publica automaticamente no horário exato, 24/7.',
  },
  {
    question: 'Quais tipos de conteúdo posso agendar?',
    answer:
      'Você pode agendar posts simples (1 imagem), carrosséis (2-10 imagens), reels (vídeos) e stories. Todos os tipos de conteúdo são suportados com a mesma facilidade e precisão.',
  },
  {
    question: 'Os dados são seguros?',
    answer:
      'Sim! Utilizamos Supabase (PostgreSQL) com criptografia de ponta a ponta, autenticação segura e infraestrutura enterprise-grade. Seus dados e tokens do Instagram são protegidos com os mais altos padrões de segurança.',
  },
  {
    question: 'Posso gerenciar múltiplas contas?',
    answer:
      'Sim! O INSYT foi desenvolvido para gestão multi-cliente. Você pode gerenciar múltiplas contas Instagram em um só lugar, cada uma com seu próprio dashboard, analytics e configurações.',
  },
  {
    question: 'Como funcionam os analytics?',
    answer:
      'Nossos analytics são atualizados em tempo real através da Instagram Graph API. Você tem acesso a métricas detalhadas de alcance, engajamento, likes, comentários, salvamentos e muito mais, com visualizações interativas e relatórios personalizados.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer:
      'Sim! Você pode cancelar sua assinatura a qualquer momento sem taxas ou multas. Seu acesso permanece ativo até o final do período pago.',
  },
  {
    question: 'Há limite de posts agendados?',
    answer:
      'Depende do plano. O plano Starter permite 50 posts/mês, Professional e Enterprise têm posts ilimitados. Todos os planos permitem agendamento com semanas ou meses de antecedência.',
  },
];
