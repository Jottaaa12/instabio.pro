#!/usr/bin/env node

/**
 * Script para configurar as variáveis de ambiente da Efí Bank
 * 
 * USO:
 * node configurar-efi.js
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function configurarEfi() {
  console.log('🚀 CONFIGURAÇÃO EFI BANK - FIREBASE FUNCTIONS');
  console.log('==============================================\n');

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
    console.log('Linux/Mac: base64 -i cert.p12');
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

    // Configura as variáveis
    const commands = [
      `firebase functions:secrets:set EFI_SANDBOX --data-file - <<< "${isSandbox}"`,
      `firebase functions:secrets:set EFI_CLIENT_ID_PROD --data-file - <<< "${clientIdProd}"`,
      `firebase functions:secrets:set EFI_CLIENT_SECRET_PROD --data-file - <<< "${clientSecretProd}"`,
      `firebase functions:secrets:set EFI_CLIENT_ID_HOMOLOG --data-file - <<< "${clientIdHomolog}"`,
      `firebase functions:secrets:set EFI_CLIENT_SECRET_HOMOLOG --data-file - <<< "${clientSecretHomolog}"`,
      `firebase functions:secrets:set EFI_CERT_BASE64 --data-file - <<< "${certBase64}"`,
      `firebase functions:secrets:set EFI_CHAVE_PIX --data-file - <<< "${chavePix}"`,
      `firebase functions:secrets:set EFI_WEBHOOK_SECRET --data-file - <<< "${webhookSecret}"`
    ];

    for (const command of commands) {
      console.log(`Executando: ${command.split('<<<')[0].trim()}`);
      try {
        execSync(command, { stdio: 'inherit' });
        console.log('✅ Configurado com sucesso!\n');
      } catch (error) {
        console.log('❌ Erro na configuração. Verifique se está logado no Firebase.\n');
      }
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
configurarEfi(); 