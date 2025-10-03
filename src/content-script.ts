import axe, { AxeResults } from "axe-core";

if (!(window as any)._contentScriptInjected) {
    (window as any)._contentScriptInjected = true;
    
    async function runAxe(tabId: number): Promise<void> {
        try {
            const results: AxeResults = await new Promise((resolve, reject) => {
                axe.run(document, {}, (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results)
                    }
                })
            })
            console.log(results)
            console.log(`Axe-core scan on tab ${tabId}`)
            chrome.runtime.sendMessage({ type: "axe-results", results, tabId: tabId });
        } catch(err) {
            console.error("Axe-core scan failed:", err);
        }
    }

    chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
        if (message.type === "run-axe") {
            runAxe(message.tabId);
            sendResponse({ status: "axe started" });
        }

        if (message.type === "highlight-violation") {
            const el = document.querySelector<HTMLElement>(message.selector)
            if (el) {
                el.style.outline = "4px solid red"
                el.style.outlineOffset = "2px"
            }
            sendResponse({ status: "highlighted" });
        }
    })
}