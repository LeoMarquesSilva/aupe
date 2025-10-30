const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

const migrations = [
  // Tabela para armazenar dados do perfil do Instagram em cache
  `CREATE TABLE IF NOT EXISTS instagram_profile_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    profile_data JSONB NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id)
  );`,

  // Tabela para armazenar posts do Instagram em cache
  `CREATE TABLE IF NOT EXISTS instagram_posts_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL,
    post_data JSONB NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, post_id)
  );`,

  // Tabela para controlar quando foi a última atualização completa dos dados
  `CREATE TABLE IF NOT EXISTS instagram_cache_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    last_full_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    posts_count INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'completed',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id)
  );`,

  // Índices para melhor performance
  `CREATE INDEX IF NOT EXISTS idx_instagram_profile_cache_client_id ON instagram_profile_cache(client_id);`,
  `CREATE INDEX IF NOT EXISTS idx_instagram_profile_cache_last_updated ON instagram_profile_cache(last_updated);`,
  `CREATE INDEX IF NOT EXISTS idx_instagram_posts_cache_client_id ON instagram_posts_cache(client_id);`,
  `CREATE INDEX IF NOT EXISTS idx_instagram_posts_cache_last_updated ON instagram_posts_cache(last_updated);`,
  `CREATE INDEX IF NOT EXISTS idx_instagram_posts_cache_post_id ON instagram_posts_cache(post_id);`,
  `CREATE INDEX IF NOT EXISTS idx_instagram_cache_status_client_id ON instagram_cache_status(client_id);`,
  `CREATE INDEX IF NOT EXISTS idx_instagram_cache_status_last_sync ON instagram_cache_status(last_full_sync);`,

  // RLS (Row Level Security)
  `ALTER TABLE instagram_profile_cache ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE instagram_posts_cache ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE instagram_cache_status ENABLE ROW LEVEL SECURITY;`,

  // Políticas de segurança
  `DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON instagram_profile_cache;`,
  `CREATE POLICY "Enable all operations for authenticated users" ON instagram_profile_cache FOR ALL USING (true);`,
  
  `DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON instagram_posts_cache;`,
  `CREATE POLICY "Enable all operations for authenticated users" ON instagram_posts_cache FOR ALL USING (true);`,
  
  `DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON instagram_cache_status;`,
  `CREATE POLICY "Enable all operations for authenticated users" ON instagram_cache_status FOR ALL USING (true);`
];

async function runMigrations() {
  console.log('🚀 Iniciando migrações das tabelas de cache...');
  
  for (let i = 0; i < migrations.length; i++) {
    const migration = migrations[i];
    console.log(`📝 Executando migração ${i + 1}/${migrations.length}...`);
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: migration });
      
      if (error) {
        // Tentar executar diretamente se RPC não funcionar
        const { error: directError } = await supabase
          .from('_temp_migration')
          .select('*')
          .limit(0);
        
        if (directError) {
          console.log(`⚠️  Tentando método alternativo para migração ${i + 1}...`);
          // Para migrações que não podem ser executadas via RPC, vamos logar para execução manual
          console.log(`📋 Execute manualmente no Supabase SQL Editor:`);
          console.log(migration);
          console.log('---');
        }
      } else {
        console.log(`✅ Migração ${i + 1} executada com sucesso`);
      }
    } catch (err) {
      console.log(`⚠️  Erro na migração ${i + 1}:`, err.message);
      console.log(`📋 Execute manualmente no Supabase SQL Editor:`);
      console.log(migration);
      console.log('---');
    }
  }
  
  console.log('🎉 Migrações concluídas!');
  console.log('📌 Se alguma migração falhou, execute o SQL manualmente no Supabase Dashboard > SQL Editor');
}

runMigrations().catch(console.error);