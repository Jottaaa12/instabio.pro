const { onRequest } = require("firebase-functions/v2/https");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: "https://jottaaa12.github.io" });
const axios = require("axios");
const crypto = require("crypto");

// Inicializa o Firebase Admin
admin.initializeApp();

// --- FUNÇÃO PARA CRIAR O PAGAMENTO ---
exports.createPayment = onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Método não permitido");
    }

    try {
      // Lê o token do Mercado Pago somente quando a função é executada
      const mercadoPagoAccessToken = functions.config().mercadopago.token;
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "E-mail é obrigatório" });
      }

      const paymentData = {
        transaction_amount: 10.0,
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

      await admin
        .firestore()
        .collection("payments")
        .doc(String(paymentId))
        .set({
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
      console.error(
        "Erro ao criar pagamento:",
        error.response ? error.response.data : "Erro desconhecido"
      );
      res.status(500).json({ error: "Erro ao processar pagamento" });
    }
  });
});

// --- WEBHOOK DE PAGAMENTO ---
exports.paymentWebhook = onRequest(async (req, res) => {
  // Lê as secrets dentro da função para evitar problemas de inicialização
  const mercadoPagoAccessToken = functions.config().mercadopago.token;
  const webhookSecret = functions.config().mercadopago.secret;
  
  const signatureHeader = req.get("x-signature");
  if (!signatureHeader || !webhookSecret) {
    return res.status(401).send("Assinatura inválida.");
  }

  const parts = signatureHeader.split(",").reduce((acc, part) => {
    const [key, value] = part.split("=");
    acc[key.trim()] = value;
    return acc;
  }, {});

  const ts = parts.ts;
  const signature = parts.v1;
  const manifest = `id:${req.body.data.id};data-id:${req.body.data.id};ts:${ts};`;
  const hmac = crypto.createHmac("sha256", webhookSecret);
  hmac.update(manifest);
  const computedSignature = hmac.digest("hex");

  if (computedSignature !== signature) {
    return res.status(401).send("Assinatura inválida.");
  }

  try {
    if (req.body.topic === "payment") {
      const paymentId = req.body.data.id;
      const paymentResponse = await axios.get(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: { Authorization: `Bearer ${mercadoPagoAccessToken}` },
        }
      );

      if (paymentResponse.data.status === "approved") {
        await admin
          .firestore()
          .collection("payments")
          .doc(String(paymentId))
          .update({
            status: "paid",
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      }
    }
    res.status(200).send("Webhook processado.");
  } catch (error) {
    console.error("Erro no webhook:", error);
    res.status(500).send("Erro interno.");
  }
});

// --- CHECAR STATUS DO PAGAMENTO ---
exports.checkPaymentStatus = onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { paymentId } = req.query;
      if (!paymentId) {
        return res
          .status(400)
          .json({ error: "ID da transação é obrigatório" });
      }

      const paymentDoc = await admin
        .firestore()
        .collection("payments")
        .doc(String(paymentId))
        .get();

      if (!paymentDoc.exists) {
        return res.status(404).json({ error: "Pagamento não encontrado" });
      }

      res.status(200).json({ status: paymentDoc.data().status });
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      res.status(500).json({ error: "Erro ao verificar status." });
    }
  });
});