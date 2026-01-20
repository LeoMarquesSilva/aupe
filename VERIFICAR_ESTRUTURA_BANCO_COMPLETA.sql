-- ============================================
-- VERIFICAÇÃO COMPLETA DA ESTRUTURA DO BANCO
-- ============================================
-- Este script verifica toda a estrutura do banco de dados,
-- políticas RLS, funções, triggers e relacionamentos
-- para criar um contexto completo do sistema.
-- ============================================

-- 1. VERIFICAR ESTRUTURA DAS TABELAS PRINCIPAIS
-- ============================================

-- 1.1 - Estrutura da tabela organizations
SELECT 
    'organizations' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'organizations'
ORDER BY ordinal_position;

-- 1.2 - Estrutura da tabela profiles
SELECT 
    'profiles' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 1.3 - Estrutura da tabela clients
SELECT 
    'clients' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'clients'
ORDER BY ordinal_position;

-- 1.4 - Estrutura da tabela scheduled_posts
SELECT 
    'scheduled_posts' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'scheduled_posts'
ORDER BY ordinal_position;

-- 1.5 - Estrutura da tabela subscriptions
SELECT 
    'subscriptions' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'subscriptions'
ORDER BY ordinal_position;

-- 1.6 - Estrutura da tabela subscription_plans
SELECT 
    'subscription_plans' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'subscription_plans'
ORDER BY ordinal_position;

-- 1.7 - Estrutura da tabela subscription_usage
SELECT 
    'subscription_usage' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'subscription_usage'
ORDER BY ordinal_position;

-- 2. VERIFICAR FOREIGN KEYS E RELACIONAMENTOS
-- ============================================

SELECT 
    tc.table_name as tabela_origem,
    kcu.column_name as coluna_origem,
    ccu.table_name as tabela_referenciada,
    ccu.column_name as coluna_referenciada,
    tc.constraint_name as nome_constraint
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN (
        'organizations', 'profiles', 'clients', 
        'scheduled_posts', 'subscriptions', 
        'subscription_plans', 'subscription_usage'
    )
ORDER BY tc.table_name, kcu.column_name;

-- 3. VERIFICAR ÍNDICES
-- ============================================

SELECT 
    tablename as tabela,
    indexname as indice,
    indexdef as definicao
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN (
        'organizations', 'profiles', 'clients', 
        'scheduled_posts', 'subscriptions', 
        'subscription_plans', 'subscription_usage'
    )
ORDER BY tablename, indexname;

-- 4. VERIFICAR POLÍTICAS RLS
-- ============================================

-- 4.1 - Verificar se RLS está habilitado nas tabelas
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'organizations', 'profiles', 'clients', 
        'scheduled_posts', 'subscriptions', 
        'subscription_plans', 'subscription_usage'
    )
ORDER BY tablename;

-- 4.2 - Listar todas as políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname as nome_politica,
    permissive,
    roles,
    cmd as comando,
    qual as condicao_using,
    with_check as condicao_with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'organizations', 'profiles', 'clients', 
        'scheduled_posts', 'subscriptions', 
        'subscription_plans', 'subscription_usage'
    )
ORDER BY tablename, policyname;

-- 5. VERIFICAR FUNÇÕES IMPORTANTES
-- ============================================

-- 5.1 - Função get_user_organization_id
SELECT 
    p.proname as nome_funcao,
    pg_get_function_arguments(p.oid) as argumentos,
    pg_get_function_result(p.oid) as tipo_retorno,
    CASE 
        WHEN p.prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as tipo_seguranca,
    pg_get_functiondef(p.oid) as definicao_completa
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname IN (
        'get_user_organization_id',
        'can_create_instagram_account',
        'can_schedule_post',
        'can_add_profile',
        'update_subscription_usage',
        'process_scheduled_posts_by_time'
    )
ORDER BY p.proname;

-- 5.2 - Todas as funções relacionadas a organização
SELECT 
    p.proname as nome_funcao,
    pg_get_function_arguments(p.oid) as argumentos,
    pg_get_function_result(p.oid) as tipo_retorno,
    CASE 
        WHEN p.prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as tipo_seguranca
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND (
        p.proname LIKE '%organization%' 
        OR p.proname LIKE '%subscription%'
        OR p.proname LIKE '%client%'
        OR p.proname LIKE '%profile%'
        OR p.proname LIKE '%post%'
    )
ORDER BY p.proname;

-- 6. VERIFICAR TRIGGERS
-- ============================================

-- 6.1 - Triggers nas tabelas principais
SELECT 
    t.tgname as nome_trigger,
    c.relname as tabela,
    p.proname as funcao_trigger,
    CASE 
        WHEN t.tgenabled = 'O' THEN 'ENABLED'
        WHEN t.tgenabled = 'D' THEN 'DISABLED'
        ELSE 'UNKNOWN'
    END as status,
    CASE
        WHEN t.tgtype::integer & 2 = 2 THEN 'BEFORE'
        WHEN t.tgtype::integer & 64 = 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END as timing,
    CASE
        WHEN t.tgtype::integer & 4 = 4 THEN 'INSERT'
        WHEN t.tgtype::integer & 8 = 8 THEN 'DELETE'
        WHEN t.tgtype::integer & 16 = 16 THEN 'UPDATE'
        ELSE 'OTHER'
    END as evento
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'public'
    AND c.relname IN (
        'organizations', 'profiles', 'clients', 
        'scheduled_posts', 'subscriptions', 
        'subscription_plans', 'subscription_usage'
    )
    AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- 6.2 - Funções de trigger (verificar SECURITY DEFINER)
