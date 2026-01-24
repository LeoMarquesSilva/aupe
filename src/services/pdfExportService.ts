import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InstagramPost, InstagramProfile } from './instagramMetricsService';
import { Client } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardMetrics {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalReach: number;
  totalImpressions: number;
  engagementRate: number;
  periodComparisons?: {
    posts: number;
    likes: number;
    comments: number;
    reach: number;
    impressions: number;
    engagementRate: number;
  };
  previousPeriodValues?: {
    posts: number;
    likes: number;
    comments: number;
    reach: number;
    impressions: number;
    engagementRate: number;
  };
  engagementBreakdown?: {
    likes: number;
    comments: number;
    saved: number;
    shares: number;
    total: number;
  };
  postsByType?: Record<string, number>;
  mostEngagedPost?: InstagramPost | null;
}

interface ExportOptions {
  client: Client;
  profile: InstagramProfile | null;
  posts: InstagramPost[];
  metrics: DashboardMetrics;
  period: '7d' | '30d' | '90d';
  postsStats?: {
    published: number;
    scheduled: number;
  };
  options?: {
    includeClientInfo?: boolean;
    includeMetrics?: boolean;
    includeEngagementBreakdown?: boolean;
    includePostsByType?: boolean;
    includeMostEngagedPost?: boolean;
    includeTopPosts?: boolean;
    topPostsCount?: number;
    primaryColor?: string;
    secondaryColor?: string;
    layoutStyle?: 'modern' | 'classic' | 'minimal';
    showCoverPage?: boolean;
    showPageNumbers?: boolean;
    fontSize?: 'small' | 'medium' | 'large';
    sectionOrder?: string[];
    sectionAlignment?: Record<string, 'left' | 'center' | 'right'>;
    sectionSpacing?: 'compact' | 'normal' | 'spacious';
    includeCharts?: boolean;
    chartType?: 'bar' | 'pie' | 'line' | 'none';
    pageOrientation?: 'portrait' | 'landscape';
    pageSize?: 'a4' | 'letter';
    customMargins?: boolean;
    marginSize?: 'small' | 'medium' | 'large';
    includeLogo?: boolean;
    logoPosition?: 'header' | 'footer' | 'cover' | 'none';
    watermark?: boolean;
    watermarkText?: string;
    tableStyle?: 'striped' | 'grid' | 'plain';
    headerStyle?: 'gradient' | 'solid' | 'minimal';
  };
}

class PDFExportService {
  /**
   * Gera um relatório PDF completo do dashboard
   */
  async generatePDFReport(options: ExportOptions): Promise<void> {
    const { client, profile, posts, metrics, period, postsStats, options: exportOptions } = options;
    
    // Opções padrão
    const opts = {
      includeClientInfo: true,
      includeMetrics: true,
      includeEngagementBreakdown: true,
      includePostsByType: true,
      includeMostEngagedPost: true,
      includeTopPosts: true,
      topPostsCount: 20,
      primaryColor: '#2962FF',
      secondaryColor: '#1976D2',
      layoutStyle: 'modern' as const,
      showCoverPage: true,
      showPageNumbers: true,
      fontSize: 'medium' as const,
      sectionOrder: [
        'includeClientInfo',
        'includeMetrics',
        'includeEngagementBreakdown',
        'includePostsByType',
        'includeMostEngagedPost',
        'includeTopPosts'
      ],
      sectionAlignment: {},
      sectionSpacing: 'normal' as const,
      includeCharts: true,
      chartType: 'bar' as const,
      pageOrientation: 'portrait' as const,
      pageSize: 'a4' as const,
      customMargins: false,
      marginSize: 'medium' as const,
      includeLogo: false,
      logoPosition: 'header' as const,
      watermark: false,
      watermarkText: 'CONFIDENCIAL',
      tableStyle: 'striped' as const,
      headerStyle: 'gradient' as const,
      ...exportOptions
    };
    
    // Configurar orientação e tamanho da página
    const orientation = opts.pageOrientation === 'landscape' ? 'l' : 'p';
    const pageFormat = opts.pageSize === 'letter' ? 'letter' : 'a4';
    const doc = new jsPDF(orientation, 'mm', pageFormat);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Margens e espaçamentos baseados no estilo
    let baseMargin = opts.layoutStyle === 'minimal' ? 20 : opts.layoutStyle === 'classic' ? 15 : 15;
    if (opts.customMargins) {
      baseMargin = opts.marginSize === 'small' ? 10 : opts.marginSize === 'large' ? 25 : 15;
    }
    const margin = baseMargin;
    const fontSizeMultiplier = opts.fontSize === 'small' ? 0.9 : opts.fontSize === 'large' ? 1.1 : 1;
    const spacingMultiplier = opts.sectionSpacing === 'compact' ? 0.7 : opts.sectionSpacing === 'spacious' ? 1.5 : 1;
    let yPosition = margin;
    
    // Função helper para obter alinhamento
    const getAlignment = (sectionKey: string): 'left' | 'center' | 'right' => {
      return opts.sectionAlignment?.[sectionKey] || 'left';
    };
    
    // Função helper para adicionar espaçamento entre seções
    const addSectionSpacing = (baseSpacing: number = 15) => {
      yPosition += baseSpacing * spacingMultiplier;
    };

    // Converter cores hex para RGB
    const hexToRgb = (hex: string): [number, number, number] => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
        : [41, 98, 255];
    };

