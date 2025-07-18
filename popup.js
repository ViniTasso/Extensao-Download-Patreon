document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startButton');
    const statusDiv = document.getElementById('status');

    startButton.addEventListener('click', () => {
        statusDiv.textContent = "Iniciando automacao...";
        startButton.disabled = true;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            statusDiv.textContent = "Reconhecendo Aba";
            const currentTab = tabs[0];
            statusDiv.textContent = "Selecionanado Aba...";
            if (currentTab) {
                statusDiv.textContent = "Preparando ambiente";
                // Envia uma mensagem para o background.js para iniciar a automação
                chrome.runtime.sendMessage({
                    action: "startAutomation",
                    tabId: currentTab.id, // ID da aba principal
                    tabUrl: currentTab.url // URL da aba principal
                }, (response) => {
                    if (response && response.status === "started") {
                        statusDiv.textContent = "Automacao iniciada. Verifique o console da pagina principal e as novas abas.";
                        // O background.js cuidará de reabilitar o botão ou de reiniciar o processo.
                        // Aqui, apenas informamos que a automação começou.
                    } else if (response && response.status === "error") {
                        statusDiv.textContent = `Erro: ${response.message}`;
                        console.error(`Erro ao iniciar automação: ${response.message}`);
                        startButton.disabled = false;
                    }
                });
            } else {
                statusDiv.textContent = "Nenhuma aba ativa encontrada.";
                startButton.disabled = false;
            }
        });
    });

    // Opcional: Para resetar o status ao abrir o popup (após uma automação completa)
    chrome.storage.local.get(['processingComplete'], (result) => {
        if (result.processingComplete) {
            statusDiv.textContent = "Automacao concluída na sessão anterior. Clique para reiniciar.";
            startButton.disabled = false;
        } else {
            statusDiv.textContent = "Aguardando inicio...";
            startButton.disabled = false; // Garante que o botão esteja habilitado na primeira abertura
        }
    });

    // Ouve mensagens do background.js para atualizar o status no popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "updatePopupStatus") {
            statusDiv.textContent = message.status;
            if (message.status === "Processo concluido!" || message.status.includes("Erro")) {
                startButton.disabled = false; // Reabilita o botão ao final
            }
        }
    });
});