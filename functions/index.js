const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const cors = require("cors");
const axios = require("axios");
const crypto = require("crypto");

// Inicializa o Firebase Admin
admin.initializeApp();

// Configura o CORS de forma mais robusta
const corsHandler = cors({ origin: "https://jottaaa12.github.io" });

// --- O JEITO CORRETO DE BUSCAR AS CHAVES SECRETAS ---
// Para configurar, rode no terminal:
// firebase functions:config:set mercadopago.token="SEU_ACCESS_TOKEN"
// firebase functions:config:set mercadopago.secret="SUA_CHAVE_SECRETA_DO_WEBHOOK"
const mercadoPagoAccessToken = process.env.MERCADOPAGO_TOKEN;
const webhookSecret = process.env.MERCADOPAGO_SECRET;

// --- FUNÇÃO PARA CRIAR O PAGAMENTO ---
exports.createPayment = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    // Adicionado para lidar com a requisição preflight OPTIONS do CORS
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "E-mail é obrigatório" });
      }

      const paymentData = {
        transaction_amount: 10.00,
        description: "Acesso Plano Spotify",
        payment_method_id: "pix",
        payer: { email: email },
      };

      const mpResponse = await axios.post(
        "https://api.mercadopago.com/v1/payments",
        paymentData,
        {
          headers: {
            Authorization: `Bearer ${mercadoPagoAccessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const paymentId = mpResponse.data.id;
      const pixData = mpResponse.data.point_of_interaction.transaction_data;

      await admin.firestore().collection("payments").doc(String(paymentId)).set({
        email: email,
        status: "pending",
        paymentId: paymentId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({
        paymentId: paymentId,
        qrCodeImage: pixData.qr_code_base64,
        pixCopiaECola: pixData.qr_code,
      });
    } catch (error) {
      console.error("Erro ao criar pagamento:", error.response ? error.response.data : error.message);
      res.status(500).json({ error: "Erro ao processar pagamento" });
    }
  });
});

// --- WEBHOOK PARA RECEBER NOTIFICAÇÕES DO MERCADO PAGO ---
exports.paymentWebhook = onRequest(async (req, res) => {
  // A assinatura é verificada ANTES de qualquer outra coisa
  const signatureHeader = req.get("x-signature");
  if (!signatureHeader || !webhookSecret) {
    console.warn("Webhook sem assinatura ou chave secreta não configurada.");
    return res.status(401).send("Assinatura inválida.");
  }

  // LÓGICA DE VERIFICAÇÃO DE ASSINATURA CORRETA
  const parts = signatureHeader.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key.trim()] = value;
    return acc;
  }, {});
  
  const ts = parts.ts;
  const signature = parts.v1;
  const manifest = `id:${req.body.data.id};data-id:${req.body.data.id};ts:${ts};`;
  
  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(manifest);
  const computedSignature = hmac.digest('hex');

  if (computedSignature !== signature) {
    console.error("Assinatura do webhook inválida!");
    return res.status(401).send("Assinatura inválida.");
  }

  // Se a assinatura for válida, prossiga
  try {
    if (req.body.topic === "payment") {
      const paymentId = req.body.data.id;
      
      const paymentResponse = await axios.get(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        { headers: { Authorization: `Bearer ${mercadoPagoAccessToken}` } }
      );

      const status = paymentResponse.data.status;
      
      if (status === 'approved') {
        await admin.firestore().collection('payments').doc(String(paymentId)).update({
          status: 'paid',
          paidAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Pagamento ${paymentId} atualizado para 'paid'`);
      }
    }
    res.status(200).send("Webhook processado com sucesso.");
  } catch (error) {
    console.error("Erro no processamento do webhook:", error);
    res.status(500).send("Erro interno no servidor.");
  }
});

// --- FUNÇÃO PARA VERIFICAR O STATUS DO PAGAMENTO ---
exports.checkPaymentStatus = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    // Adicionado para lidar com a requisição preflight OPTIONS do CORS
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    try {
      // Alterado para pegar da query string (GET) em vez do body (POST)
      const { paymentId } = req.query;

      if (!paymentId) {
        return res.status(400).json({ error: "ID da transação é obrigatório" });
      }

      const paymentDoc = await admin.firestore().collection("payments").doc(String(paymentId)).get();
      
      if (!paymentDoc.exists) {
        return res.status(404).json({ error: "Pagamento não encontrado" });
      }

      res.status(200).json({ status: paymentDoc.data().status });
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      res.status(500).json({ error: "Erro ao verificar status do pagamento" });
    }
  });
});