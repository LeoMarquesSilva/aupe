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
  Security as SecurityIcon,
  CloudQueue as CloudIcon,
  Approval as ApprovalIcon,
  CalendarMonth as CalendarIcon,
  InsertLink as LinkIcon,
  Groups as GroupsIcon,
  Bolt as BoltIcon,
  TaskAlt as TaskIcon,
  Paid as PaidIcon,
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
  { name: 'Jan', value: 42, engagement: 24 },
  { name: 'Fev', value: 58, engagement: 31 },
  { name: 'Mar', value: 74, engagement: 45 },
  { name: 'Abr', value: 88, engagement: 53 },
  { name: 'Mai', value: 116, engagement: 69 },
  { name: 'Jun', value: 132, engagement: 82 },
];

export const performanceData = [
  { name: 'Seg', posts: 12, reach: 36 },
  { name: 'Ter', posts: 15, reach: 52 },
  { name: 'Qua', posts: 18, reach: 68 },
  { name: 'Qui', posts: 14, reach: 64 },
  { name: 'Sex', posts: 20, reach: 91 },
  { name: 'Sáb', posts: 8, reach: 44 },
  { name: 'Dom', posts: 10, reach: 57 },
];

export const trustSignals = [
  'Teste grátis por 3 dias',
  'Links de aprovação com validade',
  'Instagram Graph API',
  'Planos para multi-conta',
];

export const agencyPains = [
  {
    label: 'Antes',
    title: 'Aprovação espalhada em conversas',
    description: 'Cliente aprova no WhatsApp, gestor comenta em outro canal e o time perde o histórico do que foi combinado.',
  },
  {
    label: 'Depois',
    title: 'Fluxo com rastreabilidade',
    description: 'Cada peça passa por revisão interna, aprovação do cliente e status de publicação dentro da mesma operação.',
  },
  {
    label: 'Resultado',
    title: 'Mais contas sem perder controle',
    description: 'A agência ganha uma rotina previsível para calendário, formatos, links externos e dashboards compartilháveis.',
  },
];

export const features = [
  {
    icon: React.createElement(CalendarIcon, { sx: icon48 }),
    eyebrow: 'Calendário operacional',
    title: 'Agendamento no Instagram sem planilha paralela',
    description:
      'Planeje post, carrossel, reels e stories por cliente. O time acompanha status, horário, formato e fila de publicação em uma visão única.',
    gradient: `linear-gradient(135deg, ${GLASS.accent.orange} 0%, #06B6D4 100%)`,
  },
  {
    icon: React.createElement(ApprovalIcon, { sx: icon48 }),
    eyebrow: 'Aprovação dupla',
    title: 'Revisão do time e aprovação do cliente no mesmo fluxo',
    description:
      'Gere links com token e validade para aprovar, reprovar ou solicitar ajustes sem criar usuário extra para cada cliente.',
    gradient: `linear-gradient(135deg, ${GLASS.accent.orangeDark} 0%, ${GLASS.accent.orangeLight} 100%)`,
  },
  {
    icon: React.createElement(AnalyticsIcon, { sx: icon48 }),
    eyebrow: 'Relatório compartilhável',
    title: 'Dashboard por link para reduzir cobrança manual',
    description:
      'Compartilhe métricas com leitura controlada, sem convidar o cliente para a operação interna da agência.',
    gradient: `linear-gradient(135deg, #06B6D4 0%, ${GLASS.accent.orange} 100%)`,
  },
  {
    icon: React.createElement(GroupsIcon, { sx: icon48 }),
    eyebrow: 'Governança multi-conta',
    title: 'Clientes, acessos e histórico em uma base organizada',
    description:
      'Organize múltiplas contas de Instagram por organização, com limites por plano, permissões e histórico de decisões.',
    gradient: `linear-gradient(135deg, ${GLASS.accent.orange} 0%, #06B6D4 100%)`,
  },
];

export const stats = [
  { value: 3, suffix: ' dias', label: 'de teste grátis', icon: React.createElement(BoltIcon) },
  { value: 4, suffix: '', label: 'formatos de conteúdo', icon: React.createElement(AutoAwesomeIcon) },
  { value: 2, suffix: '', label: 'camadas de aprovação', icon: React.createElement(SecurityIcon) },
  { value: 24, suffix: '/7', label: 'fila de agendamento', icon: React.createElement(CloudIcon) },
];

export const workflowSteps = [
  {
    icon: React.createElement(ScheduleIcon),
    title: 'Planejar',
    description: 'Monte calendário por cliente, formato e data.',
  },
  {
    icon: React.createElement(ApprovalIcon),
    title: 'Aprovar',
    description: 'Envie links para revisão interna e cliente.',
  },
  {
    icon: React.createElement(DataObjectIcon),
    title: 'Publicar',
    description: 'Acompanhe status até a postagem no Instagram.',
  },
  {
    icon: React.createElement(LinkIcon),
    title: 'Reportar',
    description: 'Compartilhe métricas por link controlado.',
  },
];

