-- Suporte a refresh de long-lived tokens (regra Meta: token com ≥24h desde emissão)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS instagram_long_lived_issued_at TIMESTAMPTZ;

COMMENT ON COLUMN public.clients.instagram_long_lived_issued_at IS
  'Momento em que o token long-lived atual do Instagram foi emitido (Business Login). Usado para respeitar a janela mínima de 24h antes de refresh.';
