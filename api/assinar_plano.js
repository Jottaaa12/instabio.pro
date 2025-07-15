import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // CORREÇÃO 1: Garante que apenas o método POST é permitido
  if (req.method.toUpperCase() !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { nome, email, telefone } = req.body;

    const { data: rpcData, error: rpcError } = await supabase.rpc('encontrar_e_reservar_vaga');

    if (rpcError) throw rpcError;

    // Extrai os dados retornados pela função SQL
    const dadosDoPlano = rpcData && rpcData.length > 0 ? rpcData[0] : null;

    // CORREÇÃO 2: Verifica se NÃO foram encontrados dados (ou seja, não há vagas)
    if (!dadosDoPlano) {
      return res.status(404).json({ message: 'Nenhuma vaga disponível no momento.' });
    }

    // Separa o ID e o Link para uso
    const idDoPlano = dadosDoPlano.plano_id_retornado;
    const linkDoPlano = dadosDoPlano.convite_link;

    // CORREÇÃO 3: Insere o novo cliente com a referência correta ao plano_id
    const { error: clienteError } = await supabase.from('Clientes').insert([
      { nome, email, telefone, link_recebido: linkDoPlano, plano_id: idDoPlano }
    ]);

    if (clienteError) throw clienteError;

    // Retorna o link de convite com sucesso
    return res.status(200).json({ link_convite: linkDoPlano });

  } catch (error) {
    console.error('Erro na função assinar_plano:', error.message);
    return res.status(500).json({ message: 'Erro interno no servidor.', details: error.message });
  }
}