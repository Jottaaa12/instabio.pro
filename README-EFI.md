# 🚀 Integração Efí Bank - Firebase Functions

Este projeto integra a API Pix da Efí Bank com Firebase Functions v2, permitindo criar cobranças PIX, receber notificações via webhook e consultar status de pagamentos.

## 📋 Pré-requisitos

1. **Conta Efí Bank** com acesso à API Pix
2. **Firebase CLI** instalado e configurado
3. **Node.js** versão 16 ou superior

## 🔧 Configuração Inicial

### 1. Obter Credenciais da Efí Bank

1. Acesse sua conta Efí Bank
2. Vá em **API** → **Aplicações**
3. Crie uma nova aplicação ou use uma existente
4. Habilite a **API Pix** e configure os escopos:
   - `cob.write` - alteração de cobranças
   - `cob.read` - consulta de cobranças
   - `pix.write` - alteração de Pix
   - `pix.read` - consulta de Pix
   - `webhook.write` - alteração do webhook
   - `webhook.read` - consulta do webhook

### 2. Gerar Certificado P12

1. Vá em **API** → **Meus Certificados**
2. Selecione o ambiente (Produção ou Homologação)
3. Clique em **Novo Certificado**
4. Baixe o arquivo `.p12`

### 3. Converter Certificado para Base64

**Windows:**
```bash
certutil -encode cert.p12 cert.txt
# Copie o conteúdo do arquivo cert.txt (sem as primeiras e últimas linhas)
```

**Linux/Mac:**
```bash
base64 -i cert.p12
```

## ⚙️ Configuração das Variáveis de Ambiente

### Método 1: Script Automático (Recomendado)

```bash
node configurar-efi.js
```

### Método 2: Manual

Configure cada variável individualmente:

```bash
# Ambiente (true = Homologação, false = Produção)
firebase functions:secrets:set EFI_SANDBOX

# Credenciais de Produção
firebase functions:secrets:set EFI_CLIENT_ID_PROD
firebase functions:secrets:set EFI_CLIENT_SECRET_PROD

# Credenciais de Homologação
firebase functions:secrets:set EFI_CLIENT_ID_HOMOLOG
firebase functions:secrets:set EFI_CLIENT_SECRET_HOMOLOG

# Certificado P12 em Base64
firebase functions:secrets:set EFI_CERT_BASE64

# Chave PIX (CPF, CNPJ, email, telefone, chave aleatória)
firebase functions:secrets:set EFI_CHAVE_PIX

# Secret do Webhook (senha para validar webhooks)
firebase functions:secrets:set EFI_WEBHOOK_SECRET
```

## 🚀 Deploy

```bash
# Instalar dependências
cd functions
npm install

# Fazer deploy
firebase deploy --only functions
```

## 🔗 Configurar Webhook

Após o deploy, configure o webhook na Efí Bank:

1. Acesse a URL: `https://sua-regiao-seu-projeto.cloudfunctions.net/configurarWebhookEfi`
2. O webhook será configurado automaticamente
3. Verifique se a resposta foi de sucesso

## 📱 Funções Disponíveis

### 1. `criarCobrancaEfi` (onCall)
Cria uma cobrança PIX imediata.

**Parâmetros:**
- `valor` (string): Valor em reais (ex: "10.00")
- `email` (string): E-mail do pagador
- `descricao` (string): Descrição da cobrança

**Retorna:**
- `txid`: ID da transação
- `pixCopiaECola`: Código Pix para copiar e colar
- `qrCodeImage`: QR Code em base64
- `valor`: Valor da cobrança
- `expiracao`: Tempo de expiração em segundos

### 2. `criarCobrancaEfiHttp` (onRequest)
Versão HTTP da função de criar cobrança (para compatibilidade).

### 3. `webhookEfi` (onRequest)
Recebe notificações de pagamento da Efí Bank.

### 4. `consultarStatusPix` (onCall)
Consulta o status de uma transação.

**Parâmetros:**
- `txid` (string): ID da transação

### 5. `consultarStatusPixHttp` (onRequest)
Versão HTTP da função de consultar status.

### 6. `configurarWebhookEfi` (onRequest)
Configura programaticamente o webhook na Efí Bank.

## 🔒 Segurança

- Todas as credenciais são armazenadas como secrets do Firebase
- Webhook é validado com secret personalizado
- Certificado P12 é usado para autenticação mTLS
- Funções têm limites de memória e instâncias configurados

## 🧪 Testando

### Frontend (JavaScript)

```javascript
// Criar cobrança
const { data } = await firebase.functions().httpsCallable('criarCobrancaEfi')({
  valor: "10.00",
  email: "teste@exemplo.com",
  descricao: "Teste de pagamento"
});

console.log('QR Code:', data.qrCodeImage);
console.log('Pix Copia e Cola:', data.pixCopiaECola);

// Consultar status
const { data: status } = await firebase.functions().httpsCallable('consultarStatusPix')({
  txid: "txid_da_transacao"
});

console.log('Status:', status.status);
```

### HTTP (cURL)

```bash
# Criar cobrança
curl -X POST https://sua-regiao-seu-projeto.cloudfunctions.net/criarCobrancaEfiHttp \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "valor": "10.00",
      "email": "teste@exemplo.com",
      "descricao": "Teste de pagamento"
    }
  }'

# Consultar status
curl -X POST https://sua-regiao-seu-projeto.cloudfunctions.net/consultarStatusPixHttp \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "txid": "txid_da_transacao"
    }
  }'
```

## 📊 Monitoramento

- Use o Firebase Console para monitorar logs das funções
- Verifique o Firestore para acompanhar transações
- Monitore webhooks no painel da Efí Bank

## 🐛 Troubleshooting

### Erro 400 (Bad Request)
- Verifique se as credenciais estão corretas
- Confirme se o certificado está em base64 válido
- Verifique se a chave PIX está configurada

### Erro 401 (Unauthorized)
- Verifique se o webhook secret está correto
- Confirme se as credenciais da aplicação estão válidas

### Erro 500 (Internal Server Error)
- Verifique os logs no Firebase Console
- Confirme se todas as variáveis de ambiente estão configuradas

## 📞 Suporte

Para dúvidas sobre a API Efí Bank:
- [Documentação Oficial](https://dev.efipay.com.br/docs/api-pix)
- [Suporte Efí Bank](https://suporte.efipay.com.br)

Para dúvidas sobre Firebase Functions:
- [Documentação Firebase](https://firebase.google.com/docs/functions)
- [Firebase Console](https://console.firebase.google.com) 