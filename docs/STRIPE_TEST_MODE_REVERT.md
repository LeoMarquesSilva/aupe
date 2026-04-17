# Stripe — Reversão TEST → LIVE

Documento gerado durante a migração temporária para TEST mode (ver migration `20260417_stripe_test_swap.sql`).

## Quando reverter

Após concluir o teste ponta-a-ponta com o cartão `4242 4242 4242 4242` e confirmar que:

- `/plans` carrega os 5 planos corretamente.
- Checkout para STARTER redireciona para `checkout.stripe.com` em test mode (`cs_test_...`).
- Webhook `checkout.session.completed` é recebido e cria linha em `subscriptions` com `status=active`.
- Add-on "Fluxo de Aprovação" pode ser adicionado via `SubscriptionAddons` e aparece em `subscription_addon_items`.

## Passos de reversão (ordem importa)

### 1) Banco de dados

```sh
# Aplique a migration inversa (já criada em supabase/migrations):
20260418_stripe_revert_to_live.sql
```

A migration restaura `stripe_price_id` / `stripe_product_id` a partir das colunas de backup `*_live`.

### 2) Frontend config

Restaure `src/config/stripeProducts.ts` a partir do backup:

```sh
copy src\config\stripeProducts.live.ts.bak src\config\stripeProducts.ts /Y
```

(O backup foi criado automaticamente antes do swap.)

### 3) Variáveis de ambiente local (`.env`)

Trocar:

```dotenv
REACT_APP_STRIPE_PUBLISHABLE_KEY=<valor de REACT_APP_STRIPE_PUBLISHABLE_KEY_LIVE_BACKUP>
REACT_APP_STRIPE_SECRET_KEY=<valor de STRIPE_SECRET_KEY_LIVE_BACKUP>
```

### 4) Supabase Edge Functions secrets

Dashboard → Project `mrkcoolfxqiwaqeyquuf` → **Settings → Edge Functions → Secrets** → Edit:

| Secret | Novo valor |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` (recuperar do `STRIPE_SECRET_KEY_LIVE_BACKUP` no Vercel, NÃO colar aqui) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` do webhook LIVE (ver Stripe Dashboard **live mode** → Developers → Webhooks) |

### 5) Webhook endpoint LIVE

Confirme que existe um webhook LIVE no Stripe apontando para `https://mrkcoolfxqiwaqeyquuf.supabase.co/functions/v1/stripe-webhook` com os mesmos 6 eventos:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### 6) Arquivar webhook TEST

O webhook TEST criado em 2026-04-17 tem ID `we_1TNCFt5QaHLfiCdUo7T5OPEa`. Pode ser **desabilitado** ou **deletado** no Dashboard Stripe (modo Test → Developers → Webhooks) para evitar notificações residuais durante testes futuros.

### 7) Restart

```sh
npm run dev
```

## Checklist de validação pós-reversão

- [ ] `/plans` carrega os 5 planos com preços corretos (R$30 / R$178 / R$356 / R$500 / A Consultar).
- [ ] Abrir console do navegador: nenhuma menção a `pk_test_` ou `cs_test_`.
- [ ] No Supabase, `SELECT stripe_price_id FROM subscription_plans WHERE plan_code='STARTER'` retorna `price_1TMy0m...` (LIVE).
- [ ] Stripe Dashboard mostra o webhook LIVE como "Enabled, status=ok".
