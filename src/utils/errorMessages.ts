/**
 * Converte erros técnicos (ex.: Supabase, rede) em mensagens amigáveis para o usuário.
 */
export function getUserFriendlyMessage(error: unknown, context?: string): string {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  // Autenticação / permissão
  if (lower.includes('não autenticado') || lower.includes('not authenticated') || lower.includes('session'))
    return 'Sua sessão expirou. Faça login novamente.';
  if (lower.includes('row-level security') || lower.includes('rls') || lower.includes('policy'))
    return 'Você não tem permissão para esta ação.';
  if (lower.includes('permissão') || lower.includes('permission'))
    return 'Você não tem permissão para esta ação.';

  // Limites / plano
  if (lower.includes('limite') || lower.includes('limit') || lower.includes('upgrade') || lower.includes('plano'))
    return msg; // já costuma ser amigável

  // Upload / storage (sem citar Supabase)
  if (lower.includes('upload') || lower.includes('storage') || lower.includes('supabase') || lower.includes('bucket'))
    return 'Não foi possível enviar as mídias. Tente novamente ou use outros arquivos.';

  // Rede / servidor
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch'))
    return 'Problema de conexão. Verifique sua internet e tente novamente.';
  if (lower.includes('timeout') || lower.includes('timed out'))
    return 'A operação demorou demais. Tente novamente.';

  // Dados / validação
  if (lower.includes('duplicate') || lower.includes('unique') || lower.includes('já existe'))
    return 'Já existe um registro com estes dados.';
  if (lower.includes('foreign key') || lower.includes('constraint'))
    return 'Não foi possível salvar. Verifique os dados e tente novamente.';

  // Mensagens que já são razoavelmente amigáveis (manter)
  const keepAsIs = [
    'cliente não possui credenciais',
    'conecte a conta',
    'não é possível agendar mais posts',
    'não foi possível salvar o post',
    'formato de imagens não reconhecido',
  ];
  if (keepAsIs.some((s) => lower.includes(s))) return msg;

  // Fallback por contexto
  if (context) {
    if (context.includes('agendar')) return 'Não foi possível agendar. Tente novamente.';
    if (context.includes('enviar') || context.includes('postar')) return 'Não foi possível publicar. Tente novamente.';
    if (context.includes('salvar') || context.includes('atualizar')) return 'Não foi possível salvar. Tente novamente.';
    if (context.includes('upload') || context.includes('imagem')) return 'Não foi possível enviar as mídias. Tente novamente.';
  }

  return 'Algo deu errado. Tente novamente.';
}
