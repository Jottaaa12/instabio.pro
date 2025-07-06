const functions = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");

// Inicializa o Firebase Admin
admin.initializeApp();

// Cria o app Express
const app = express();

// Habilita CORS somente para o GitHub Pages
app.use(cors({ origin: "https://jottaaa12.github.io" }));

// Habilita JSON no body
app.use(express.json());

/* ---------------------- ROTAS ---------------------- */

// Criar pagamento
app.post("/create-payment", async (req, res) => {
  try {
    const mercadoPagoAccessToken = functions.config().mercadopago.token;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "E-mail é obrigatório" });
    }

    const paymentData = {
      transaction_amount: 10.0,
      description: "Acesso Plano Spotify",
      payment_method_id: "pix",
      payer: { email }
    };

    const mpRes = await axios.post(
      "https://api.mercadopago.com/v1/payments",
      paymentData,
      { headers: { Authorization: `Bearer ${mercadoPagoAccessToken}` } }
    );

    const paymentId = mpRes.data.id;
    const pixData   = mpRes.data.point_of_interaction.transaction_data;

    await admin.firestore().collection("payments").doc(String(paymentId)).set({
      email,
      status: "pending",
      paymentId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({
      success: true,
      paymentId,
      qrCodeImage: pixData.qr_code_base64,
      pixCopiaECola: pixData.qr_code
    });
  } catch (err) {
    console.error("Erro ao criar pagamento:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Consultar status
app.get("/check-payment-status", async (req, res) => {
  try {
    const { paymentId } = req.query;
    if (!paymentId) {
      return res.status(400).json({ error: "ID da transação é obrigatório" });
    }

    const doc = await admin.firestore().collection("payments").doc(String(paymentId)).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Pagamento não encontrado" });
    }

    res.status(200).json({ success: true, status: doc.data().status });
  } catch (err) {
    console.error("Erro ao verificar status:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Webhook Mercado Pago
app.post("/payment-webhook", async (req, res) => {
  const mercadoPagoAccessToken = functions.config().mercadopago.token;
  const webhookSecret          = functions.config().mercadopago.secret;

  const sigHeader = req.get("x-signature");
  if (!sigHeader || !webhookSecret) {
    return res.status(401).send("Assinatura inválida.");
  }

  const parts = sigHeader.split(",").reduce((acc, part) => {
    const [k, v] = part.split("=");
    acc[k.trim()] = v;
    return acc;
  }, {});
  const ts     = parts.ts;
  const sig    = parts.v1;
  const hmac   = crypto.createHmac("sha256", webhookSecret);
  hmac.update(`id:${req.body.data.id};data-id:${req.body.data.id};ts:${ts};`);
  const calcSig = hmac.digest("hex");
  if (calcSig !== sig) {
    return res.status(401).send("Assinatura inválida.");
  }

  try {
    if (req.body.topic === "payment") {
      const paymentId = req.body.data.id;
      const resp = await axios.get(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        { headers: { Authorization: `Bearer ${mercadoPagoAccessToken}` } }
      );

      if (resp.data.status === "approved") {
        await admin.firestore().collection("payments").doc(String(paymentId)).update({
          status: "paid",
          paidAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
    res.status(200).send("Webhook processado.");
  } catch (err) {
    console.error("Erro no webhook:", err);
    res.status(500).send("Erro interno.");
  }
});

/* --------- EXPORTA COMO ÚNICA CLOUD FUNCTION --------- */
exports.api = onRequest({ cpu: 1, memory: "256MiB" }, app);