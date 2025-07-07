const functions = require("firebase-functions");
const { onRequest, onCall } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const Gerencianet = require("gn-api-sdk-node");


// Inicializa o Firebase Admin
admin.initializeApp();

// ============================================================================
// CONFIGURAÇÃO SEGURA VIA FIREBASE ENVIRONMENT CONFIGURATION (v2)
// ============================================================================

/**
 * Obtém as configurações da Efí de forma segura (v2)
 * @returns {Object} Configurações da Efí
 */
function getEfiConfig() {
  // Usa process.env para acessar as variáveis de ambiente configuradas
  const isSandbox = process.env.EFI_SANDBOX === "true";
  
  return {
    client_id: isSandbox ? process.env.EFI_CLIENT_ID_HOMOLOG : process.env.EFI_CLIENT_ID_PROD,
    client_secret: isSandbox ? process.env.EFI_CLIENT_SECRET_HOMOLOG : process.env.EFI_CLIENT_SECRET_PROD,
    sandbox: isSandbox,
    certificate: process.env.EFI_CERT_BASE64 ? Buffer.from(process.env.EFI_CERT_BASE64, "base64") : null,
    webhook_secret: process.env.EFI_WEBHOOK_SECRET,
    chave_pix: process.env.EFI_CHAVE_PIX
  };
}

/**
 * Inicializa o cliente da Efí com as configurações corretas
 * @returns {Object} Cliente da Efí configurado
 */
function getEfiClient() {
  const config = getEfiConfig();
  
  const efiOptions = {
    client_id: config.client_id,
    client_secret: config.client_secret,
    sandbox: config.sandbox,
    certificate: config.certificate
  };

  return new Gerencianet(efiOptions);
}

// ============================================================================
// FUNÇÃO 1: CRIAR COBRANÇA EFI (Para o Frontend Chamar)
// ============================================================================

/**
 * Cria uma cobrança PIX imediata via Efí Bank
 * Gatilho: https.onCall (chamada direta do frontend)
 */
exports.criarCobrancaEfi = onCall({ 
  maxInstances: 10,
  memory: "256MiB"
}, async (request) => {
  try {
    // Verifica se o usuário está autenticado (opcional)
    if (!request.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated', 
        'Usuário não autenticado'
      );
    }

    const { valor = "10.00", email, descricao = "Acesso Plano Spotify" } = request.data;

    if (!email) {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'E-mail é obrigatório'
      );
    }

    // Inicializa o cliente da Efí
    const efi = getEfiClient();
    const config = getEfiConfig();

    // Dados da cobrança PIX
    const bodyCob = {
      calendario: { 
        expiracao: 3600 // 1 hora
      },
      valor: { 
        original: valor 
      },
      chave: config.chave_pix,
      solicitacaoPagador: descricao
    };

    console.log("Criando cobrança PIX:", { email, valor, descricao });

    // Cria a cobrança imediata
    const cobResp = await efi.pixCreateImmediateCharge([], bodyCob);
    
    if (!cobResp.data || !cobResp.data.txid) {
      throw new functions.https.HttpsError(
        'internal', 
        'Erro ao criar cobrança: resposta inválida da Efí'
      );
    }

    const txid = cobResp.data.txid;
    const locId = cobResp.data.loc.id;

    console.log("Cobrança criada com sucesso:", { txid, locId });

    // Gera o QR Code correspondente
    const qrResp = await efi.pixGenerateQRCode({ id: locId });
    
    if (!qrResp.data) {
      throw new functions.https.HttpsError(
        'internal', 
        'Erro ao gerar QR Code: resposta inválida da Efí'
      );
    }

    const qrCodeImage = qrResp.data.imagemQrcode;
    const pixCopiaECola = qrResp.data.qrcode;

    // Salva a transação no Firestore
    await admin.firestore().collection("payments").doc(txid).set({
      email,
      valor: parseFloat(valor),
      descricao,
      status: "pending",
      txid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      userId: request.auth.uid || null
    });

    console.log("Transação salva no Firestore:", txid);

    // Retorna os dados para o frontend
    return {
      success: true,
      txid,
      pixCopiaECola,
      qrCodeImage,
      valor,
      expiracao: 3600
    };

  } catch (error) {
    console.error("Erro ao criar cobrança PIX:", error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal', 
      `Erro interno: ${error.message}`
    );
  }
});

/**
 * Versão HTTP da função criarCobrancaEfi (para compatibilidade)
 * Gatilho: https.onRequest (chamada via HTTP POST)
 */
