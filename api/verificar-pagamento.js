export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', ['POST']);
    return response.status(405).end(`Method ${request.method} Not Allowed`);
  }

  try {
    const { slug, transaction_id } = request.body;

    if (!slug || !transaction_id) {
      return response.status(400).json({ error: 'Parâmetros slug ou transaction_id ausentes.' });
    }

    const infinitePayURL = 'https://api.infinitepay.io/invoices/public/checkout/payment_check/jottaaa0';

    const requestBody = {
      handle: 'jottaaa0',
      slug: slug,
      transaction_nsu: transaction_id,
    };

    const infinitePayResponse = await fetch(infinitePayURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!infinitePayResponse.ok) {
      console.error('Erro na API da InfinitePay:', await infinitePayResponse.text());
      return response.status(402).json({ message: 'Falha ao verificar o pagamento com o provedor.' });
    }

    const paymentData = await infinitePayResponse.json();

    if (paymentData.paid === true) {
      return response.status(200).json({ message: 'Pagamento verificado com sucesso.' });
    } else {
      return response.status(402).json({ message: 'Pagamento não confirmado.' });
    }

  } catch (error) {
    console.error('Erro interno do servidor:', error);
    return response.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
  }
}