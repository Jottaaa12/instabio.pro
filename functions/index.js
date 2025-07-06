const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const axios = require('axios');

// Inicializa o Firebase Admin
admin.initializeApp();

// Configurações do Mercado Pago
// IMPORTANTE: Substitua 'YOUR_ACCESS_TOKEN' pelo seu token do Mercado Pago
const MERCADO_PAGO_TOKEN = 'YOUR_ACCESS_TOKEN';
const mercadoPagoApi = axios.create({
    baseURL: 'https://api.mercadopago.com/v1',
    headers: {
        'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

// Função para criar pagamento
exports.createPayment = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ error: 'E-mail é obrigatório' });
            }

            // Cria o pagamento no Mercado Pago
            const paymentData = {
                transaction_amount: 10.00,
                payment_method_id: 'pix',
                payer: {
                    email: email
                },
                description: 'Plano Spotify Econômico'
            };

            const mpResponse = await mercadoPagoApi.post('/payments', paymentData);
            const paymentId = mpResponse.data.id;
            const pixData = mpResponse.data.point_of_interaction.transaction_data;

            // Salva a transação no Firestore
            await admin.firestore().collection('payments').doc(paymentId.toString()).set({
                email: email,
                status: 'pending',
                transactionId: paymentId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                amount: 10.00
            });

            // Retorna os dados do PIX
            res.json({
                transactionId: paymentId,
                qrCodeImage: pixData.qr_code_base64,
                pixCopiaECola: pixData.qr_code
            });

        } catch (error) {
            console.error('Erro ao criar pagamento:', error);
            res.status(500).json({ error: 'Erro ao processar pagamento' });
        }
    });
});

// Função para verificar status do pagamento
exports.checkPaymentStatus = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            const { transactionId } = req.body;

            if (!transactionId) {
                return res.status(400).json({ error: 'ID da transação é obrigatório' });
            }

            // Consulta o status no Firestore
            const paymentDoc = await admin.firestore().collection('payments').doc(transactionId.toString()).get();
            
            if (!paymentDoc.exists) {
                return res.status(404).json({ error: 'Pagamento não encontrado' });
            }

            res.json({ status: paymentDoc.data().status });

        } catch (error) {
            console.error('Erro ao verificar status:', error);
            res.status(500).json({ error: 'Erro ao verificar status do pagamento' });
        }
    });
});

// Webhook para receber notificações do Mercado Pago
exports.paymentWebhook = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            const { data } = req.body;
            
            // Verifica se é uma notificação de pagamento
            if (data.type === 'payment') {
                // Consulta os detalhes do pagamento no Mercado Pago
                const paymentResponse = await mercadoPagoApi.get(`/payments/${data.id}`);
                const payment = paymentResponse.data;

                // Atualiza o status no Firestore
                if (payment.status === 'approved') {
                    await admin.firestore().collection('payments').doc(data.id.toString()).update({
                        status: 'paid',
                        paidAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }

            res.json({ received: true });

        } catch (error) {
            console.error('Erro no webhook:', error);
            res.status(500).json({ error: 'Erro ao processar webhook' });
        }
    });
}); 