# Implementação no N8N: Retry para Reels (error code 0)

Workflow obtido via MCP: **SISTEMA DE AGENDAMENTO - IG** (ID: `SqUJlgdkKTISkcar`).

Quando o container de Reels retorna `ERROR` ("error code 0"), o fluxo atual envia direto para **Stop and Error**. Este guia descreve como inserir uma **última chance**: esperar 2–3 min, rechecar o status no Instagram e, se `FINISHED`, publicar; caso contrário, aí sim falhar.

---

## Fluxo atual (Reels)

```
VALIADÇÃO → Switch1
  ├ TRUE (ready_to_publish) → Publicar Reel no Instagram → Atualizar Status Supabase
  ├ PARAR (force_stop)      → Stop and Error
  └ RETRY (force_stop false)→ Wait3 → VALIADÇÃO (loop)
```

Quando `container_status === 'error'`, o nó VALIADÇÃO devolve `force_stop: true`, então Switch1 manda para **PARAR** → **Stop and Error**.

---

## Alteração desejada

Antes de ir para **Stop and Error**, quando a saída do Switch1 for **PARAR** (erro no container):

1. **Wait** 180 segundos (3 min).
2. **Rechecar status** do mesmo container: `GET https://graph.facebook.com/v22.0/{container_id}?fields=status_code&access_token={access_token}`.
3. Se `status_code === 'FINISHED'`: seguir para **Publicar Reel no Instagram** (e depois Atualizar Status Supabase).
4. Se continuar `ERROR` ou outro: aí sim ir para **Stop and Error** (ou Error Handler).

---

## Passos na interface do N8N

### 1. Inserir nó Wait após Switch1 (saída PARAR)

- **Tipo:** Wait  
- **Nome sugerido:** `Wait Reels Error Retry`  
- **Configuração:** 180 segundos (Resume: After time interval).  
- **Conexão:** Entrada a partir da saída **PARAR** do nó **Switch1**.  
- A saída deste Wait segue para o próximo nó (Rechecar Status).

### 2. Inserir nó para rechecar o status do container

- **Tipo:** Code ou HTTP Request.  
- **Nome sugerido:** `Rechecar Status Reel após Wait`

**Opção A – HTTP Request**

- **Method:** GET  
- **URL:**  
  `https://graph.facebook.com/v22.0/{{ $json.id }}/?fields=status_code&access_token={{ $json.access_token }}`  
- O input deve ser o item que saiu do Wait (contém `id` do container e `access_token` do Combinar Dados). Garanta que o payload que chega no Wait tenha `id` e `access_token` (propague do VALIADÇÃO/Switch1).

**Opção B – Code (recomendado para manter contexto)**

```javascript
const item = $input.item.json;
const containerId = item.id;
const accessToken = item.access_token;

if (!containerId || !accessToken) {
  return [{ json: { ...item, status_code: 'ERROR', ready_to_publish: false, force_stop: true } }];
}

const url = `https://graph.facebook.com/v22.0/${containerId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`;
const response = await this.helpers.httpRequest({ method: 'GET', url, json: true });

const statusCode = response.status_code || 'ERROR';
const ready = statusCode === 'FINISHED';

