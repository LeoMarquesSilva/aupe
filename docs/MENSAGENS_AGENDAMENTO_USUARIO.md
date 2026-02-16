# Mensagens exibidas ao usuário no fluxo de agendamento

Este documento lista **todas as mensagens** que o usuário vê ao agendar posts, reels e stories, **em qual tela/situação** aparecem e **quais problemas** têm (ex.: menção a "Supabase Storage").

---

## 1. CreatePost (Post / Carrossel)

| Situação | Mensagem atual | Onde aparece | Problema |
|----------|----------------|-------------|----------|
| **Sucesso ao agendar** | `Postagem agendado com sucesso! Imagens salvas no Supabase Storage.` (ou "Carrossel...") | Snackbar (notificação) | ❌ "Supabase Storage" é termo técnico; usuário não precisa saber onde as imagens ficam. |
| **Sucesso ao postar agora** | `Postagem enviado com sucesso! Imagens salvas no Supabase Storage.` (ou "Carrossel...") | Snackbar | ❌ Mesmo problema. |
| **Erro ao agendar** | `Erro ao agendar postagem: ${error.message}` | Snackbar | ❌ `error.message` pode vir do Supabase (ex.: "new row violates row-level security policy") – texto técnico. |
| **Erro ao enviar** | `Erro ao enviar postagem: ${error.message}` | Snackbar | ❌ Idem. |
| Carregar clientes | `Erro ao carregar clientes` | Snackbar | ⚠️ Pode ser genérico. |
| Cliente inválido | `Cliente não encontrado` | Snackbar | ✅ OK. |
| Instagram não conectado | `Esta conta não está conectada ao Instagram. Conecte-a antes de agendar posts.` | Snackbar + Alert no card | ✅ OK. |
| Data inválida | `Data/hora inválida` / `Erro ao validar data/hora` | Snackbar | ✅ OK. |
| Upload falhou | `Falha ao fazer upload das imagens` | Snackbar | ⚠️ Poderia ser mais amigável (ex.: "Não foi possível enviar as imagens. Tente novamente."). |
| Alert no formulário (conta não conectada) | `Esta conta não está conectada ao Instagram. Não é possível agendar ou publicar posts. Por favor, conecte a conta nas configurações do cliente.` | Alert embaixo dos botões | ✅ OK. |

---

## 2. CreateReels

| Situação | Mensagem atual | Onde aparece | Problema |
|----------|----------------|-------------|----------|
| **Sucesso ao agendar** | `Reel agendado com sucesso!` | Snackbar | ✅ OK – não menciona Supabase. |
| **Sucesso ao enviar** | `Reel enviado com sucesso!` | Snackbar | ✅ OK. |
| **Erro ao agendar** | `Erro ao agendar Reel: ${error.message}` | Snackbar | ❌ `error.message` pode ser técnico. |
| **Erro ao enviar** | `Erro ao enviar Reel: ${error.message}` | Snackbar | ❌ Idem. |
| Carregar clientes | `Erro ao carregar clientes` | Snackbar | ⚠️ Genérico. |
| Cliente inválido | `Cliente não encontrado` | Snackbar | ✅ OK. |
| Instagram não conectado | `Esta conta não está conectada ao Instagram. Conecte-a antes de agendar Reels.` | Snackbar | ✅ OK. |
| Data inválida | `Data/hora inválida` / `Erro ao validar data/hora` | Snackbar | ✅ OK. |
| Dados inválidos | `Dados inválidos` | Snackbar | ⚠️ Muito vago. |

---

## 3. CreateStory

| Situação | Mensagem atual | Onde aparece | Problema |
|----------|----------------|-------------|----------|
| **Sucesso ao agendar** | `Story agendado com sucesso! Imagens salvas no Supabase Storage.` | Snackbar | ❌ Mesmo problema de "Supabase Storage". |
| **Sucesso ao enviar** | `Story enviado com sucesso! Imagens salvas no Supabase Storage.` | Snackbar | ❌ Idem. |
| **Erro ao agendar** | `Erro ao agendar story: ${error.message}` | Snackbar | ❌ `error.message` pode ser técnico. |
| **Erro ao enviar** | `Erro ao enviar story: ${error.message}` | Snackbar | ❌ Idem. |
| Carregar clientes | `Erro ao carregar clientes` | Snackbar | ⚠️ Genérico. |
| Cliente inválido | `Cliente não encontrado` | Snackbar | ✅ OK. |
| Instagram não conectado | `Esta conta não está conectada ao Instagram. Conecte-a antes de agendar stories.` | Snackbar | ✅ OK. |
| Data inválida | `Data/hora inválida` / `Erro ao validar data/hora` | Snackbar | ✅ OK. |
| Upload falhou | `Falha ao fazer upload das imagens` | Snackbar | ⚠️ Idem CreatePost. |

---

## 4. EditPost

