#!/usr/bin/env sh
# Exemplo: chamar a Edge Function de refresh (após deploy + secrets no Supabase).
# Defina INSTAGRAM_REFRESH_CRON_SECRET igual ao secret da função.
# SUBSTITUA PROJECT_REF pela referência do projeto Supabase.

# curl -sS -X POST \
#   "https://PROJECT_REF.supabase.co/functions/v1/instagram-refresh-tokens" \
#   -H "Content-Type: application/json" \
#   -H "x-cron-secret: SEU_INSTAGRAM_REFRESH_CRON_SECRET"

echo "Edite e descomente o curl acima com PROJECT_REF e o secret."
