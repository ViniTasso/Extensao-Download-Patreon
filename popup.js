document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startButton');
    const statusDiv = document.getElementById('status');

    startButton.addEventListener('click', () => {
        statusDiv.textContent = "Iniciando automação...";
        // Desabilita o botão para evitar cliques múltiplos
        startButton.disabled = true;

        // Injeta o content.js na aba ativa
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentTab = tabs[0];
            if (currentTab) {
                // Injeta o content.js na aba atual.
                // O content.js será o seu "script principal".
                chrome.scripting.executeScript({
                    target: { tabId: currentTab.id },
                    files: ['content.js']
                }, () => {
                    if (chrome.runtime.lastError) {
                        statusDiv.textContent = `Erro ao injetar script: ${chrome.runtime.lastError.message}`;
                        console.error(`Erro ao injetar content.js: ${chrome.runtime.lastError.message}`);
                        startButton.disabled = false; // Reabilita se houver erro
                    } else {
                        statusDiv.textContent = "Script principal injetado. Verifique o console da página.";
                        // O script content.js será executado na página principal
                        // e se encarregará de abrir as novas abas e gerenciar o fluxo.
                        // Não precisamos reabilitar o botão aqui, pois o processo é contínuo.
                    }
                });
            } else {
                statusDiv.textContent = "Nenhuma aba ativa encontrada.";
                startButton.disabled = false;
            }
        });
    });

    // Opcional: Para resetar o status ao abrir o popup
    chrome.storage.local.get(['processingComplete'], (result) => {
        if (result.processingComplete) {
            statusDiv.textContent = "Automação concluída na sessão anterior.";
        }
    });
});