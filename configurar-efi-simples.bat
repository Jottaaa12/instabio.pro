@echo off
echo 🚀 CONFIGURAÇÃO EFI BANK - FIREBASE FUNCTIONS
echo ==============================================
echo.

echo ⚠️  IMPORTANTE: Certifique-se de estar logado no Firebase
echo    Execute: firebase login
echo.

pause

echo 📋 Configurando variáveis de ambiente...
echo.

echo 1. Configurando EFI_SANDBOX...
firebase functions:secrets:set EFI_SANDBOX
echo.

echo 2. Configurando EFI_CLIENT_ID_PROD...
firebase functions:secrets:set EFI_CLIENT_ID_PROD
echo.

echo 3. Configurando EFI_CLIENT_SECRET_PROD...
firebase functions:secrets:set EFI_CLIENT_SECRET_PROD
echo.

echo 4. Configurando EFI_CLIENT_ID_HOMOLOG...
firebase functions:secrets:set EFI_CLIENT_ID_HOMOLOG
echo.

echo 5. Configurando EFI_CLIENT_SECRET_HOMOLOG...
firebase functions:secrets:set EFI_CLIENT_SECRET_HOMOLOG
echo.

echo 6. Configurando EFI_CERT_BASE64...
firebase functions:secrets:set EFI_CERT_BASE64
echo.

echo 7. Configurando EFI_CHAVE_PIX...
firebase functions:secrets:set EFI_CHAVE_PIX
echo.

echo 8. Configurando EFI_WEBHOOK_SECRET...
firebase functions:secrets:set EFI_WEBHOOK_SECRET
echo.

echo 🎉 CONFIGURAÇÃO CONCLUÍDA!
echo.
echo 📝 PRÓXIMOS PASSOS:
echo 1. Faça o deploy: firebase deploy --only functions
echo 2. Configure o webhook: acesse a URL do configurarWebhookEfi
echo 3. Teste o sistema!
echo.

pause 