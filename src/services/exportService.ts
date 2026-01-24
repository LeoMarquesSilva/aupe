import { Client } from '../types';
import { InstagramPost, InstagramProfile } from './instagramMetricsService';
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
  engagementBreakdown?: {
    likes: number;
    comments: number;
    saved: number;
    shares: number;
    total: number;
  };
  postsByType?: Record<string, number>;
  mostEngagedPost?: InstagramPost;
}

interface ExportData {
  client: Client;
  profile: InstagramProfile | null;
  posts: InstagramPost[];
  metrics: DashboardMetrics;
  period: '7d' | '30d' | '90d';
  postsStats?: {
    published: number;
    scheduled: number;
  };
}

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'html' | 'json';

class ExportService {
  /**
   * Exporta dados para CSV
   */
  exportToCSV(data: ExportData): void {
    const { client, posts } = data;
    
    const headers = [
      'ID',
      'Data',
      'Tipo',
      'Legenda',
      'Curtidas',
      'Comentários',
      'Alcance',
      'Impressões',
      'Salvos',
      'Compartilhamentos',
      'Engajamento Total',
      'Taxa de Engajamento (%)',
      'Link'
    ];
    
    const csvRows = [
      headers.join(','),
      ...posts.map(post => {
        const likes = post.like_count || 0;
        const comments = post.comments_count || 0;
        const reach = post.insights?.reach || 0;
        const impressions = post.insights?.impressions || 0;
        const saved = post.insights?.saved || 0;
        const shares = post.insights?.shares || 0;
        const engagement = likes + comments + saved + shares;
        const engagementRate = reach > 0 ? ((engagement / reach) * 100).toFixed(2) : '0';
        
        return [
          post.id,
          format(new Date(post.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          this.formatMediaType(post.media_type),
          `"${(post.caption || '').replace(/"/g, '""').substring(0, 200)}"`,
          likes,
          comments,
          reach,
          impressions,
          saved,
          shares,
          engagement,
          engagementRate,
          post.permalink || ''
        ].join(',');
      })
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileName = `relatorio_${client.name?.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Exporta dados para JSON
   */
  exportToJSON(data: ExportData): void {
    const { client } = data;
    
    const jsonData = {
      cliente: {
        nome: client.name,
        instagram: client.instagram
      },
      perfil: data.profile ? {
        seguidores: data.profile.followers_count,
        seguindo: data.profile.follows_count,
        posts: data.profile.media_count
      } : null,
      periodo: data.period,
      estatisticas: {
        posts: data.metrics.totalPosts,
        curtidas: data.metrics.totalLikes,
        comentarios: data.metrics.totalComments,
        alcance: data.metrics.totalReach,
        impressoes: data.metrics.totalImpressions,
        taxaEngajamento: data.metrics.engagementRate,
        comparacaoPeriodo: data.metrics.periodComparisons,
        breakdownEngajamento: data.metrics.engagementBreakdown,
        postsPorTipo: data.metrics.postsByType
      },
      posts: data.posts.map(post => ({
        id: post.id,
        data: post.timestamp,
        tipo: this.formatMediaType(post.media_type),
        legenda: post.caption,
        curtidas: post.like_count || 0,
        comentarios: post.comments_count || 0,
        alcance: post.insights?.reach || 0,
        impressoes: post.insights?.impressions || 0,
        salvos: post.insights?.saved || 0,
        compartilhamentos: post.insights?.shares || 0,
        link: post.permalink
      })),
      geradoEm: new Date().toISOString()
    };
    
    const jsonContent = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileName = `relatorio_${client.name?.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.json`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Exporta dados para HTML
   */
  exportToHTML(data: ExportData): void {
    const { client, profile, metrics, posts, period } = data;
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório Instagram - ${client.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2962FF;
      margin-bottom: 10px;
      font-size: 32px;
    }
    h2 {
      color: #1976D2;
      margin: 30px 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #e0e0e0;
    }
    .header-info {
      background: linear-gradient(135deg, #2962FF 0%, #1976D2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .header-info p {
      margin: 5px 0;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .metric-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #2962FF;
    }
    .metric-card h3 {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
    }
    .metric-card .value {
      font-size: 28px;
      font-weight: bold;
      color: #2962FF;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    th {
      background: #2962FF;
      color: white;
      font-weight: 600;
    }
    tr:hover {
      background: #f5f5f5;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-success {
      background: #4CAF50;
      color: white;
    }
    .badge-info {
      background: #2196F3;
      color: white;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Relatório de Performance Instagram</h1>
    
    <div class="header-info">
      <p><strong>Cliente:</strong> ${client.name}</p>
      <p><strong>Instagram:</strong> @${client.instagram}</p>
      ${profile ? `<p><strong>Seguidores:</strong> ${profile.followers_count.toLocaleString('pt-BR')}</p>` : ''}
      <p><strong>Período:</strong> ${period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : '90 dias'}</p>
      <p><strong>Data do Relatório:</strong> ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
    </div>

    <h2>📈 Métricas Principais</h2>
    <div class="metrics-grid">
      <div class="metric-card">
        <h3>Posts</h3>
        <div class="value">${metrics.totalPosts.toLocaleString('pt-BR')}</div>
      </div>
      <div class="metric-card">
        <h3>Curtidas</h3>
        <div class="value">${metrics.totalLikes.toLocaleString('pt-BR')}</div>
      </div>
      <div class="metric-card">
        <h3>Comentários</h3>
        <div class="value">${metrics.totalComments.toLocaleString('pt-BR')}</div>
      </div>
      <div class="metric-card">
        <h3>Alcance</h3>
        <div class="value">${metrics.totalReach.toLocaleString('pt-BR')}</div>
      </div>
      <div class="metric-card">
        <h3>Taxa de Engajamento</h3>
        <div class="value">${metrics.engagementRate.toFixed(2)}%</div>
      </div>
    </div>

    ${metrics.engagementBreakdown ? `
    <h2>💬 Breakdown de Engajamento</h2>
    <table>
      <thead>
        <tr>
          <th>Tipo</th>
          <th>Quantidade</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Curtidas</td>
          <td>${metrics.engagementBreakdown.likes.toLocaleString('pt-BR')}</td>
        </tr>
        <tr>
          <td>Comentários</td>
          <td>${metrics.engagementBreakdown.comments.toLocaleString('pt-BR')}</td>
        </tr>
        <tr>
          <td>Salvos</td>
          <td>${metrics.engagementBreakdown.saved.toLocaleString('pt-BR')}</td>
        </tr>
        <tr>
          <td>Compartilhamentos</td>
          <td>${metrics.engagementBreakdown.shares.toLocaleString('pt-BR')}</td>
        </tr>
        <tr>
          <td><strong>Total</strong></td>
          <td><strong>${metrics.engagementBreakdown.total.toLocaleString('pt-BR')}</strong></td>
        </tr>
      </tbody>
    </table>
    ` : ''}

    ${metrics.postsByType ? `
    <h2>📱 Posts por Tipo de Mídia</h2>
    <table>
      <thead>
        <tr>
          <th>Tipo</th>
          <th>Quantidade</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(metrics.postsByType).map(([type, count]) => `
          <tr>
            <td>${this.formatMediaType(type)}</td>
            <td>${count}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    <h2>🏆 Top Posts</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Data</th>
          <th>Tipo</th>
          <th>Curtidas</th>
          <th>Comentários</th>
          <th>Alcance</th>
          <th>Engajamento</th>
        </tr>
      </thead>
      <tbody>
        ${posts.slice(0, 20).map((post, index) => {
          const likes = post.like_count || 0;
          const comments = post.comments_count || 0;
          const reach = post.insights?.reach || 0;
          const engagement = likes + comments + (post.insights?.saved || 0) + (post.insights?.shares || 0);
          return `
            <tr>
              <td>${index + 1}</td>
              <td>${format(new Date(post.timestamp), 'dd/MM/yyyy', { locale: ptBR })}</td>
              <td><span class="badge badge-info">${this.formatMediaType(post.media_type)}</span></td>
              <td>${likes.toLocaleString('pt-BR')}</td>
              <td>${comments.toLocaleString('pt-BR')}</td>
              <td>${reach > 0 ? reach.toLocaleString('pt-BR') : '-'}</td>
              <td><strong>${engagement.toLocaleString('pt-BR')}</strong></td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <div class="footer">
      <p>Relatório gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
      <p>Instagram Analytics Dashboard</p>
    </div>
  </div>
</body>
</html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileName = `relatorio_${client.name?.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.html`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Exporta dados para Excel (XLSX)
   */
  async exportToExcel(data: ExportData): Promise<void> {
    // Para Excel, vamos usar uma abordagem simples criando CSV com extensão .xlsx
    // ou podemos usar uma biblioteca como xlsx se necessário
    // Por enquanto, vamos criar um CSV formatado que abre bem no Excel
    
    const { client, posts, metrics } = data;
    
    // Criar múltiplas planilhas em formato CSV (que Excel pode abrir)
    const sheets: Record<string, string[][]> = {
      'Resumo': [
        ['Relatório Instagram', client.name],
        ['Instagram', `@${client.instagram}`],
        ['Período', data.period === '7d' ? '7 dias' : data.period === '30d' ? '30 dias' : '90 dias'],
        ['Data do Relatório', format(new Date(), "dd/MM/yyyy", { locale: ptBR })],
        [],
        ['Métricas Principais', ''],
        ['Posts', metrics.totalPosts.toString()],
        ['Curtidas', metrics.totalLikes.toString()],
        ['Comentários', metrics.totalComments.toString()],
        ['Alcance', metrics.totalReach.toString()],
        ['Taxa de Engajamento', `${metrics.engagementRate.toFixed(2)}%`]
      ],
      'Posts': [
        ['ID', 'Data', 'Tipo', 'Legenda', 'Curtidas', 'Comentários', 'Alcance', 'Impressões', 'Salvos', 'Compartilhamentos', 'Engajamento Total', 'Link'],
        ...posts.map(post => {
          const likes = post.like_count || 0;
          const comments = post.comments_count || 0;
          const reach = post.insights?.reach || 0;
          const impressions = post.insights?.impressions || 0;
          const saved = post.insights?.saved || 0;
          const shares = post.insights?.shares || 0;
          const engagement = likes + comments + saved + shares;
          
          return [
            post.id,
            format(new Date(post.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
            this.formatMediaType(post.media_type),
            (post.caption || '').substring(0, 100),
            likes.toString(),
            comments.toString(),
            reach.toString(),
            impressions.toString(),
            saved.toString(),
            shares.toString(),
            engagement.toString(),
            post.permalink || ''
          ];
        })
      ]
    };

    // Criar CSV multi-planilha (formato simples que Excel pode abrir)
    let csvContent = '';
    Object.entries(sheets).forEach(([sheetName, rows]) => {
      csvContent += `\n=== ${sheetName} ===\n`;
      rows.forEach(row => {
        csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
      });
    });

    const blob = new Blob(['\ufeff' + csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileName = `relatorio_${client.name?.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xls`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private formatMediaType(type: string): string {
    const types: Record<string, string> = {
      'IMAGE': 'Imagem',
      'VIDEO': 'Vídeo',
      'CAROUSEL_ALBUM': 'Carrossel',
      'REELS': 'Reels',
      'IGTV': 'IGTV'
    };
    return types[type] || type;
  }
}

export const exportService = new ExportService();
