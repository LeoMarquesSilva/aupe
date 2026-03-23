-- Destinos distintos: resposta do cliente (link de aprovação) vs. resposta do gestor (revisão interna).

ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS client_approval_phone text,
  ADD COLUMN IF NOT EXISTS internal_approval_phone text;

COMMENT ON COLUMN public.whatsapp_config.client_approval_phone IS 'WhatsApp destino quando o cliente responde ao link de aprovação; vazio usa phone_number';
COMMENT ON COLUMN public.whatsapp_config.internal_approval_phone IS 'WhatsApp destino quando o gestor responde ao link de revisão interna; vazio = não notificar este fluxo';
