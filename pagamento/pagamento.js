// Configuração do Firebase
const FIREBASE_FUNCTIONS_URL = 'SUA_URL_DO_FIREBASE_FUNCTIONS';

// Elementos do DOM
const paymentForm = document.getElementById('payment-form');
const emailInput = document.getElementById('user-email');
const payButton = document.getElementById('pay-button');
const pixDisplay = document.getElementById('pix-display');
const pixQrCode = document.getElementById('pix-qr-code');
const pixCopyPaste = document.getElementById('pix-copy-paste');
const copyButton = document.getElementById('copy-button');
const statusMessage = document.getElementById('status-message');

let checkStatusInterval = null;
let currentTransactionId = null;

// Função para validar e-mail
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Função para gerar pagamento
async function gerarPagamento(email) {
    try {
        const response = await fetch(`${FIREBASE_FUNCTIONS_URL}/create-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            throw new Error('Erro ao gerar pagamento');
        }

        const data = await response.json();
        
        // Exibe o QR Code e código PIX
        pixQrCode.src = data.qrCodeImage;
        pixCopyPaste.value = data.pixCopiaECola;
        pixDisplay.style.display = 'block';
        
        // Inicia a verificação de status
        currentTransactionId = data.transactionId;
        iniciarVerificacaoStatus(data.transactionId);

    } catch (error) {
        console.error('Erro:', error);
        statusMessage.textContent = 'Erro ao gerar pagamento. Por favor, tente novamente.';
        statusMessage.style.color = '#ff4444';
    }
}

// Função para verificar status do pagamento
async function verificarStatus(transactionId) {
    try {
        const response = await fetch(`${FIREBASE_FUNCTIONS_URL}/check-payment-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ transactionId }),
        });

        if (!response.ok) {
            throw new Error('Erro ao verificar status');
        }

        const data = await response.json();
        
        if (data.status === 'paid') {
            // Limpa o intervalo e redireciona
            if (checkStatusInterval) {
                clearInterval(checkStatusInterval);
            }
            
            const email = emailInput.value;
            window.location.href = `acesso.html?email=${encodeURIComponent(email)}`;
        }

    } catch (error) {
        console.error('Erro ao verificar status:', error);
    }
}

// Função para iniciar verificação de status
function iniciarVerificacaoStatus(transactionId) {
    // Limpa intervalo anterior se existir
    if (checkStatusInterval) {
        clearInterval(checkStatusInterval);
    }
    
    // Inicia novo intervalo
    checkStatusInterval = setInterval(() => {
        verificarStatus(transactionId);
    }, 5000); // Verifica a cada 5 segundos
}

// Event Listeners
payButton.addEventListener('click', () => {
    const email = emailInput.value.trim();
    
    if (!isValidEmail(email)) {
        statusMessage.textContent = 'Por favor, insira um e-mail válido.';
        statusMessage.style.color = '#ff4444';
        statusMessage.style.display = 'block';
        return;
    }
    
    gerarPagamento(email);
});

// Funcionalidade de copiar código PIX
copyButton.addEventListener('click', () => {
    pixCopyPaste.select();
    document.execCommand('copy');
    
    const originalText = copyButton.textContent;
    copyButton.textContent = 'Copiado!';
    setTimeout(() => {
        copyButton.textContent = originalText;
    }, 2000);
});

// Limpa o intervalo quando a página é fechada
window.addEventListener('beforeunload', () => {
    if (checkStatusInterval) {
        clearInterval(checkStatusInterval);
    }
}); 