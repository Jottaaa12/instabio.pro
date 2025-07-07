const functions = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");
const Efipay = require("efipay");
const fs = require("fs");

// Inicializa o Firebase Admin
admin.initializeApp();

// Cria o app Express
const app = express();

// Habilita CORS somente para o GitHub Pages
app.use(cors({ origin: "https://jottaaa12.github.io" }));

// Habilita JSON no body
app.use(express.json());

// Configurações da Efí via variáveis de ambiente
const efiOptions = {
  client_id: process.env.EFI_CLIENT_ID_PROD,
  client_secret: process.env.EFI_CLIENT_SECRET_PROD,
  // O certificado vem como base64 para evitar expor arquivo no repositório
  certificate: Buffer.from(process.env.EFI_CERT_BASE64 || "", "base64"),
  sandbox: false // Produção
};

// Chave Pix vinculada à conta Efí (EVP ou chave aleatória)
const EFI_PIX_KEY = process.env.EFI_PIX_KEY;

// Helper para instanciar cliente Efí
function getEfiClient() {
  return new Efipay(efiOptions);
}

/* ---------------------- ROTAS ---------------------- */

// Criar pagamento
app.post("/create-payment", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "E-mail é obrigatório" });
    }

    // Cria cobrança imediata PIX via Efí
    const efipay = getEfiClient();

    const bodyCob = {
      calendario: { expiracao: 3600 },
      valor: { original: "10.00" },
      chave: EFI_PIX_KEY,
      solicitacaoPagador: "Acesso Plano Spotify"
    };

    const cobResp = await efipay.pixCreateImmediateCharge([], bodyCob);
    const txid = cobResp.data.txid;
    const locId = cobResp.data.loc.id;

    // Gera o QR Code correspondente
    const qrResp = await efipay.pixGenerateQRCode({ id: locId });
    const qrCodeImage = qrResp.data.imagemQrcode;
    const pixCopiaECola = qrResp.data.qrcode;

    // Persistir no Firestore
    await admin.firestore().collection("payments").doc(txid).set({
      email,
      status: "pending",
      txid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({
      success: true,
      transactionId: txid,
      qrCodeImage,
      pixCopiaECola
    });
  } catch (err) {
    console.error("Erro ao criar pagamento:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Consultar status (POST atende o frontend)
app.post("/check-payment-status", async (req, res) => {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: "ID da transação é obrigatório" });
    }

    const doc = await admin.firestore().collection("payments").doc(transactionId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Pagamento não encontrado" });
    }

    res.status(200).json({ success: true, status: doc.data().status });
  } catch (err) {
    console.error("Erro ao verificar status:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// (Opcional) Mantém compatibilidade com GET usando querystring paymentId
app.get("/check-payment-status", async (req, res) => {
  const { paymentId } = req.query;
  if (!paymentId) return res.status(400).json({ error: "ID da transação é obrigatório" });
  const doc = await admin.firestore().collection("payments").doc(paymentId).get();
  if (!doc.exists) return res.status(404).json({ error: "Pagamento não encontrado" });
  return res.status(200).json({ success: true, status: doc.data().status });
});

// Webhook Efí (substitui o Mercado Pago)
app.post("/efi-webhook", async (req, res) => {
  try {
    const { pix } = req.body;

    if (!Array.isArray(pix) || pix.length === 0) {
      return res.status(400).send("Payload inválido");
    }

    // Atualiza status das transações recebidas
    const batch = admin.firestore().batch();

    pix.forEach((evento) => {
      const { txid } = evento;
      if (txid) {
        const ref = admin.firestore().collection("payments").doc(txid);
        batch.update(ref, {
          status: "paid",
          paidAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });

    await batch.commit();

    return res.status(200).send("Webhook Efí processado");
  } catch (err) {
    console.error("Erro no webhook Efí:", err);
    return res.status(500).send("Erro interno");
  }
});

/* --------- EXPORTA COMO ÚNICA CLOUD FUNCTION --------- */
exports.api = onRequest({ cpu: 1, memory: "256MiB" }, app);