import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method == 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { nome, email, telefone } = req.body;

    const { data: planoData, error: rpcError } = await supabase.rpc('encontrar_e_reservar_vaga');

    if (rpcError) throw rpcError;

    const linkDoPlano = planoData && planoData.length > 0 ? planoData[0].convite_link : null;

    if (!linkDoPlano) {
      return res.status(404).json({ message: 'Nenhuma vaga disponível no momento.' });
    }

    const { error: clienteError } = await supabase.from('Clientes').insert([
      { nome, email, telefone, link_recebido: linkDoPlano }
    ]);

    if (clienteError) throw clienteError;

    return res.status(200).json({ link_convite: linkDoPlano });

  } catch (error) {
    console.error('Erro na função assinar_plano:', error.message);
    return res.status(500).json({ message: 'Erro interno no servidor.' });
  }
}