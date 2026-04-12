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
    title: 'Agendamento automático no Instagram',
    description:
      'Agende post, carrossel, reels e stories em uma operação única. O sistema dispara no horário programado e acompanha o status até a publicação.',
    gradient: `linear-gradient(135deg, ${GLASS.accent.orange} 0%, #06B6D4 100%)`,
  },
  {
    icon: React.createElement(SpeedIcon, { sx: icon48 }),
    title: 'Aprovação interna e aprovação do cliente',
    description:
      'Centralize revisão do time e aprovação externa no mesmo fluxo. Gere links com validade para gestor e cliente, com histórico de aprovações e pedidos de ajuste.',
    gradient: `linear-gradient(135deg, ${GLASS.accent.orangeDark} 0%, ${GLASS.accent.orangeLight} 100%)`,
  },
  {
    icon: React.createElement(AnalyticsIcon, { sx: icon48 }),
    title: 'Dashboard compartilhável por link',
    description:
      'Compartilhe métricas com o cliente sem criar usuário. Links temporários podem ser revogados a qualquer momento e mostram apenas dados do dashboard.',
    gradient: `linear-gradient(135deg, #06B6D4 0%, ${GLASS.accent.orange} 100%)`,
  },
  {
    icon: React.createElement(SecurityIcon, { sx: icon48 }),
    title: 'Operação multi-conta com governança',
    description:
      'Gerencie múltiplos clientes com previsibilidade: calendário, aprovação e publicação no mesmo sistema, com regras de acesso e rastreabilidade por organização.',
    gradient: `linear-gradient(135deg, ${GLASS.accent.orange} 0%, #06B6D4 100%)`,
  },
];

export const stats = [
  { value: 4, suffix: '', label: 'Formatos de conteúdo', icon: React.createElement(AutoAwesomeIcon) },
  { value: 2, suffix: '', label: 'Níveis de aprovação', icon: React.createElement(SecurityIcon) },
  { value: 1, suffix: '', label: 'Fluxo único de operação', icon: React.createElement(ScheduleIcon) },
  { value: 24, suffix: '/7', label: 'Motor de agendamento', icon: React.createElement(CloudIcon) },
];

export const postTypes = [
  {
    icon: React.createElement(ImageIcon),
    name: 'Post',
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
      'INSYT é uma plataforma para operação de conteúdo no Instagram. Você agenda publicações, controla aprovação interna e do cliente e compartilha dashboard por link em um único fluxo.',
  },
  {
    question: 'Como funciona o agendamento?',
    answer:
      'Você define cliente, formato, legenda e horário. O sistema envia o conteúdo para a fila de publicação e executa automaticamente no Instagram, com acompanhamento de status em cada etapa.',
  },
  {
    question: 'Quais tipos de conteúdo posso agendar?',
    answer:
      'A plataforma suporta post, carrossel, reels e stories. Todos os formatos entram no mesmo calendário e seguem o mesmo fluxo de aprovação e agendamento.',
  },
  {
    question: 'Como funciona a aprovação de conteúdo?',
    answer:
      'Você pode revisar internamente com o gestor e, depois, enviar para aprovação do cliente. Cada etapa usa links com token e validade, permitindo aprovar ou solicitar ajustes sem login adicional.',
  },
  {
    question: 'Posso compartilhar métricas com o cliente?',
    answer:
      'Sim. O sistema gera links de dashboard somente leitura para o cliente acompanhar desempenho. Esses links têm expiração e podem ser revogados pelo time quando necessário.',
  },
  {
    question: 'Posso gerenciar múltiplas contas?',
    answer:
      'Sim. O INSYT foi projetado para operação multi-cliente, com organização por conta, histórico de conteúdo, aprovações e visão centralizada de links ativos.',
  },
  {
    question: 'Os dados e links são seguros?',
    answer:
      'Os links de aprovação e dashboard usam token aleatório e validade definida. O compartilhamento expõe apenas dados necessários para visualização e pode ser revogado a qualquer momento.',
  },
  {
    question: 'Há limite de posts agendados?',
    answer:
      'O limite depende do plano contratado. A capacidade mensal e os recursos disponíveis aparecem na seção de planos para facilitar a escolha da operação ideal.',
  },
];
