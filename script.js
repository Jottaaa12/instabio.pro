// Aguarda o conteúdo do DOM ser totalmente carregado
document.addEventListener('DOMContentLoaded', () => {

    // --- Funcionalidade de Rolagem Suave (Smooth Scroll) ---
    // Seleciona todos os links de âncora que começam com '#'
    const navLinks = document.querySelectorAll('a[href^="#"]');

    // Adiciona um evento de clique a cada link
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Previne o comportamento padrão de pular para a âncora
            e.preventDefault();

            // Obtém o ID da seção de destino a partir do atributo href do link
            let targetId = this.getAttribute('href');
            
            // Seleciona o elemento de destino
            let targetElement = document.querySelector(targetId);

            // Verifica se o elemento de destino existe
            if (targetElement) {
                // Calcula a posição do elemento de destino
                const headerOffset = 70; // Altura aproximada do cabeçalho para compensar
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                // Rola a página suavemente até a posição calculada
                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    });

});
