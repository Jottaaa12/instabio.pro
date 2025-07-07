#!/usr/bin/env node

/**
 * Script para configurar as variáveis de ambiente da Efí Bank (Windows)
 * 
 * USO:
 * node configurar-efi-windows.js
 */

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function configurarEfiWindows() {
  console.log('🚀 CONFIGURAÇÃO EFI BANK - FIREBASE FUNCTIONS (WINDOWS)');
  console.log('======================================================\n');

  try {
    // 1. Ambiente
    const sandbox = await question('Usar ambiente de HOMOLOGAÇÃO? (s/n): ');
    const isSandbox = sandbox.toLowerCase() === 's';

    // 2. Credenciais de Produção
    console.log('\n📋 CREDENCIAIS DE PRODUÇÃO:');
    const clientIdProd = await question('Client ID (Produção): ');
    const clientSecretProd = await question('Client Secret (Produção): ');

    // 3. Credenciais de Homologação
    console.log('\n📋 CREDENCIAIS DE HOMOLOGAÇÃO:');
    const clientIdHomolog = await question('Client ID (Homologação): ');
    const clientSecretHomolog = await question('Client Secret (Homologação): ');

    // 4. Certificado
    console.log('\n📋 CERTIFICADO P12:');
    console.log('Converta seu certificado .p12 para base64:');
    console.log('Windows: certutil -encode cert.p12 cert.txt');
    console.log('Depois copie o conteúdo do arquivo cert.txt (sem as primeiras e últimas linhas)');
    const certBase64 = await question('Certificado em Base64: ');

    // 5. Chave PIX
    console.log('\n📋 CHAVE PIX:');
    console.log('Pode ser: CPF, CNPJ, email, telefone ou chave aleatória');
    const chavePix = await question('Chave PIX: ');

    // 6. Webhook Secret
    console.log('\n📋 WEBHOOK SECRET:');
    console.log('Senha para validar webhooks (crie uma senha forte)');
    const webhookSecret = await question('Webhook Secret: ');

    console.log('\n⚙️  CONFIGURANDO VARIÁVEIS DE AMBIENTE...\n');

    // Cria arquivos temporários para cada variável
    const tempDir = path.join(__dirname, 'temp-config');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const configs = [
      { name: 'EFI_SANDBOX', value: isSandbox.toString() },
      { name: 'EFI_CLIENT_ID_PROD', value: clientIdProd },
      { name: 'EFI_CLIENT_SECRET_PROD', value: clientSecretProd },
      { name: 'EFI_CLIENT_ID_HOMOLOG', value: clientIdHomolog },
      { name: 'EFI_CLIENT_SECRET_HOMOLOG', value: clientSecretHomolog },
      { name: 'EFI_CERT_BASE64', value: certBase64 },
      { name: 'EFI_CHAVE_PIX', value: chavePix },
      { name: 'EFI_WEBHOOK_SECRET', value: webhookSecret }
    ];

    for (const config of configs) {
      const tempFile = path.join(tempDir, `${config.name}.txt`);
      
      try {
        // Cria arquivo temporário
        fs.writeFileSync(tempFile, config.value);
        
        console.log(`Configurando: ${config.name}`);
        
        // Executa o comando Firebase
        const command = `firebase functions:secrets:set ${config.name} --data-file "${tempFile}"`;
        execSync(command, { stdio: 'inherit' });
        
        console.log('✅ Configurado com sucesso!\n');
        
        // Remove arquivo temporário
        fs.unlinkSync(tempFile);
        
      } catch (error) {
        console.log(`❌ Erro na configuração de ${config.name}: ${error.message}`);
        console.log('Verifique se está logado no Firebase: firebase login\n');
      }
    }

    // Remove diretório temporário
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }

    console.log('🎉 CONFIGURAÇÃO CONCLUÍDA!');
    console.log('\n📝 PRÓXIMOS PASSOS:');
    console.log('1. Faça o deploy: firebase deploy --only functions');
    console.log('2. Configure o webhook: acesse a URL do configurarWebhookEfi');
    console.log('3. Teste o sistema!');

  } catch (error) {
    console.error('❌ Erro durante a configuração:', error.message);
  } finally {
    rl.close();
  }
}

// Executa o script
configurarEfiWindows(); 