exports.criarCobrancaEfiHttp = onRequest({ 
  maxInstances: 10,
  memory: "256MiB",
  cors: true
}, async (req, res) => {
  try {
    // Verifica se é POST
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido' });
    }

    // Extrai dados do body (compatível com onCall)
    const requestData = req.body.data || req.body;
    const { valor = "10.00", email, descricao = "Acesso Plano Spotify" } = requestData;

    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório' });
    }

    // Inicializa o cliente da Efí
    const efi = getEfiClient();
    const config = getEfiConfig();

    // Dados da cobrança PIX
    const bodyCob = {
      calendario: { 
        expiracao: 3600 // 1 hora
      },
      valor: { 
        original: valor 
      },
      chave: config.chave_pix,
      solicitacaoPagador: descricao
    };

    console.log("Criando cobrança PIX (HTTP):", { email, valor, descricao });

    // Cria a cobrança imediata
    const cobResp = await efi.pixCreateImmediateCharge([], bodyCob);
    
    if (!cobResp.data || !cobResp.data.txid) {
      return res.status(500).json({ error: 'Erro ao criar cobrança: resposta inválida da Efí' });
    }

    const txid = cobResp.data.txid;
    const locId = cobResp.data.loc.id;

    console.log("Cobrança criada com sucesso (HTTP):", { txid, locId });

    // Gera o QR Code correspondente
    const qrResp = await efi.pixGenerateQRCode({ id: locId });
    
    if (!qrResp.data) {
      return res.status(500).json({ error: 'Erro ao gerar QR Code: resposta inválida da Efí' });
    }

    const qrCodeImage = qrResp.data.imagemQrcode;
    const pixCopiaECola = qrResp.data.qrcode;

    // Salva a transação no Firestore
    await admin.firestore().collection("payments").doc(txid).set({
      email,
      valor: parseFloat(valor),
      descricao,
      status: "pending",
      txid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      userId: null // HTTP não tem auth
    });

    console.log("Transação salva no Firestore (HTTP):", txid);

    // Retorna os dados para o frontend (formato compatível com onCall)
    res.status(200).json({
      result: {
        success: true,
        txid,
        pixCopiaECola,
        qrCodeImage,
        valor,
        expiracao: 3600
      }
    });

  } catch (error) {
    console.error("Erro ao criar cobrança PIX (HTTP):", error);
    res.status(500).json({ error: `Erro interno: ${error.message}` });
  }
});

/**
 * Versão HTTP da função consultarStatusPix (para compatibilidade)
 */
exports.consultarStatusPixHttp = onRequest({ 
  maxInstances: 10,
  memory: "256MiB",
  cors: true
}, async (req, res) => {
  try {
    // Verifica se é POST
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido' });
    }

    // Extrai dados do body (compatível com onCall)
    const requestData = req.body.data || req.body;
    const { txid } = requestData;

    if (!txid) {
      return res.status(400).json({ error: 'TXID é obrigatório' });
    }

    // Busca a transação no Firestore
    const doc = await admin.firestore().collection("payments").doc(txid).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    const paymentData = doc.data();

    // Retorna os dados (formato compatível com onCall)
    res.status(200).json({
      result: {
        success: true,
        txid,
        status: paymentData.status,
        email: paymentData.email,
        valor: paymentData.valor,
        createdAt: paymentData.createdAt,
        paidAt: paymentData.paidAt
      }
    });

  } catch (error) {
    console.error("Erro ao consultar status (HTTP):", error);
    res.status(500).json({ error: `Erro interno: ${error.message}` });
  }
});

// ============================================================================
// FUNÇÃO 2: WEBHOOK EFI (Para a Efí Chamar)
// ============================================================================

/**
 * Recebe e processa as notificações de pagamento da Efí
 * Gatilho: https.onRequest (chamada pela Efí)
 */