    const primaryColor: [number, number, number] = hexToRgb(opts.primaryColor);
    const secondaryColor: [number, number, number] = hexToRgb(opts.secondaryColor);
    const successColor: [number, number, number] = [46, 125, 50];
    const textColor: [number, number, number] = [33, 33, 33];
    const lightGray: [number, number, number] = opts.layoutStyle === 'minimal' ? [250, 250, 250] : [245, 245, 245];

    // Função auxiliar para adicionar nova página se necessário
    const checkPageBreak = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };

    // ========== CAPA (se habilitada) ==========
    if (opts.showCoverPage) {
      if (opts.layoutStyle === 'modern') {
        // Gradiente de fundo (simulado com múltiplos retângulos)
        for (let i = 0; i < 60; i++) {
          const alpha = 1 - (i / 60) * 0.3;
          doc.setFillColor(
            Math.round(primaryColor[0] * alpha),
            Math.round(primaryColor[1] * alpha),
            Math.round(primaryColor[2] * alpha)
          );
          doc.rect(0, i, pageWidth, 1, 'F');
        }
        
        // Logo/Ícone (círculo decorativo)
        doc.setFillColor(255, 255, 255);
        doc.circle(pageWidth / 2, 30, 15, 'F');
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.circle(pageWidth / 2, 30, 12, 'F');
      } else if (opts.layoutStyle === 'classic') {
        // Fundo sólido com borda
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, pageWidth, 60, 'F');
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(2);
        doc.rect(5, 5, pageWidth - 10, 50, 'S');
      } else {
        // Minimalista - apenas linha superior
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, pageWidth, 8, 'F');
      }
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(32 * fontSizeMultiplier);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório de Performance', pageWidth / 2, opts.layoutStyle === 'minimal' ? 30 : 50, { align: 'center' });
      
      doc.setFontSize(14 * fontSizeMultiplier);
      doc.setFont('helvetica', 'normal');
      doc.text('Instagram Analytics Dashboard', pageWidth / 2, opts.layoutStyle === 'minimal' ? 40 : 58, { align: 'center' });
      
      yPosition = opts.layoutStyle === 'minimal' ? 55 : 75;
    } else {
      yPosition = margin;
    }

    // Informações do Cliente (se selecionado)
    if (opts.includeClientInfo) {
      checkPageBreak(50);
      
      // Box decorativo
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, yPosition - 5, pageWidth - 2 * margin, 45, 3, 3, 'FD');
      
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Informações do Cliente', margin + 5, yPosition + 5);
      yPosition += 12;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setFont('helvetica', 'bold');
      doc.text('Cliente:', margin + 5, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(client.name, margin + 25, yPosition);
      yPosition += 7;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Instagram:', margin + 5, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(`@${client.instagram}`, margin + 30, yPosition);
      yPosition += 7;
      
      if (profile) {
        doc.setFont('helvetica', 'bold');
        doc.text('Seguidores:', margin + 5, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(profile.followers_count.toLocaleString('pt-BR'), margin + 35, yPosition);
        yPosition += 7;
      }

      if (postsStats) {
        doc.setFont('helvetica', 'bold');
        doc.text('Posts Publicados:', margin + 5, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(postsStats.published.toString(), margin + 45, yPosition);
        yPosition += 7;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Posts Agendados:', margin + 5, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(postsStats.scheduled.toString(), margin + 45, yPosition);
        yPosition += 7;
      }

      doc.setFont('helvetica', 'bold');
      doc.text('Período:', margin + 5, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : '90 dias', margin + 25, yPosition);
      yPosition += 7;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Data do Relatório:', margin + 5, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }), margin + 50, yPosition);
      yPosition += 15;
    } else {
      yPosition += 10;
    }

    // ========== MÉTRICAS PRINCIPAIS ==========
    if (opts.includeMetrics) {
      checkPageBreak(80);
      
      // Header baseado no estilo
      const headerStyle = opts.headerStyle || 'gradient';
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      
      if (headerStyle === 'minimal' || opts.layoutStyle === 'minimal') {
        doc.rect(margin, yPosition - 6, pageWidth - 2 * margin, 2, 'F');
        yPosition += 2;
      } else if (headerStyle === 'solid') {
        doc.roundedRect(margin, yPosition - 8, pageWidth - 2 * margin, 12, 2, 2, 'F');
      } else {
        // Gradient effect (simulado)
        for (let i = 0; i < 12; i++) {
          const alpha = 1 - (i / 12) * 0.2;
          doc.setFillColor(
            Math.round(primaryColor[0] * alpha),
            Math.round(primaryColor[1] * alpha),
            Math.round(primaryColor[2] * alpha)
          );
          doc.rect(margin, yPosition - 8 + i, pageWidth - 2 * margin, 1, 'F');
        }
      }
      
      doc.setFontSize((16 * fontSizeMultiplier));
      doc.setFont('helvetica', 'bold');
      const isMinimal = headerStyle === 'minimal' || opts.layoutStyle === 'minimal';
      doc.setTextColor(isMinimal ? primaryColor[0] : 255, isMinimal ? primaryColor[1] : 255, isMinimal ? primaryColor[2] : 255);
      doc.text('Métricas de Performance', margin + (isMinimal ? 0 : 5), yPosition);
      yPosition += isMinimal ? 10 : 15;

    // Cards de métricas
    const metricsData = [
      { label: 'Posts', value: metrics.totalPosts, change: metrics.periodComparisons?.posts },
      { label: 'Curtidas', value: metrics.totalLikes, change: metrics.periodComparisons?.likes },
      { label: 'Comentários', value: metrics.totalComments, change: metrics.periodComparisons?.comments },
      { label: 'Alcance', value: metrics.totalReach, change: metrics.periodComparisons?.reach },
      { label: 'Taxa de Engajamento', value: `${metrics.engagementRate.toFixed(1)}%`, change: metrics.periodComparisons?.engagementRate }
    ];

    const cardWidth = (pageWidth - 2 * margin - 10) / 2;
    const cardHeight = 25;
    let cardX = margin;
    let cardY = yPosition;

    metricsData.forEach((metric, index) => {
      if (index > 0 && index % 2 === 0) {
        cardX = margin;
        cardY += cardHeight + 5;
        checkPageBreak(cardHeight + 5);
      }

      // Card background baseado no estilo
      doc.setFillColor(255, 255, 255);
      if (opts.layoutStyle === 'minimal') {
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.5);
        doc.rect(cardX, cardY, cardWidth, cardHeight, 'S');
      } else if (opts.layoutStyle === 'classic') {
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(1);
        doc.rect(cardX, cardY, cardWidth, cardHeight, 'FD');
      } else {
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 2, 2, 'FD');
      }

      // Valor
      doc.setFontSize(18 * fontSizeMultiplier);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(
        typeof metric.value === 'number' 
          ? metric.value.toLocaleString('pt-BR') 
          : metric.value,
        cardX + 5,
        cardY + 10
      );

      // Label
      doc.setFontSize(10 * fontSizeMultiplier);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(metric.label, cardX + 5, cardY + 16);

      // Change
      if (metric.change !== undefined) {
        const changeValue = metric.change;
        const changeColor: [number, number, number] = changeValue >= 0 ? successColor : [211, 47, 47];
        doc.setFontSize(9);
        doc.setTextColor(changeColor[0], changeColor[1], changeColor[2]);
        doc.text(
          `${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(1)}%`,
          cardX + cardWidth - 5,
          cardY + 10,
          { align: 'right' }
        );
      }

      cardX += cardWidth + 10;
    });

      yPosition = cardY + cardHeight + 15;
      checkPageBreak(30);
    }

    // ========== BREAKDOWN DE ENGAJAMENTO ==========
    if (opts.includeEngagementBreakdown && metrics.engagementBreakdown) {
      checkPageBreak(50);
      
      // Header baseado no estilo
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      if (opts.layoutStyle === 'minimal') {
        doc.rect(margin, yPosition - 6, pageWidth - 2 * margin, 2, 'F');
        yPosition += 2;
      } else {
        doc.roundedRect(margin, yPosition - 8, pageWidth - 2 * margin, 12, 2, 2, 'F');
      }
      
      doc.setFontSize(16 * fontSizeMultiplier);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(opts.layoutStyle === 'minimal' ? primaryColor[0] : 255, opts.layoutStyle === 'minimal' ? primaryColor[1] : 255, opts.layoutStyle === 'minimal' ? primaryColor[2] : 255);
      doc.text('Breakdown de Engajamento', margin + (opts.layoutStyle === 'minimal' ? 0 : 5), yPosition);
      yPosition += opts.layoutStyle === 'minimal' ? 10 : 15;

      const breakdownData = [
        ['Curtidas', metrics.engagementBreakdown.likes.toLocaleString('pt-BR')],
        ['Comentários', metrics.engagementBreakdown.comments.toLocaleString('pt-BR')],
        ['Salvos', metrics.engagementBreakdown.saved.toLocaleString('pt-BR')],
        ['Compartilhamentos', metrics.engagementBreakdown.shares.toLocaleString('pt-BR')],
        ['Total', metrics.engagementBreakdown.total.toLocaleString('pt-BR')]
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [['Tipo', 'Quantidade']],
        body: breakdownData,
        theme: opts.tableStyle || 'striped',
        headStyles: {
          fillColor: primaryColor as any,
          textColor: [255, 255, 255] as any,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 10 * fontSizeMultiplier,
          cellPadding: 5
        },
        margin: { left: margin, right: margin }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
      checkPageBreak(20);
    }

    // ========== POSTS POR TIPO ==========
    if (opts.includePostsByType && metrics.postsByType && Object.keys(metrics.postsByType).length > 0) {
      checkPageBreak(50);
      
      // Header baseado no estilo
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      if (opts.layoutStyle === 'minimal') {
        doc.rect(margin, yPosition - 6, pageWidth - 2 * margin, 2, 'F');
        yPosition += 2;
      } else {
        doc.roundedRect(margin, yPosition - 8, pageWidth - 2 * margin, 12, 2, 2, 'F');
      }
      
      doc.setFontSize(16 * fontSizeMultiplier);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(opts.layoutStyle === 'minimal' ? primaryColor[0] : 255, opts.layoutStyle === 'minimal' ? primaryColor[1] : 255, opts.layoutStyle === 'minimal' ? primaryColor[2] : 255);
      doc.text('Posts por Tipo de Mídia', margin + (opts.layoutStyle === 'minimal' ? 0 : 5), yPosition);
      yPosition += opts.layoutStyle === 'minimal' ? 10 : 15;

      const typeData = Object.entries(metrics.postsByType).map(([type, count]) => [
        this.formatMediaType(type),
        count.toString()
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Tipo', 'Quantidade']],
        body: typeData,
        theme: opts.tableStyle || 'striped',
        headStyles: {
          fillColor: primaryColor as any,
          textColor: [255, 255, 255] as any,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 10 * fontSizeMultiplier,
          cellPadding: 5
        },
        margin: { left: margin, right: margin }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
      checkPageBreak(20);
    }

    // ========== POST MAIS ENGAJADO ==========
    if (opts.includeMostEngagedPost && metrics.mostEngagedPost) {
      checkPageBreak(60);
      
      // Header baseado no estilo
      const highlightColor = opts.layoutStyle === 'minimal' ? primaryColor : successColor;
      doc.setFillColor(highlightColor[0], highlightColor[1], highlightColor[2]);
      if (opts.layoutStyle === 'minimal') {
        doc.rect(margin, yPosition - 6, pageWidth - 2 * margin, 2, 'F');
        yPosition += 2;
      } else {
        doc.roundedRect(margin, yPosition - 8, pageWidth - 2 * margin, 12, 2, 2, 'F');
      }
      
      doc.setFontSize(16 * fontSizeMultiplier);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(opts.layoutStyle === 'minimal' ? highlightColor[0] : 255, opts.layoutStyle === 'minimal' ? highlightColor[1] : 255, opts.layoutStyle === 'minimal' ? highlightColor[2] : 255);
      doc.text(opts.layoutStyle === 'minimal' ? 'Post Mais Engajado' : '⭐ Post Mais Engajado', margin + (opts.layoutStyle === 'minimal' ? 0 : 5), yPosition);
      yPosition += opts.layoutStyle === 'minimal' ? 10 : 15;
      
      // Box destacado baseado no estilo
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(highlightColor[0], highlightColor[1], highlightColor[2]);
      doc.setLineWidth(opts.layoutStyle === 'minimal' ? 0.5 : 1);
      if (opts.layoutStyle === 'minimal') {
        doc.rect(margin, yPosition, pageWidth - 2 * margin, 50, 'S');
      } else {
        doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 50, 3, 3, 'FD');
      }
      yPosition += 8;

      const post = metrics.mostEngagedPost;
      const likes = post.like_count || 0;
      const comments = post.comments_count || 0;
      const saved = post.insights?.saved || 0;
      const shares = post.insights?.shares || 0;
      const reach = post.insights?.reach || 0;
      const totalEngagement = likes + comments + saved + shares;
      const engagementRate = reach > 0 ? (totalEngagement / reach) * 100 : 0;

      doc.setFontSize(10 * fontSizeMultiplier);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Data:', margin + 5, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(format(new Date(post.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }), margin + 20, yPosition);
      yPosition += 7;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Tipo:', margin + 5, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(this.formatMediaType(post.media_type), margin + 20, yPosition);
      yPosition += 7;
      
      // Métricas em duas colunas
      const leftCol = margin + 5;
      const rightCol = pageWidth / 2 + 5;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Curtidas:', leftCol, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(likes.toLocaleString('pt-BR'), leftCol + 25, yPosition);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Comentários:', rightCol, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(comments.toLocaleString('pt-BR'), rightCol + 30, yPosition);
      yPosition += 7;
      
      if (reach > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Alcance:', leftCol, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(reach.toLocaleString('pt-BR'), leftCol + 25, yPosition);
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(successColor[0], successColor[1], successColor[2]);
        doc.text('Taxa de Engajamento:', rightCol, yPosition);
        doc.setFont('helvetica', 'bold');
        doc.text(`${engagementRate.toFixed(2)}%`, rightCol + 50, yPosition);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        yPosition += 7;
      }
      
      if (post.caption) {
        yPosition += 3;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin + 5, yPosition, pageWidth - margin - 5, yPosition);
        yPosition += 5;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Legenda:', margin + 5, yPosition);
        yPosition += 5;
        doc.setFont('helvetica', 'normal');
        const caption = post.caption.substring(0, 200) + (post.caption.length > 200 ? '...' : '');
        const lines = doc.splitTextToSize(caption, pageWidth - 2 * margin - 10);
        doc.text(lines, margin + 5, yPosition);
        yPosition += lines.length * 5;
      }
      yPosition += 8;
    }

    // ========== TABELA DE POSTS (TOP N) ==========
    if (opts.includeTopPosts && posts.length > 0) {
      checkPageBreak(60);
      
      // Header baseado no estilo
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      if (opts.layoutStyle === 'minimal') {
        doc.rect(margin, yPosition - 6, pageWidth - 2 * margin, 2, 'F');
        yPosition += 2;
      } else {
        doc.roundedRect(margin, yPosition - 8, pageWidth - 2 * margin, 12, 2, 2, 'F');
      }
      
      doc.setFontSize(16 * fontSizeMultiplier);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(opts.layoutStyle === 'minimal' ? primaryColor[0] : 255, opts.layoutStyle === 'minimal' ? primaryColor[1] : 255, opts.layoutStyle === 'minimal' ? primaryColor[2] : 255);
      doc.text(`Top ${Math.min(opts.topPostsCount || 20, posts.length)} Posts`, margin + (opts.layoutStyle === 'minimal' ? 0 : 5), yPosition);
      yPosition += opts.layoutStyle === 'minimal' ? 10 : 15;

      // Ordenar posts por engajamento
      const sortedPosts = [...posts]
        .map(post => {
          const likes = post.like_count || 0;
          const comments = post.comments_count || 0;
          const saved = post.insights?.saved || 0;
          const shares = post.insights?.shares || 0;
          return {
            post,
            engagement: likes + comments + saved + shares
          };
        })
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, opts.topPostsCount || 20);

      const tableData = sortedPosts.map(({ post }, index) => {
        const likes = post.like_count || 0;
        const comments = post.comments_count || 0;
        const reach = post.insights?.reach || 0;
        const engagement = likes + comments + (post.insights?.saved || 0) + (post.insights?.shares || 0);
        
        return [
          (index + 1).toString(),
          format(new Date(post.timestamp), 'dd/MM/yyyy', { locale: ptBR }),
          this.formatMediaType(post.media_type),
          likes.toLocaleString('pt-BR'),
          comments.toLocaleString('pt-BR'),
          reach > 0 ? reach.toLocaleString('pt-BR') : '-',
          engagement.toLocaleString('pt-BR')
        ];
      });

      autoTable(doc, {
        startY: yPosition,
        head: [['#', 'Data', 'Tipo', 'Curtidas', 'Comentários', 'Alcance', 'Engajamento']],
        body: tableData,
        theme: opts.tableStyle || 'striped',
        headStyles: {
          fillColor: primaryColor as any,
          textColor: [255, 255, 255] as any,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 8 * fontSizeMultiplier,
          cellPadding: 3
        },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 20 },
          4: { cellWidth: 20 },
          5: { cellWidth: 25 },
          6: { cellWidth: 25 }
        }
      });
    }

    // ========== MARCA D'ÁGUA ==========
    if (opts.watermark && opts.watermarkText) {
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setGState(doc.GState({ opacity: 0.1 }));
        doc.setFontSize(60);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(150, 150, 150);
        doc.text(
          opts.watermarkText,
          pageWidth / 2,
          pageHeight / 2,
          { align: 'center', angle: 45 }
        );
        doc.setGState(doc.GState({ opacity: 1 }));
      }
    }

    // ========== RODAPÉ ==========
    if (opts.showPageNumbers) {
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8 * fontSizeMultiplier);
        doc.setTextColor(150, 150, 150);
        
        if (opts.layoutStyle === 'minimal') {
          doc.text(
            `${i} / ${totalPages}`,
            pageWidth / 2,
            pageHeight - 8,
            { align: 'center' }
          );
        } else {
          doc.text(
            `Página ${i} de ${totalPages}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
          doc.text(
            `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
            pageWidth - margin,
            pageHeight - 10,
            { align: 'right' }
          );
        }
      }
    }

    // Salvar PDF
    const fileName = `relatorio_${client.name.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
  }

  /**
   * Formata o tipo de mídia para português
   */
  private formatMediaType(type: string): string {
    const types: Record<string, string> = {
      'IMAGE': 'Imagem',
      'VIDEO': 'Vídeo',
      'CAROUSEL_ALBUM': 'Carrossel',
      'REELS': 'Reels',
      'FEED': 'Feed',
      'STORY': 'Story'
    };
    return types[type] || type;
  }
}

export const pdfExportService = new PDFExportService();
