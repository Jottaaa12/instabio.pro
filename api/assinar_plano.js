import { createClient } from '@supabase/supabase-js';

// Configure o cliente Supabase.
// É ALTAMENTE RECOMENDÁVEL usar variáveis de ambiente (Environment Variables) na Vercel.
const supabaseUrl = process.env.SUPABASE_URL || 'https://ibbfrktduvhslbfwsnor.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'MINHA_CHAVE_SECRETA'; // Use a chave 'service_role' no backend

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // Aceitar apenas requisições do tipo POST
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Método ${req.method} não permitido` });
    }

    try {
        const { nome, email, telefone } = req.body;

        // Validação para garantir que os campos necessários foram enviados
        if (!nome || !email || !telefone) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios: nome, email e telefone.' });
        }

        // --- Lógica Transacional ---
        // Idealmente, os passos abaixo deveriam ser uma transação atômica.
        // No Supabase, isso é feito criando uma função RPC (Remote Procedure Call) no banco de dados.
        // Para simplificar, faremos as chamadas em sequência.

        // 1. Encontrar o primeiro plano com uma vaga disponível
        const { data: plano, error: erroBusca } = await supabase
            .from('Planos')
            .select('*')
            .lt('vagas_usadas', supabase.raw('vagas_totais')) // Compara a coluna 'vagas_usadas' com 'vagas_totais'
            .order('id', { ascending: true }) // Garante uma ordem previsível
            .limit(1)
            .single(); // Retorna um objeto único ou um erro se não encontrar

        // 2. Se não houver plano disponível, retorna erro 404
        if (erroBusca) {
            console.error('Erro ao buscar plano ou não há vagas:', erroBusca.message);
            return res.status(404).json({ message: 'Não há vagas disponíveis no momento. Tente novamente mais tarde.' });
        }

        // 3. Se encontrou um plano, insere o novo cliente
        const { error: erroCliente } = await supabase
            .from('Clientes')
            .insert({
                nome: nome,
                email: email,
                telefone: telefone,
                plano_id: plano.id, // Associa o cliente ao ID do plano encontrado
            });

        if (erroCliente) {
            console.error('Erro ao inserir cliente:', erroCliente);
            return res.status(500).json({ error: 'Ocorreu um erro ao registrar seus dados.' });
        }

        // 4. Atualiza a contagem de vagas do plano
        const novasVagasUsadas = plano.vagas_usadas + 1;
        const { error: erroUpdate } = await supabase
            .from('Planos')
            .update({ vagas_usadas: novasVagasUsadas })
            .eq('id', plano.id);

        if (erroUpdate) {
            // Em um cenário real, seria preciso reverter a inserção do cliente (rollback)
            console.error('Erro ao atualizar contagem de vagas:', erroUpdate);
            return res.status(500).json({ error: 'Ocorreu um erro ao alocar sua vaga.' });
        }

        // 5. Retorna o link do Spotify com sucesso
        res.status(200).json({ link_spotify: plano.link_spotify });

    } catch (e) {
        console.error('Erro inesperado na função:', e);
        res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
    }
}