export const productHighlights = [
  { label: 'Hoje', value: '18 peças', detail: 'aguardando aprovação' },
  { label: 'Fila', value: '42 posts', detail: 'agendados no mês' },
  { label: 'Clientes', value: '9 contas', detail: 'com links ativos' },
  { label: 'Trial', value: '3 dias', detail: 'para testar o fluxo' },
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

export const featureSections = [
  {
    id: 'agendamento',
    eyebrow: 'Agendamento de postagens',
    title: 'Planeje Reels, carrosséis, stories e posts no mesmo calendário',
    description:
      'Organize a produção do mês por cliente, formato e data. Cada conteúdo fica com status claro para o time acompanhar o que está em rascunho, aprovado, agendado ou publicado.',
    bullets: [
      'Calendário para post, carrossel, reels e stories',
      'Fila de publicação com status por conteúdo',
      'Organização por cliente e conta de Instagram',
      'Visão simples para prever volume e rotina do mês',
    ],
    visualTitle: 'Calendário editorial',
    visualItems: ['Reels', 'Carrossel', 'Story', 'Post'],
    tone: 'light',
  },
  {
    id: 'aprovacao',
    eyebrow: 'Aprovação de post',
    title: 'Aprovação interna e envio ao cliente sem perder histórico',
    description:
      'Centralize a revisão do time e depois envie o conteúdo para aprovação do cliente por link. O fluxo reduz conversas soltas e deixa claro o que foi aprovado, reprovado ou solicitado para ajuste.',
    bullets: [
      'Revisão interna antes de enviar ao cliente',
      'Link de aprovação com token e validade',
      'Aprovar, reprovar ou pedir ajuste sem login extra',
      'Histórico de decisões para reduzir ruído operacional',
    ],
    visualTitle: 'Fluxo de aprovação',
    visualItems: ['Revisão interna', 'Link para cliente', 'Ajustes', 'Aprovado'],
    tone: 'warm',
  },
  {
    id: 'dashboard-cliente',
    eyebrow: 'Dashboard do cliente',
    title: 'Dados do cliente em tempo real para envio e visualização',
    description:
      'Compartilhe um dashboard de leitura com o cliente para acompanhar resultados sem expor a área interna da agência. O link facilita prestação de contas e reduz cobranças manuais por relatório.',
    bullets: [
      'Dashboard compartilhável por link',
      'Visualização somente leitura para o cliente',
      'Dados atualizados para acompanhamento da operação',
      'Links com controle de acesso e possibilidade de revogação',
    ],
    visualTitle: 'Dashboard compartilhável',
    visualItems: ['Alcance', 'Engajamento', 'Posts', 'Link ativo'],
    tone: 'navy',
  },
];

export const faqs = [
  {
    question: 'Para quem o INSYT foi criado?',
    answer:
      'Para agências, gestores de social media e times que operam múltiplas contas de Instagram e precisam organizar planejamento, aprovação, publicação e métricas em um fluxo profissional.',
  },
  {
    question: 'Como funciona o teste grátis de 3 dias?',
    answer:
      'Você escolhe um plano self-service, cria a conta e entra no checkout com trial de 3 dias. Durante o trial, a assinatura fica como teste no sistema e você pode validar a operação antes da cobrança recorrente.',
  },
  {
    question: 'Preciso cadastrar cliente para ele aprovar?',
    answer:
      'Não. O cliente pode acessar links de aprovação ou dashboard com token e validade, sem login adicional. A agência mantém controle dos links ativos e pode revogar quando necessário.',
  },
  {
    question: 'Quais formatos de Instagram entram no fluxo?',
    answer:
      'A operação contempla post, carrossel, reels e stories. Todos seguem o mesmo calendário e podem passar pelo fluxo de revisão e aprovação.',
  },
  {
    question: 'O plano Enterprise também tem checkout?',
    answer:
      'Não no fluxo padrão. Planos consultivos abrem contato via WhatsApp para ajustar volume, implantação e condições comerciais com a equipe.',
  },
  {
    question: 'Os dados e links são seguros?',
    answer:
      'Os links usam tokens aleatórios, validade e escopo limitado. O cliente visualiza apenas o necessário para aprovar ou acompanhar resultados, enquanto a operação interna segue protegida por login.',
  },
  {
    question: 'Posso cancelar se não fizer sentido para minha operação?',
    answer:
      'Sim. O modelo é por assinatura mensal nos planos self-service. A ideia do trial é permitir que sua agência valide o fluxo antes de assumir a rotina paga.',
  },
  {
    question: 'O que muda entre os planos?',
    answer:
      'Os planos variam por volume de contas, posts, usuários e recursos inclusos. O card de cada plano mostra os limites e indica quando o fluxo de aprovação já está incluso.',
  },
];

export const conversionCards = [
  {
    icon: React.createElement(TaskIcon),
    title: 'Comece validando um cliente',
    description: 'Use o trial para montar o primeiro calendário, enviar uma aprovação e testar o dashboard compartilhável.',
  },
  {
    icon: React.createElement(PaidIcon),
    title: 'Escolha o plano depois do teste',
    description: 'O checkout cria a assinatura com 3 dias de trial para planos self-service. Enterprise segue por WhatsApp.',
  },
];
