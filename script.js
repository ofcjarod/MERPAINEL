// Garante que o código rode no escopo correto sem poluir a janela global
(() => {
    "use strict";

    // Aguarda o DOM estar pronto
    document.addEventListener("DOMContentLoaded", () => {
        initApp();
    });

    function initApp() {
        const gridProdutos = document.querySelector("#grid-produtos");

        if (!gridProdutos) return;

        /* 1. OTIMIZAÇÃO: Event Delegation (Delegação de Eventos)
           Em vez de adicionar um EventListener para cada botão de cada card (o que destrói a memória),
           adicionamos apenas UM escutador no container pai.
        */
        gridProdutos.addEventListener("click", (event) => {
            const targetBtn = event.target.closest('[data-action="click-efeito"]');
            
            if (targetBtn) {
                handleButtonClick(targetBtn);
            }
        });
    }

    function handleButtonClick(button) {
        // 2. OTIMIZAÇÃO: Animações de interface via JS devem usar requestAnimationFrame
        // Isso sincroniza a execução do JS com a taxa de atualização (Hz) do monitor do usuário.
        requestAnimationFrame(() => {
            button.style.transform = "scale(0.95)";
            
            setTimeout(() => {
                requestAnimationFrame(() => {
                    button.style.transform = "none";
                    alert("Ação executada com clique otimizado!");
                });
            }, 100);
        });
    }

})();
