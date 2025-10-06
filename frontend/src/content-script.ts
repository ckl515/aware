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

    // Element highlighting functionality
    let currentHighlight: HTMLElement | null = null;

    function highlightElement(selector: string): void {
        // Clear any existing highlights
        clearHighlight();
        
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) {
            console.warn('Element not found for selector:', selector);
            return;
        }

        // Create highlight overlay
        const overlay = document.createElement('div');
        overlay.id = 'axe-highlight-overlay';
        overlay.style.cssText = `
            position: absolute;
            pointer-events: none;
            z-index: 999999;
            border: 3px solid red;
            background-color: rgba(255, 0, 0, 0.1);
            box-sizing: border-box;
        `;

        const rect = element.getBoundingClientRect();
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;

        overlay.style.left = (rect.left + scrollX) + 'px';
        overlay.style.top = (rect.top + scrollY) + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';

        document.body.appendChild(overlay);
        currentHighlight = overlay;

        // Scroll element into view
        element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'center'
        });

        // Auto-remove highlight after 5 seconds
        setTimeout(() => {
            clearHighlight();
        }, 5000);
    }

    function clearHighlight(): void {
        if (currentHighlight) {
            currentHighlight.remove();
            currentHighlight = null;
        }
        
        // Also remove any existing overlays
        const existingOverlay = document.getElementById('axe-highlight-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
    }

    chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
        if (message.type === "run-axe") {
            runAxe(message.tabId);
            sendResponse({ status: "axe started" });
        }

        if (message.type === "highlight-violation") {
            console.log('Highlighting element with selector:', message.selector);
            try {
                highlightElement(message.selector);
                sendResponse({ status: "highlighted", selector: message.selector });
            } catch (error) {
                console.error('Error highlighting element:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                sendResponse({ status: "error", error: errorMessage });
            }
        }

        if (message.type === "clear-highlight") {
            clearHighlight();
            sendResponse({ status: "highlight-cleared" });
        }
    })
}