SELECT 
    p.proname as nome_funcao_trigger,
    pg_get_function_arguments(p.oid) as argumentos,
    CASE 
        WHEN p.prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as tipo_seguranca,
    pg_get_functiondef(p.oid) as definicao_completa
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_trigger t ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE n.nspname = 'public'
    AND c.relname IN (
        'organizations', 'profiles', 'clients', 
        'scheduled_posts', 'subscriptions', 
        'subscription_plans', 'subscription_usage'
    )
    AND NOT t.tgisinternal
GROUP BY p.oid, p.proname
ORDER BY p.proname;

-- 7. VERIFICAR CRON JOBS
-- ============================================

-- 7.1 - Verificar se extensão pg_cron está instalada
SELECT 
    extname as extensao,
    extversion as versao
FROM pg_extension
WHERE extname = 'pg_cron';

-- 7.2 - Listar cron jobs (se pg_cron estiver disponível)
SELECT 
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active,
    jobname
FROM cron.job
ORDER BY jobid;

-- 8. VERIFICAR DADOS DE EXEMPLO (CONTAGENS)
-- ============================================

-- 8.1 - Contar registros por tabela
SELECT 
    'organizations' as tabela,
    COUNT(*) as total_registros
FROM organizations
UNION ALL
SELECT 
    'profiles' as tabela,
    COUNT(*) as total_registros
FROM profiles
UNION ALL
SELECT 
    'clients' as tabela,
    COUNT(*) as total_registros
FROM clients
UNION ALL
SELECT 
    'scheduled_posts' as tabela,
    COUNT(*) as total_registros
FROM scheduled_posts
UNION ALL
SELECT 
    'subscriptions' as tabela,
    COUNT(*) as total_registros
FROM subscriptions
UNION ALL
SELECT 
    'subscription_plans' as tabela,
    COUNT(*) as total_registros
FROM subscription_plans
UNION ALL
SELECT 
    'subscription_usage' as tabela,
    COUNT(*) as total_registros
FROM subscription_usage;

-- 8.2 - Verificar profiles sem organization_id
SELECT 
    COUNT(*) as profiles_sem_organization_id,
    COUNT(*) FILTER (WHERE organization_id IS NULL) as total_null
FROM profiles;

-- 8.3 - Verificar clients sem organization_id
SELECT 
    COUNT(*) as clients_sem_organization_id,
    COUNT(*) FILTER (WHERE organization_id IS NULL) as total_null
FROM clients;

-- 8.4 - Verificar scheduled_posts sem organization_id
SELECT 
    COUNT(*) as posts_sem_organization_id,
    COUNT(*) FILTER (WHERE organization_id IS NULL) as total_null
FROM scheduled_posts;

-- 9. VERIFICAR ROLES E PERMISSÕES
-- ============================================

-- 9.1 - Verificar roles dos profiles
SELECT 
    role,
    COUNT(*) as quantidade
FROM profiles
GROUP BY role
ORDER BY role;

-- 9.2 - Verificar distribuição de organization_id
SELECT 
    organization_id,
    COUNT(*) as quantidade_profiles
FROM profiles
WHERE organization_id IS NOT NULL
GROUP BY organization_id
ORDER BY quantidade_profiles DESC;

-- 10. VERIFICAR PROBLEMAS POTENCIAIS DE VISIBILIDADE
-- ============================================

-- 10.1 - Verificar se existem políticas RLS que usam user_id em vez de organization_id
SELECT 
    tablename,
    policyname,
    qual as condicao_using,
    with_check as condicao_with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('clients', 'scheduled_posts', 'profiles')
    AND (
        qual LIKE '%user_id%' 
        OR qual LIKE '%auth.uid()%'
        OR with_check LIKE '%user_id%'
        OR with_check LIKE '%auth.uid()%'
    )
ORDER BY tablename, policyname;

-- 10.2 - Verificar políticas que deveriam usar organization_id mas não usam
SELECT 
    tablename,
    policyname,
    cmd as comando,
    qual as condicao_using
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('clients', 'scheduled_posts', 'profiles')
    AND (
        qual IS NULL 
        OR qual NOT LIKE '%organization_id%'
        OR qual NOT LIKE '%get_user_organization_id%'
    )
ORDER BY tablename, policyname;

-- 11. VERIFICAR FUNÇÕES CRÍTICAS DE PROCESSAMENTO
-- ============================================

-- 11.1 - Função process_scheduled_posts_by_time (completa)
SELECT 
    p.proname as nome_funcao,
    CASE 
        WHEN p.prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as tipo_seguranca,
    pg_get_functiondef(p.oid) as definicao_completa
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'process_scheduled_posts_by_time';

-- 12. VERIFICAR WEBHOOKS E INTEGRAÇÕES
-- ============================================

-- 12.1 - Verificar triggers relacionados a webhooks
SELECT 
    t.tgname as nome_trigger,
    c.relname as tabela,
    p.proname as funcao_trigger
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'public'
    AND (
        t.tgname LIKE '%webhook%' 
        OR p.proname LIKE '%webhook%'
        OR p.proname LIKE '%n8n%'
    )
ORDER BY c.relname, t.tgname;

-- 13. RESUMO DE VALIDAÇÃO
-- ============================================

-- 13.1 - Verificar se todas as tabelas principais têm organization_id
SELECT 
    'profiles' as tabela,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'organization_id'
    ) as tem_organization_id
UNION ALL
SELECT 
    'clients' as tabela,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
            AND table_name = 'clients' 
            AND column_name = 'organization_id'
    ) as tem_organization_id
UNION ALL
SELECT 
    'scheduled_posts' as tabela,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
            AND table_name = 'scheduled_posts' 
            AND column_name = 'organization_id'
    ) as tem_organization_id;

-- 13.2 - Verificar se RLS está habilitado onde necessário
SELECT 
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'clients', 'scheduled_posts')
ORDER BY tablename;