return [{
  json: {
    ...item,
    status_code: statusCode,
    ready_to_publish: ready,
    force_stop: !ready,
    id: containerId,
    access_token: accessToken,
    message: ready ? 'Container processado com sucesso após retry!' : `Ainda ${statusCode} após espera.`
  }
}];
```

- **Conexão:** Entrada a partir da saída do nó **Wait Reels Error Retry**.  
- Saída deste nó segue para um **Switch** (próximo passo).

### 3. Inserir Switch após “Rechecar Status Reel”

- **Nome sugerido:** `Switch Reels Após Retry`  
- **Regras:**
  - **Saída 1 (ex.: "Publicar"):** condição `{{ $json.ready_to_publish }}` igual a `true` → conectar a **Publicar Reel no Instagram**.
  - **Saída 2 (ex.: "Falha"):** caso contrário → conectar a **Stop and Error** (ou ao Error Handler, conforme seu fluxo de falha de Reels).

Garanta que o **Publicar Reel no Instagram** receba o mesmo formato que ele já espera (ex.: `creation_id` = `$json.id` e token do Combinar Dados). Se o nó de rechecar status repassar `id` e `access_token` no `json`, e o **Publicar Reel no Instagram** usar `$json.id` e token do contexto, pode ser necessário usar uma expressão que busque o token do **Combinar Dados** (ex.: `$('Combinar Dados').first().json.access_token`) no nó de publicar.

### 4. Ajustar conexões

- **Switch1** (saída **PARAR**): desconectar de **Stop and Error**. Conectar a **Wait Reels Error Retry**.  
- **Wait Reels Error Retry** → **Rechecar Status Reel após Wait**.  
- **Rechecar Status Reel após Wait** → **Switch Reels Após Retry**.  
- **Switch Reels Após Retry** (Publicar) → **Publicar Reel no Instagram**.  
- **Switch Reels Após Retry** (Falha) → **Stop and Error**.

### 5. Dados no item que chega no Wait

O item na saída **PARAR** do Switch1 vem do **VALIADÇÃO** e deve conter, entre outros: `id` (container_id), `access_token`, e os demais campos que **Publicar Reel no Instagram** e o Supabase precisam. Se **Publicar Reel no Instagram** usar referências a nós anteriores (ex.: `$('Combinar Dados').first().json`), o fluxo após o retry pode continuar a funcionar; caso use apenas `$json`, o nó de rechecar status deve repassar no `json` tudo que **Publicar Reel no Instagram** e o **Atualizar Status Supabase** precisam (postId, access_token, instagram_account_id, etc.). O código de rechecar status acima faz `...item`, então preserva os campos do item que veio do Wait.

---

## Resumo das conexões (após implementado)

```
Switch1 [PARAR] → Wait Reels Error Retry (180s)
  → Rechecar Status Reel após Wait (GET status_code)
  → Switch Reels Após Retry
      ├ ready_to_publish = true  → Publicar Reel no Instagram → Atualizar Status Supabase
      └ else                     → Stop and Error
```

---

## Por que o mesmo vídeo falhou uma vez e passou depois?

Se o **mesmo** vídeo (ou o mesmo conteúdo) foi agendado de novo e publicou na primeira tentativa, sem passar pelo retry (Aguardar → Rechecar), as causas mais prováveis são:

1. **Falha transitória da API do Instagram**  
   O "error code 0" é genérico. Em alguns casos o processamento do container demora mais e, na primeira checagem (30s ou 60s), a API ainda devolve `ERROR`; minutos depois o mesmo container pode estar `FINISHED`. Na próxima execução, o horário ou a carga do servidor podem fazer o processamento terminar antes da primeira checagem, e aí o fluxo segue direto para Publicar sem precisar do retry.

2. **Diferença de conta ou de arquivo**  
   - Conta diferente: no erro antigo o `instagram_account_id` era `17841457581123518`; no sucesso que você mandou é `17841459848635231`. Se o novo teste foi em outra conta, a outra conta pode processar o vídeo mais rápido ou sem o mesmo problema.  
   - Mesmo vídeo lógico, mas **novo arquivo** (nova URL no Supabase, ex. outro `postId`): um re-upload pode gerar outro codec/container ou outra latência de CDN, e o Instagram pode responder diferente.

3. **Horário / carga**  
   Em um horário a API pode estar mais lenta ou instável e devolver ERROR na primeira checagem; em outro, responder FINISHED no tempo normal.

**Conclusão:** Não dá para afirmar a causa exata sem ver o run que falhou. O retry (Aguardar 3 min + Rechecar) existe justamente para cobrir esses casos em que o container fica ERROR na primeira checagem e depois passa para FINISHED.

---

## Consultar execuções no N8N

O **MCP do N8N** não expõe histórico de execuções (apenas search_workflows, get_workflow_details e execute_workflow). Para comparar o run que falhou com o que deu certo:

1. No N8N, abra o workflow **SISTEMA DE AGENDAMENTO - IG**.
2. Vá em **Executions** (histórico de execuções).
3. Localize a execução que falhou (ex.: pelo `postId` ou pela data/hora do post que ficou com status `failed` no Supabase).
4. Compare com uma execução que publicou: payload de entrada, nó onde parou, mensagem de erro e tempo entre criação do container e a checagem de status.

Assim você vê se na falha o container foi checado muito cedo, se a conta era outra, ou se o payload (URL do vídeo, etc.) era diferente.

---

## Nota

Este comportamento cobre falhas transitórias ("error code 0"). Se após a espera o status continuar ERROR, o post será marcado como falha e a mensagem pode sugerir reconverter o vídeo para MP4 (H.264 + AAC) e reagendar (conforme documentado em `docs/SISTEMA_AGENDAMENTO_COMPLETO.md` e `documentacao_sistema_agendamento_n8n.md`).
