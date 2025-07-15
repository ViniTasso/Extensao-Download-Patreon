// Este script é injetado na página principal (play.easyfrench.fm/)

(async () => { // Usando IIFE assíncrona para lidar com promessas de chrome.storage
    'use strict';

    // A classe que você quer buscar
    const CLASS_NAME = "css-1iz2k1g";
    // Chave para armazenar o índice do link no chrome.storage
    const CURRENT_LINK_INDEX_KEY = 'currentLinkIndex';
    // Chave para saber se já processamos todos os links
    const PROCESSING_COMPLETE_KEY = 'processingComplete';

    console.log("Content script (principal) iniciado.");

    let { currentLinkIndex = 0, processingComplete = false } = await chrome.storage.local.get([CURRENT_LINK_INDEX_KEY, PROCESSING_COMPLETE_KEY]);

    if (processingComplete) {
        console.log("Todos os links foram processados na sessão anterior. Reinicie a extensão se quiser começar de novo.");
        // Opcional: Se quiser que ele reinicie automaticamente a cada visita, descomente as linhas abaixo.
        // await chrome.storage.local.remove([CURRENT_LINK_INDEX_KEY, PROCESSING_COMPLETE_KEY]);
        // currentLinkIndex = 0;
        // processingComplete = false; // Resetar para que a lógica abaixo possa iniciar
        return; // Sai se tudo já foi processado
    }

    const allTargetLinks = Array.from(document.querySelectorAll(`a[class*="${CLASS_NAME}"]`));

    console.log(`Encontrados ${allTargetLinks.length} links com a classe "${CLASS_NAME}".`);

    if (allTargetLinks.length === 0) {
        console.warn(`Nenhum link com a classe "${CLASS_NAME}" encontrado. Encerrando o script.`);
        await chrome.storage.local.set({ [PROCESSING_COMPLETE_KEY]: true }); // Marca como completo se não houver links
        return;
    }

    // Se já processamos todos os links disponíveis na sessão atual
    if (currentLinkIndex >= allTargetLinks.length) {
        console.log("Todos os links da lista foram processados nesta execução.");
        await chrome.storage.local.set({ [PROCESSING_COMPLETE_KEY]: true }); // Marca como completo
        await chrome.storage.local.remove(CURRENT_LINK_INDEX_KEY); // Limpa o índice
        return;
    }

    const linkToProcess = allTargetLinks[currentLinkIndex];

    if (linkToProcess && linkToProcess.href) {
        const targetUrl = linkToProcess.href;
        console.log(`Processando link ${currentLinkIndex + 1}/${allTargetLinks.length}: ${targetUrl}`);

        // Incrementa o índice para a próxima execução
        await chrome.storage.local.set({ [CURRENT_LINK_INDEX_KEY]: currentLinkIndex + 1 });
        console.log("Conseguiu passar para o proximo");
        // Abre a nova aba. A nova aba precisará de um script próprio.
        chrome.tabs.create({ url: targetUrl, active: false }, async (newTab) => {
            console.log(`Nova aba aberta com ID: ${newTab.id}, URL: ${newTab.url}`);

            // IMPORTANTE: Agora que a aba foi criada, precisamos injetar o SUB-SCRIPT nela.
            // Precisamos garantir que a página na nova aba carregue antes de injetar o script.
            // Uma forma simples é usar um pequeno atraso. Uma forma mais robusta seria usar chrome.tabs.onUpdated
            // para esperar o status 'complete', mas para simplificar, vamos usar setTimeout.

            setTimeout(async () => {
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: newTab.id },
                        files: ['sub_content.js'] // Nome do seu script secundário
                    });
                    console.log(`Sub-script injetado na aba ID ${newTab.id}.`);
                } catch (e) {
                    console.error(`Erro ao injetar sub_content.js na aba ${newTab.id}:`, e);
                }
            }, 7000); // Aguarda 5 segundos para a nova página carregar antes de injetar o sub-script. Pode precisar de ajuste.

            // Depois de abrir a aba e agendar a injeção do sub-script, precisamos voltar
            // à página principal e recarregá-la para que o próximo link seja processado.
            // Isso deve acontecer APÓS o sub-script ter tido chance de rodar e fechar a aba, se aplicável.
            // Um atraso maior aqui garante que a aba secundária complete seu trabalho.
            setTimeout(() => {
                if (currentLinkIndex + 1 < allTargetLinks.length) {
                    console.log("Recarregando a página principal para processar o próximo link...");
                    // Recarrega a aba principal para continuar o fluxo
                    chrome.tabs.reload(currentTab.id);
                } else {
                    console.log("Todos os links foram abertos. Processo concluído para esta sessão.");
                    chrome.storage.local.set({ [PROCESSING_COMPLETE_KEY]: true });
                    chrome.storage.local.remove(CURRENT_LINK_INDEX_KEY);
                }
            }, 10000); // Aguarda 10 segundos antes de recarregar a página principal
        });

    } else {
        console.error(`Link no índice ${currentLinkIndex} não encontrado ou não tem href. Pulando.`);
        // Tenta processar o próximo link se este falhar
        await chrome.storage.local.set({ [CURRENT_LINK_INDEX_KEY]: currentLinkIndex + 1 });
        // Recarrega a aba principal para continuar o fluxo
        chrome.tabs.reload(); // Recarrega a aba atual
    }
})();