-- ============================================
-- Links temporários para compartilhar dashboard com o cliente
-- Permite enviar um link ao cliente para visualizar os dados do Instagram
-- ============================================

CREATE TABLE client_share_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT token_not_empty CHECK (char_length(trim(token)) >= 16)
);

-- Índices para busca por token (acesso público) e por client_id (gestão)
CREATE UNIQUE INDEX idx_client_share_links_token ON client_share_links(token);
CREATE INDEX idx_client_share_links_client_id ON client_share_links(client_id);
CREATE INDEX idx_client_share_links_expires_at ON client_share_links(expires_at);

-- RLS: apenas usuários da mesma organização do cliente podem criar/listar/revogar links
ALTER TABLE client_share_links ENABLE ROW LEVEL SECURITY;

-- Política SELECT: usuários da organização do cliente podem ver os links do cliente
CREATE POLICY "client_share_links_select_own_org"
ON client_share_links
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clients c
    INNER JOIN profiles p ON p.id = auth.uid()
    WHERE c.id = client_share_links.client_id
    AND c.organization_id = p.organization_id
  )
);

-- Política INSERT: usuários da organização podem criar links para seus clientes
CREATE POLICY "client_share_links_insert_own_org"
ON client_share_links
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients c
    INNER JOIN profiles p ON p.id = auth.uid()
    WHERE c.id = client_share_links.client_id
    AND c.organization_id = p.organization_id
  )
);

-- Política DELETE: usuários da organização podem revogar links
CREATE POLICY "client_share_links_delete_own_org"
ON client_share_links
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clients c
    INNER JOIN profiles p ON p.id = auth.uid()
    WHERE c.id = client_share_links.client_id
    AND c.organization_id = p.organization_id
  )
);

COMMENT ON TABLE client_share_links IS 'Links temporários para o cliente visualizar o dashboard do Instagram sem login';