| Situação | Mensagem atual | Onde aparece | Problema |
|----------|----------------|-------------|----------|
| **Sucesso ao salvar** | `Post atualizado com sucesso!` | Snackbar | ✅ OK. |
| **Erro ao salvar** | `Erro ao salvar: ${error.message}` | Snackbar | ❌ `error.message` pode ser técnico. |
| Post não encontrado | `ID do post não fornecido` / `Post não encontrado` / `Erro ao carregar post` | Snackbar + redirect | ✅ OK. |
| Post não editável | `Este post não pode ser editado porque já foi publicado ou está em processamento.` | Alert | ✅ OK. |

---

## 5. Serviços (mensagens que podem “vazar” para o usuário)

### postService.ts

| Situação | Mensagem | Quando o usuário vê |
|----------|-----------|----------------------|
| Upload falhou (nenhuma imagem) | `Falha ao fazer upload das imagens: ${errors[0].message}` | CreatePost / CreateStory quando o upload falha. |
| Cliente sem Instagram | `Cliente não possui credenciais do Instagram configuradas. Conecte a conta do Instagram primeiro.` | Se tentar agendar sem conectar. |
| Limite de plano | `limitCheck.message` ou `Não é possível agendar mais posts este mês. Faça upgrade do seu plano.` | Quando atinge limite de posts. |
| Formato de imagens | `Formato de imagens não reconhecido` | Caso inesperado. |
| **Retorno de sucesso (não usado na UI hoje)** | `Post agendado com sucesso para [data]! Será processado automaticamente...` | CreatePost/CreateStory **ignoram** essa mensagem e mostram a que menciona "Supabase Storage". |

### supabaseClient.ts (postService.saveScheduledPost)

| Situação | Mensagem | Quando o usuário vê |
|----------|-----------|----------------------|
| Erro ao salvar | `Não foi possível salvar o post: ${error.message}` | Qualquer falha ao gravar no banco; `error.message` pode ser técnico (ex.: "duplicate key", "RLS policy"). |

---

## 6. Outras telas relacionadas

| Componente | Mensagem | Situação |
|------------|----------|----------|
| **ScheduledPostsList** | `Não há posts agendados para este cliente.` | Quando a lista de agendados está vazia. ✅ OK. |

---

## Resumo dos problemas

1. **“Supabase Storage” em mensagens de sucesso**  
   - CreatePost e CreateStory dizem que as imagens foram “salvas no Supabase Storage”.  
   - Deve ser algo como “Postagem agendada com sucesso!” sem citar tecnologia.

2. **Erro técnico na tela**  
   - Vários lugares usam `(error as Error).message` ou `error.message` direto no Snackbar.  
   - O usuário pode ver mensagens do Supabase (RLS, constraint, etc.).  
   - Solução: mapear erros conhecidos para mensagens amigáveis e usar uma mensagem genérica para o resto.

3. **Mensagens vagas**  
   - “Dados inválidos”, “Falha ao fazer upload das imagens” podem ser um pouco mais claras e orientadas à ação.

---

## Plano sugerido para mudanças

### Fase 1 – Sucesso (remover “Supabase Storage”)

- **CreatePost.tsx**  
  - Trocar mensagem de sucesso ao **agendar** para algo como:  
    `Postagem agendada com sucesso! Ela será publicada na data e hora escolhidas.`  
  - Trocar mensagem de sucesso ao **postar agora** para:  
    `Postagem enviada com sucesso!`
- **CreateStory.tsx**  
  - Idem: sucesso ao agendar e ao enviar **sem** mencionar “Supabase Storage”.

### Fase 2 – Erros amigáveis

- Criar um **mapeamento de erros** (ex.: em `utils/errorMessages.ts` ou no próprio `postService`):
  - Erros conhecidos do Supabase (RLS, unique, etc.) → mensagens em português (ex.: “Você não tem permissão para esta ação”, “Já existe um agendamento com estes dados”).
  - Upload / storage → “Não foi possível enviar as imagens. Tente novamente ou use outras imagens.”
  - Limite de plano → manter ou melhorar a mensagem já existente.
- Em **CreatePost**, **CreateReels**, **CreateStory** e **EditPost**:  
  - Em vez de `Erro ao agendar postagem: ${(error as Error).message}`, usar uma função `getUserFriendlyMessage(error)` que devolve a mensagem amigável (e, se necessário, uma mensagem genérica para erros desconhecidos).

### Fase 3 – Ajustes pontuais

- **Upload**: trocar “Falha ao fazer upload das imagens” por algo como “Não foi possível enviar as imagens. Tente novamente.”
- **CreateReels – “Dados inválidos”**: substituir por mensagem mais específica se possível (ex.: “Preencha o vídeo e a legenda”).
- **supabaseClient**: ao dar throw em `saveScheduledPost`, usar mensagem genérica para o usuário em vez de `error.message` cru, ou então garantir que quem chama (CreatePost/CreateStory/etc.) sempre passe o erro por `getUserFriendlyMessage()`.

**Implementado:** Fase 1, 2 e 3 aplicadas; criado `getUserFriendlyMessage` e componente `AppSnackbar` (visual clean). Se quiser, na próxima etapa podemos implementar a Fase 1 (remover “Supabase Storage” e padronizar as mensagens de sucesso) e esboçar o `getUserFriendlyMessage` e onde usá-lo.
