// Este script roda em segundo plano e gerencia o fluxo da automação

const CLASS_NAME = "css-1iz2k1g";
const CURRENT_LINK_INDEX_KEY = 'currentLinkIndex';
const PROCESSING_COMPLETE_KEY = 'processingComplete';

console.log("Background script iniciado!");

// Listen para mensagens do popup.js
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log("Lendo mensagens")
    if (message.action === "startAutomation") {
        const tabId = message.tabId;
        const tabUrl = message.tabUrl;

        console.log("Background script: Recebido comando para iniciar automação.");
        sendResponse({ status: "started" }); // Confirma para o popup que a automação começou

        await runAutomationCycle(tabId, tabUrl);
    }
});

// Função principal que executa o ciclo de automação
async function runAutomationCycle(mainTabId, mainTabUrl) {
    let { currentLinkIndex = 0, processingComplete = false } = await chrome.storage.local.get([CURRENT_LINK_INDEX_KEY, PROCESSING_COMPLETE_KEY]);

    if (processingComplete) {
        console.log("Background: Todos os links foram processados na sessão anterior. Resetando para um novo ciclo.");
        await chrome.storage.local.remove([CURRENT_LINK_INDEX_KEY, PROCESSING_COMPLETE_KEY]);
        currentLinkIndex = 0;
        processingComplete = false;
        // Notifica o popup
        chrome.runtime.sendMessage({ action: "updatePopupStatus", status: "Automação concluída, clique para reiniciar." });
        return;
    }

    // Injeta o content.js na aba principal para coletar os links
    console.log("Background: Injetando content.js na aba principal para coletar links...");
    try {
        const injectionResults = await chrome.scripting.executeScript({
            target: { tabId: mainTabId },
            files: ['content.js']
        });

        // content.js retornará os links encontrados
        if (injectionResults && injectionResults[0] && injectionResults[0].result) {
            const allTargetLinks = injectionResults[0].result; // Recebe a lista de hrefs do content.js

            if (allTargetLinks.length === 0) {
                console.warn(`Background: Nenhum link com a classe "${CLASS_NAME}" encontrado. Encerrando.`);
                await chrome.storage.local.set({ [PROCESSING_COMPLETE_KEY]: true });
                chrome.runtime.sendMessage({ action: "updatePopupStatus", status: "Nenhum link encontrado." });
                return;
            }

            if (currentLinkIndex >= allTargetLinks.length) {
                console.log("Background: Todos os links da lista foram processados.");
                await chrome.storage.local.set({ [PROCESSING_COMPLETE_KEY]: true });
                await chrome.storage.local.remove(CURRENT_LINK_INDEX_KEY);
                chrome.runtime.sendMessage({ action: "updatePopupStatus", status: "Processo concluído!" });
                return;
            }

            const targetUrl = allTargetLinks[currentLinkIndex];

            if (targetUrl) {
                console.log(`Background: Abrindo link ${currentLinkIndex + 1}/${allTargetLinks.length}: ${targetUrl}`);
                chrome.runtime.sendMessage({ action: "updatePopupStatus", status: `Abrindo link ${currentLinkIndex + 1}/${allTargetLinks.length}...` });


                await chrome.storage.local.set({ [CURRENT_LINK_INDEX_KEY]: currentLinkIndex + 1 });

                // Abre a nova aba
                const newTab = await chrome.tabs.create({ url: targetUrl, active: false });
                console.log(`Background: Nova aba aberta com ID: ${newTab.id}, URL: ${newTab.url}`);

                // Listener para quando a nova aba carregar completamente
                const tabUpdateListener = async (tabId, changeInfo, tab) => {
                    if (tabId === newTab.id && changeInfo.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(tabUpdateListener); // Remove o listener para evitar múltiplas execuções

                        console.log(`Background: Nova aba (ID: ${tabId}) carregada. Injetando sub_content.js...`);
                        try {
                            await chrome.scripting.executeScript({
                                target: { tabId: tabId },
                                files: ['sub_content.js']
                            });
                            console.log(`Background: Sub-script injetado na aba ID ${tabId}.`);

                            // Espera um pouco para o sub-script fazer seu trabalho e fechar a aba
                            setTimeout(async () => {
                                console.log("Background: Continuando para o próximo ciclo...");
                                // Recarrega a aba principal para continuar o fluxo
                                chrome.tabs.reload(mainTabId, {}, () => {
                                    console.log("Background: Aba principal recarregada. Próximo ciclo agendado.");
                                    // Chamar a função novamente para processar o próximo link
                                    // Dá um pequeno atraso para garantir que a recarga se complete
                                    setTimeout(() => runAutomationCycle(mainTabId, mainTabUrl), 1000);
                                });
                            }, 5000); // Aguarda 5 segundos para o sub_content.js concluir e fechar a aba
                        } catch (e) {
                            console.error(`Background: Erro ao injetar sub_content.js na aba ${tabId}:`, e);
                            chrome.runtime.sendMessage({ action: "updatePopupStatus", status: `Erro na aba secundária: ${e.message}` });
                            // Tenta continuar para o próximo link mesmo com erro
                            setTimeout(() => chrome.tabs.reload(mainTabId), 1000);
                        }
                    }
                };
                chrome.tabs.onUpdated.addListener(tabUpdateListener);

            } else {
                console.error(`Background: Link no índice ${currentLinkIndex} não encontrado ou sem href. Pulando.`);
                await chrome.storage.local.set({ [CURRENT_LINK_INDEX_KEY]: currentLinkIndex + 1 });
                // Tenta recarregar a aba principal para continuar o processo
                chrome.tabs.reload(mainTabId, {}, () => {
                    setTimeout(() => runAutomationCycle(mainTabId, mainTabUrl), 1000);
                });
            }
        } else {
            console.error("Background: content.js não retornou os links ou houve um erro na injeção.");
            chrome.runtime.sendMessage({ action: "updatePopupStatus", status: "Erro: Não foi possível obter links da página principal." });
        }

    } catch (e) {
        console.error("Background: Erro na injeção do content.js ou na obtenção dos resultados:", e);
        chrome.runtime.sendMessage({ action: "updatePopupStatus", status: `Erro na injeção do content.js: ${e.message}` });
    }
}

// Ouve mensagens do content.js (se ele precisar enviar alguma coisa, como erros ou dados)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Exemplo: Se o content.js quiser enviar um log para o background
    if (message.action === "logFromContent") {
        console.log(`Log do Content Script (${sender.tab ? sender.tab.id : 'N/A'}):`, message.data);
    }
});