exports.webhookEfi = onRequest({ 
  maxInstances: 10,
  memory: "256MiB"
}, async (req, res) => {
  try {
    console.log("Webhook Efí recebido:", {
      method: req.method,
      headers: req.headers,
      query: req.query,
      body: req.body
    });

    // Verificação de Segurança (PASSO MAIS IMPORTANTE)
    const webhookSecret = req.query.secret;
    
    if (!webhookSecret || webhookSecret !== process.env.EFI_WEBHOOK_SECRET) {
      console.error("Webhook secret inválido:", { 
        received: webhookSecret, 
        expected: process.env.EFI_WEBHOOK_SECRET 
      });
      return res.status(401).send("Unauthorized - Secret inválido");
    }

    console.log("Webhook secret validado com sucesso");

    // Analisa o corpo da requisição
    const { pix } = req.body;

    if (!Array.isArray(pix) || pix.length === 0) {
      console.log("Payload inválido - pix não é array ou está vazio");
      return res.status(400).send("Payload inválido - pix não encontrado");
    }

    console.log(`Processando ${pix.length} evento(s) Pix`);

    // Processa cada evento PIX
    const batch = admin.firestore().batch();
    const processedTxids = [];

    for (const evento of pix) {
      const { txid, endToEndId, valor, horario } = evento;
      
      if (!txid) {
        console.warn("Evento PIX sem txid:", evento);
        continue;
      }

      console.log(`Processando txid: ${txid}`);

      // Busca a transação no Firestore
      const docRef = admin.firestore().collection("payments").doc(txid);
      const doc = await docRef.get();

      if (!doc.exists) {
        console.warn(`Transação ${txid} não encontrada no Firestore`);
        continue;
      }

      const paymentData = doc.data();
      
      // Verifica se já foi processada
      if (paymentData.status === "paid") {
        console.log(`Transação ${txid} já foi processada anteriormente`);
        continue;
      }

      // Atualiza o status para "paid"
      batch.update(docRef, {
        status: "paid",
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        endToEndId,
        valorRecebido: valor,
        horarioPagamento: horario,
        webhookProcessedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      processedTxids.push(txid);
      console.log(`Status atualizado para 'paid' - txid: ${txid}`);
    }

    // Executa as atualizações em lote
    if (processedTxids.length > 0) {
      await batch.commit();
      console.log(`Webhook processado com sucesso. ${processedTxids.length} transação(ões) atualizada(s):`, processedTxids);
    } else {
      console.log("Nenhuma transação foi atualizada");
    }

    // Responde à Efí com sucesso
    res.status(200).send("Webhook Efí processado com sucesso");

  } catch (error) {
    console.error("Erro no webhook Efí:", error);
    res.status(500).send("Erro interno no processamento do webhook");
  }
});

// ============================================================================
// FUNÇÃO 3: CONFIGURAR WEBHOOK EFI (Função de Uso Único)
// ============================================================================

/**
 * Registra programaticamente a URL do webhook nos sistemas da Efí
 * Gatilho: https.onRequest (execução manual)
 */
exports.configurarWebhookEfi = onRequest({ 
  maxInstances: 1,
  memory: "256MiB"
}, async (req, res) => {
  try {
    console.log("Iniciando configuração do webhook Efí");

    // Inicializa o cliente da Efí
    const efi = getEfiClient();
    const config = getEfiConfig();

    // Monta a URL completa do webhook
    const projectId = process.env.GCLOUD_PROJECT;
    const region = process.env.FUNCTION_REGION || "us-central1";
    const webhookUrl = `https://${region}-${projectId}.cloudfunctions.net/webhookEfi?secret=${config.webhook_secret}`;

    console.log("URL do webhook:", webhookUrl);

    // Parâmetros para configurar o webhook
    const params = {
      chave: config.chave_pix
    };

    const body = {
      webhookUrl: webhookUrl
    };

    // Cabeçalho customizado para pular a verificação mTLS
    const customHeaders = {
      'x-skip-mtls-checking': 'true'
    };

    console.log("Configurando webhook com parâmetros:", { params, body });

    // Chama o método para configurar o webhook
    const response = await efi.pixConfigWebhook(params, body, customHeaders);

    console.log("Resposta da configuração do webhook:", response);

    if (response && response.data) {
      res.status(200).json({
        success: true,
        message: "Webhook configurado com sucesso!",
        webhookUrl,
        response: response.data
      });
    } else {
      throw new Error("Resposta inválida da Efí");
    }

  } catch (error) {
    console.error("Erro ao configurar webhook:", error);
    
    res.status(500).json({
      success: false,
      message: "Erro ao configurar webhook",
      error: error.message
    });
  }
});

// ============================================================================
// FUNÇÃO AUXILIAR: CONSULTAR STATUS (Para o Frontend)
// ============================================================================

/**
 * Consulta o status de uma transação PIX
 * Gatilho: https.onCall (chamada direta do frontend)
 */
exports.consultarStatusPix = onCall({ 
  maxInstances: 10,
  memory: "256MiB"
}, async (request) => {
  try {
    const { txid } = request.data;

    if (!txid) {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'TXID é obrigatório'
      );
    }

    // Busca a transação no Firestore
    const doc = await admin.firestore().collection("payments").doc(txid).get();
    
    if (!doc.exists) {
      throw new functions.https.HttpsError(
        'not-found', 
        'Transação não encontrada'
      );
    }

    const paymentData = doc.data();

    return {
      success: true,
      txid,
      status: paymentData.status,
      email: paymentData.email,
      valor: paymentData.valor,
      createdAt: paymentData.createdAt,
      paidAt: paymentData.paidAt
    };

  } catch (error) {
    console.error("Erro ao consultar status:", error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal', 
      `Erro interno: ${error.message}`
    );
  }
});

/* --------- FIM DAS FUNÇÕES --------- */