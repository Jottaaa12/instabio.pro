# 🚀 Guia Rápido - Efí Bank + Firebase Functions

## ⚡ Configuração Rápida (5 minutos)

### 1. **Configure as Variáveis de Ambiente**

**Opção A: Script Batch (Windows)**
```bash
# Execute o arquivo
configurar-efi-simples.bat
```

**Opção B: Manual**
```bash
# Configure uma por vez:
firebase functions:secrets:set EFI_SANDBOX
firebase functions:secrets:set EFI_CLIENT_ID_PROD
firebase functions:secrets:set EFI_CLIENT_SECRET_PROD
firebase functions:secrets:set EFI_CLIENT_ID_HOMOLOG
firebase functions:secrets:set EFI_CLIENT_SECRET_HOMOLOG
firebase functions:secrets:set EFI_CERT_BASE64
firebase functions:secrets:set EFI_CHAVE_PIX
firebase functions:secrets:set EFI_WEBHOOK_SECRET
```

### 2. **Faça o Deploy**
```bash
firebase deploy --only functions
```

### 3. **Configure o Webhook**
Acesse: `https://sua-regiao-seu-projeto.cloudfunctions.net/configurarWebhookEfi`

### 4. **Teste o Sistema**
Use o frontend ou faça uma requisição HTTP.

## 📋 Dados Necessários

### **Da sua conta Efí Bank:**
- ✅ Client ID (Produção)
- ✅ Client Secret (Produção)  
- ✅ Client ID (Homologação)
- ✅ Client Secret (Homologação)
- ✅ Certificado P12 (convertido para Base64)
- ✅ Chave PIX (CPF, CNPJ, email, telefone ou chave aleatória)

### **Para gerar:**
- ✅ Webhook Secret (senha forte)

## 🔧 Como Converter Certificado P12 para Base64

**Windows:**
```bash
certutil -encode cert.p12 cert.txt
# Copie o conteúdo do arquivo cert.txt (sem as primeiras e últimas linhas)
```

**Linux/Mac:**
```bash
base64 -i cert.p12
```

## 🚨 Troubleshooting

### **Erro: "EFI_CLIENT_ID_PROD is not defined"**
- ✅ **RESOLVIDO**: Código já foi corrigido
- Faça o deploy novamente: `firebase deploy --only functions`

### **Erro: "Webhook secret inválido"**
- Verifique se o `EFI_WEBHOOK_SECRET` está configurado corretamente
- Confirme se a URL do webhook está correta

### **Erro: "Certificado inválido"**
- Verifique se o certificado está em Base64 válido
- Confirme se não há espaços ou quebras de linha extras

## 📞 URLs das Funções

Após o deploy, suas funções estarão disponíveis em:

- **Criar Cobrança (HTTP):** `https://sua-regiao-seu-projeto.cloudfunctions.net/criarCobrancaEfiHttp`
- **Consultar Status (HTTP):** `https://sua-regiao-seu-projeto.cloudfunctions.net/consultarStatusPixHttp`
- **Configurar Webhook:** `https://sua-regiao-seu-projeto.cloudfunctions.net/configurarWebhookEfi`
- **Webhook Efí:** `https://sua-regiao-seu-projeto.cloudfunctions.net/webhookEfi`

## ✅ Checklist Final

- [ ] Variáveis de ambiente configuradas
- [ ] Deploy realizado com sucesso
- [ ] Webhook configurado na Efí Bank
- [ ] Teste de criação de cobrança funcionando
- [ ] Teste de webhook funcionando
- [ ] Frontend integrado

## 🎉 Pronto!

Seu sistema está configurado e funcionando! 🚀 