import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Permitir apenas solicitações POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ message: 'Token de acesso não fornecido' });
    }

    try {
      // Verificar se o token ainda é válido fazendo uma chamada simples para a API do Facebook
      const response = await axios.get('https://graph.facebook.com/v21.0/me', {
        params: {
          access_token: accessToken,
          fields: 'id,name'
        }
      });

      // Se a chamada não lançar um erro, o token é válido
      return res.status(200).json({
        isValid: true,
        data: response.data
      });
    } catch (error: any) {
      console.error('Erro ao verificar token:', error);
      
      // Se o erro for relacionado ao token inválido ou expirado
      if (error.response && (error.response.status === 400 || error.response.status === 401)) {
        return res.status(200).json({
          isValid: false,
          error: error.response.data
        });
      }
      
      throw error;
    }
  } catch (error: any) {
    console.error('Erro ao processar verificação de token:', error);
    return res.status(500).json({
      message: error.message || 'Erro interno no servidor durante a verificação do token',
      details: error.response?.data || 'Sem detalhes adicionais'
    });
  }
}