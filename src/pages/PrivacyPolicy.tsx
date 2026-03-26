import React from 'react';
import { Box, Container, Paper, Typography, Link } from '@mui/material';

const PrivacyPolicy: React.FC = () => {
  const lastUpdated = '26/03/2026';

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="md">
        <Paper elevation={1} sx={{ p: { xs: 3, md: 5 } }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Politica de Privacidade
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Ultima atualizacao: {lastUpdated}
          </Typography>

          <Typography variant="body1" paragraph>
            Esta Politica de Privacidade descreve como o AUPE Instagram Scheduler coleta, usa,
            armazena e protege dados pessoais e dados de contas do Instagram conectadas ao sistema.
          </Typography>

          <Typography variant="h6" gutterBottom>
            1. Dados que coletamos
          </Typography>
          <Typography variant="body1" paragraph>
            Podemos coletar dados de cadastro (nome, e-mail), dados da organizacao, dados de uso da
            plataforma e dados da conta profissional do Instagram conectada via OAuth, como username,
            id da conta, foto de perfil, token de acesso e metadados necessarios para operacao.
          </Typography>

          <Typography variant="h6" gutterBottom>
            2. Como usamos os dados
          </Typography>
          <Typography variant="body1" paragraph>
            Usamos os dados para autenticar usuarios, vincular contas do Instagram, publicar
            conteudo autorizado, exibir informacoes basicas da conta conectada, gerar relatorios
            operacionais e manter seguranca e rastreabilidade da plataforma.
          </Typography>

          <Typography variant="h6" gutterBottom>
            3. Compartilhamento de dados
          </Typography>
          <Typography variant="body1" paragraph>
            Nao vendemos dados pessoais. Compartilhamos dados somente quando necessario para a
            prestacao do servico, com provedores de infraestrutura e APIs oficiais (ex.: Meta/Instagram),
            ou para cumprimento de obrigacao legal.
          </Typography>

          <Typography variant="h6" gutterBottom>
            4. Base legal e conformidade
          </Typography>
          <Typography variant="body1" paragraph>
            O tratamento de dados ocorre de acordo com a LGPD e demais normas aplicaveis, com base em
            execucao de contrato, legitimo interesse e, quando necessario, consentimento do titular.
          </Typography>

          <Typography variant="h6" gutterBottom>
            5. Retencao e seguranca
          </Typography>
          <Typography variant="body1" paragraph>
            Mantemos medidas tecnicas e administrativas para proteger os dados contra acesso nao
            autorizado, perda e uso indevido. Dados sao retidos somente pelo periodo necessario para
            cumprir as finalidades descritas nesta politica e obrigacoes legais.
          </Typography>

          <Typography variant="h6" gutterBottom>
            6. Direitos do titular
          </Typography>
          <Typography variant="body1" paragraph>
            Voce pode solicitar confirmacao de tratamento, acesso, correcao, portabilidade,
            anonimização, exclusao e demais direitos previstos na legislacao aplicavel, observadas
            as hipoteses legais.
          </Typography>

          <Typography variant="h6" gutterBottom>
            7. Integracao com Instagram/Meta
          </Typography>
          <Typography variant="body1" paragraph>
            Ao conectar uma conta do Instagram, o usuario autoriza o acesso estritamente necessario
            para as funcionalidades do sistema. O uso segue os termos e politicas da Meta Platform.
            Nao solicitamos credenciais de login do Instagram; a conexao ocorre via OAuth oficial.
          </Typography>

          <Typography variant="h6" gutterBottom>
            8. Contato
          </Typography>
          <Typography variant="body1" paragraph>
            Para duvidas sobre privacidade ou exercicio de direitos, entre em contato pelo e-mail:
            {' '}
            <Link href="mailto:marquessilva600@gmail.com">marquessilva600@gmail.com</Link>.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default PrivacyPolicy;
