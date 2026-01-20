# 📋 Instruções para Verificação do Banco de Dados

## Objetivo

Este script SQL (`VERIFICAR_ESTRUTURA_BANCO_COMPLETA.sql`) verifica toda a estrutura do banco de dados para:
1. Identificar problemas de visibilidade causados por RLS incorreto
2. Verificar se todas as políticas usam `organization_id` corretamente
3. Validar funções e triggers importantes
4. Criar um contexto completo do banco para uso futuro

## Como Usar

### 1. Executar o Script SQL

Execute o arquivo `VERIFICAR_ESTRUTURA_BANCO_COMPLETA.sql` no Supabase SQL Editor:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole todo o conteúdo do arquivo `VERIFICAR_ESTRUTURA_BANCO_COMPLETA.sql`
4. Execute o script
5. **Copie TODOS os resultados** de cada query

### 2. Organizar os Resultados

Os resultados são divididos em seções numeradas:

- **Seção 1:** Estrutura das tabelas (1.1 a 1.7)
- **Seção 2:** Foreign keys e relacionamentos
- **Seção 3:** Índices
- **Seção 4:** Políticas RLS (4.1 e 4.2)
- **Seção 5:** Funções importantes (5.1 e 5.2)
- **Seção 6:** Triggers (6.1 e 6.2)
- **Seção 7:** Cron jobs (7.1 e 7.2)
- **Seção 8:** Contagens e estatísticas (8.1 a 8.4)
- **Seção 9:** Roles e permissões (9.1 e 9.2)
- **Seção 10:** Problemas potenciais de visibilidade (10.1 e 10.2)
- **Seção 11:** Funções críticas de processamento
- **Seção 12:** Webhooks e integrações
- **Seção 13:** Resumo de validação (13.1 e 13.2)

### 3. Enviar os Resultados

Cole os resultados de TODAS as seções nesta conversa. O formato pode ser:
- Tabelas do Supabase
- JSON (se exportar)
- Texto formatado

## O Que Será Analisado

### Estrutura de Dados

✅ Verificação de colunas `organization_id` em todas as tabelas principais  
✅ Validação de foreign keys e relacionamentos  
✅ Identificação de índices necessários  

### Segurança (RLS)

✅ Verificação se RLS está habilitado onde necessário  
✅ Validação de políticas RLS para uso correto de `organization_id`  
✅ Identificação de políticas que usam `user_id` incorretamente  
✅ Verificação de políticas sem filtro de organização  

### Funções e Triggers

✅ Verificação de `SECURITY DEFINER` em funções críticas  
✅ Validação de triggers de limite (clients, profiles, posts)  
✅ Verificação de função `process_scheduled_posts_by_time`  
✅ Validação de função `get_user_organization_id`  

### Dados

✅ Contagem de registros sem `organization_id`  
✅ Distribuição de roles  
✅ Validação de integridade referencial  

## Próximos Passos Após Verificação

Após receber os resultados, vou:

1. **Analisar problemas de visibilidade** identificados na Seção 10
2. **Criar correções SQL** para políticas RLS incorretas
3. **Atualizar o contexto do banco** (`CONTEXTO_BANCO_DADOS.json`)
4. **Documentar a estrutura completa** do sistema

## Observações Importantes

⚠️ **Não pule nenhuma seção** - Todas são importantes para análise completa  
⚠️ **Copie os resultados completos** - Mesmo se parecerem vazios  
⚠️ **Inclua definições de funções** - Especialmente das Seções 5.1 e 11.1  

---

**Data de criação:** 2026-01-19  
**Última atualização:** 2026-01-19
