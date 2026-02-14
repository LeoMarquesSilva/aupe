-- Contagem de acessos aos links compartilhados (sem senha)
-- Incrementada pela Edge Function a cada visualização válida do dashboard

ALTER TABLE client_share_links
ADD COLUMN IF NOT EXISTS access_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN client_share_links.access_count IS 'Número de vezes que o link foi acessado (visualizações do dashboard)';
