-- Tabela para armazenar dados do perfil do Instagram em cache
CREATE TABLE instagram_profile_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  profile_data JSONB NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id)
);

-- Tabela para armazenar posts do Instagram em cache
CREATE TABLE instagram_posts_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,
  post_data JSONB NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, post_id)
);

-- Tabela para controlar quando foi a última atualização completa dos dados
CREATE TABLE instagram_cache_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  last_full_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  posts_count INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'completed', -- 'in_progress', 'completed', 'failed'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id)
);

-- Índices para melhor performance
CREATE INDEX idx_instagram_profile_cache_client_id ON instagram_profile_cache(client_id);
CREATE INDEX idx_instagram_profile_cache_last_updated ON instagram_profile_cache(last_updated);

CREATE INDEX idx_instagram_posts_cache_client_id ON instagram_posts_cache(client_id);
CREATE INDEX idx_instagram_posts_cache_last_updated ON instagram_posts_cache(last_updated);
CREATE INDEX idx_instagram_posts_cache_post_id ON instagram_posts_cache(post_id);

CREATE INDEX idx_instagram_cache_status_client_id ON instagram_cache_status(client_id);
CREATE INDEX idx_instagram_cache_status_last_sync ON instagram_cache_status(last_full_sync);

-- RLS (Row Level Security)
ALTER TABLE instagram_profile_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_posts_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_cache_status ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança (ajustar conforme sua configuração de auth)
CREATE POLICY "Enable all operations for authenticated users" ON instagram_profile_cache
  FOR ALL USING (true);

CREATE POLICY "Enable all operations for authenticated users" ON instagram_posts_cache
  FOR ALL USING (true);

CREATE POLICY "Enable all operations for authenticated users" ON instagram_cache_status
  FOR ALL USING (true);