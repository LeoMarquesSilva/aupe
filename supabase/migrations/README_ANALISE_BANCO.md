# 📊 Análise Completa do Banco de Dados - INSYT

Este diretório contém scripts SQL para analisar a estrutura completa do banco de dados antes de implementar o sistema de pagamentos com Stripe.

## 📁 Arquivos

1. **`analyze_database_structure.sql`** - Análise detalhada e completa (18 seções)
2. **`generate_database_report.sql`** - Relatório consolidado e simplificado
3. **`README_ANALISE_BANCO.md`** - Este arquivo (instruções)

## 🚀 Como Usar

### Opção 1: Análise Completa (Recomendado)

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Abra o arquivo `analyze_database_structure.sql`
4. Execute cada seção individualmente ou copie tudo e execute
5. **Salve os resultados** de cada query em um arquivo de texto ou exporte como CSV

### Opção 2: Relatório Consolidado (Mais Rápido)

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Abra o arquivo `generate_database_report.sql`
4. Execute as queries
5. Exporte os resultados (especialmente a Query 2 que tem tudo consolidado)

## 📋 O que cada script analisa

### `analyze_database_structure.sql`

1. ✅ Lista todas as tabelas
2. ✅ Estrutura detalhada de cada tabela (colunas, tipos, constraints)
3. ✅ Todos os índices
4. ✅ Todas as constraints (PK, FK, UNIQUE)
5. ✅ Todos os triggers
6. ✅ Todas as funções/RPCs
7. ✅ Políticas RLS (Row Level Security)
8. ✅ Tabelas com RLS habilitado
9. ✅ Relacionamentos entre tabelas
10. ✅ Estatísticas (número de registros)
11. ✅ Tamanho das tabelas
12. ✅ Sequences (auto increment)
13. ✅ Views
14. ✅ Extensões instaladas
15. ✅ Análise específica das tabelas principais
16. ✅ Verificação de tabelas de pagamento existentes
17. ✅ Verificação de campos relacionados a pagamento
18. ✅ Resumo executivo

### `generate_database_report.sql`

- Relatório consolidado em formato mais legível
- Query única que exporta tudo em formato tabular
- Relacionamentos entre tabelas
- Estatísticas gerais
- Lista de tabelas com contagem de registros

## 📝 O que fazer com os resultados

### 1. Documentar a Estrutura Atual

Crie um arquivo `DATABASE_STRUCTURE.md` com:
- Lista de todas as tabelas
- Estrutura de cada tabela
- Relacionamentos
- Índices importantes

### 2. Identificar Tabelas Principais

Anote as tabelas principais do sistema:
- `profiles` - Perfis de usuários
- `clients` - Clientes Instagram
- `scheduled_posts` - Posts agendados
- Outras tabelas relevantes

### 3. Verificar Campos Existentes

Verifique se já existem campos relacionados a:
- Pagamentos
- Assinaturas
- Planos
- Billing

### 4. Planejar as Novas Tabelas

Com base na análise, planeje:
- Onde adicionar campos de subscription
- Quais tabelas criar (subscriptions, payments, plans)
- Como relacionar com tabelas existentes

## 🔍 Queries Específicas Importantes

### Verificar estrutura da tabela `profiles`

```sql
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'profiles'
ORDER BY ordinal_position;
```

### Verificar estrutura da tabela `clients`

```sql
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'clients'
ORDER BY ordinal_position;
```

### Verificar estrutura da tabela `scheduled_posts`

```sql
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'scheduled_posts'
ORDER BY ordinal_position;
```

### Listar todas as tabelas

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

## ⚠️ Importante

- **Não execute queries de modificação** (CREATE, ALTER, DROP) ainda
- **Apenas queries de leitura** (SELECT)
- **Salve os resultados** antes de fazer qualquer alteração
- **Documente tudo** para referência futura

## 📤 Próximos Passos

Após executar as análises:

1. ✅ Compartilhe os resultados comigo
2. ✅ Vou analisar a estrutura atual
3. ✅ Criar as migrations SQL para as novas tabelas
4. ✅ Planejar a integração com Stripe
5. ✅ Implementar o sistema de pagamentos

## 🆘 Dúvidas?

Se encontrar algum problema ao executar as queries:
- Verifique se está no schema correto (`public`)
- Certifique-se de ter permissões de leitura
- Algumas queries podem demorar em bancos grandes

---

**Data de criação:** 2025  
**Sistema:** INSYT - Instagram Scheduler  
**Objetivo:** Análise prévia para implementação de sistema de pagamentos
