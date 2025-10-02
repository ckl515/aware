// Updated analyzer.js for browser extension with source code integration

// Load axe-core dynamically
const axeScript = document.createElement("script");
axeScript.src = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.2/axe.min.js";

window.analyzeAccessibility = async function() {
    try {
        console.log('Starting accessibility analysis...');
        
        // Create results container if it doesn't exist
        let resultsDiv = document.getElementById('accessibility-results');
        if (!resultsDiv) {
            resultsDiv = document.createElement('div');
            resultsDiv.id = 'accessibility-results';
            resultsDiv.style.padding = '20px';
            resultsDiv.style.margin = '20px';
            resultsDiv.style.border = '1px solid #ccc';
            document.body.insertBefore(resultsDiv, document.body.firstChild);
        }
        
        resultsDiv.innerHTML = 'Analyzing...';
        
        const results = await axe.run(document);
        const filtered = results.violations.filter(v => v.id !== 'image-alt');
        
        // Display violations
        resultsDiv.innerHTML = `
            <h2>Found ${filtered.length} accessibility violations:</h2>
            ${filtered.map(v => `
                <div style="margin-bottom: 15px;">
                    <strong>${v.id}</strong> (${v.impact} impact)<br>
                    ${v.description}<br>
                    Help: ${v.help}<br>
                    <a href="${v.helpUrl}" target="_blank">Learn more</a>
                </div>
            `).join('')}
        `;

        // Send to backend
        const payload = {
            violations: filtered.map((violation) => ({
                id: violation.id,
                description: violation.description,
                impact: violation.impact,
                help: violation.help,
                helpUrl: violation.helpUrl,
                nodes: violation.nodes.map((node) => ({
                    target: node.target,
                    html: node.html,
                })),
            })),
            url: window.location.href,
            timestamp: new Date().toISOString()
        };

        // Send to FastAPI backend
        const response = await fetch("http://localhost:5500/suggest-fixes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload),
        });
        
        const data = await response.json();
        console.log('Backend response:', data);
        
        // Handle the new response structure
        const suggestions = data.suggestions || []; // Extract suggestions array
        
        resultsDiv.innerHTML += `
            <h3>AI Suggestions (${suggestions.length}):</h3>
            ${suggestions.map(suggestion => `
                <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; background: #f9f9f9;">
                    <strong>Violation ID:</strong> ${suggestion.violationId}<br>
                    <strong>Fix:</strong> ${suggestion.fixDescription}<br>
                    <strong>Code:</strong>
                    <pre style="background: #f0f0f0; padding: 10px; overflow-x: auto;">${suggestion.codeSnippet}</pre>
                </div>
            `).join('')}
        `;

        // Convert suggestions to format expected by highlightViolations
        const violationsForHighlighting = filtered.map(violation => {
            const matchingSuggestion = suggestions.find(s => s.violationId === violation.id);
            return {
                ...violation,
                violationId: violation.id,
                aiSuggestion: matchingSuggestion ? matchingSuggestion.fixDescription + '\n\n' + matchingSuggestion.codeSnippet : 'No suggestion available'
            };
        });
        
        highlightViolations(violationsForHighlighting);
        
    } catch (err) {
        console.error('Analysis failed:', err);
        if (resultsDiv) {
            resultsDiv.innerHTML = `Error: ${err.message}`;
        }
    }
};

// Enhanced highlighting function with AI suggestions
function highlightViolations(suggestions) {
    // Remove existing highlights
    document.querySelectorAll('[data-axe-highlighted]').forEach(el => {
        el.style.outline = '';
        el.removeAttribute('data-axe-highlighted');
        el.removeAttribute('data-axe-tooltip');
    });

    suggestions.forEach((suggestion) => {
        suggestion.nodes?.forEach((node) => {
            try {
                const elements = document.querySelectorAll(node.target.join(','));
                elements.forEach((el, index) => {
                    // Add visual highlight
                    el.style.outline = '3px solid #FF6B6B';
                    el.style.outlineOffset = '2px';
                    el.setAttribute('data-axe-highlighted', 'true');
                    el.setAttribute('data-axe-violation-id', suggestion.violationId);
                    
                    // Add hover tooltip with AI suggestion
                    const shortSuggestion = suggestion.aiSuggestion?.substring(0, 200) + '...' || 'AI suggestion available';
                    el.setAttribute('title', `Accessibility Issue: ${suggestion.description}\nAI Suggestion: ${shortSuggestion}`);
                    
                    // Add click handler to show full suggestion
                    el.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        showSuggestionModal(suggestion);
                    }, { once: false });
                });
            } catch (error) {
                console.warn('Could not highlight element:', node.target, error);
            }
        });
    });
    
    console.log(`Highlighted ${suggestions.length} accessibility violations`);
}

// Modal to show full AI suggestions
function showSuggestionModal(suggestion) {
    // Remove existing modal
    const existingModal = document.getElementById('axe-suggestion-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'axe-suggestion-modal';
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 20px;
        max-width: 600px;
        max-height: 70vh;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: Arial, sans-serif;
        line-height: 1.5;
    `;
    
    modal.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="margin: 0; color: #d73027;">Accessibility Issue</h3>
            <button id="close-modal" style="background: none; border: none; font-size: 20px; cursor: pointer;">&times;</button>
        </div>
        <div style="margin-bottom: 15px;">
            <strong>Issue:</strong> ${suggestion.description}<br>
            <strong>Impact:</strong> <span style="color: ${getImpactColor(suggestion.impact)};">${suggestion.impact}</span><br>
            <strong>Source Code Context:</strong> ${suggestion.hasSourceCode ? '✅ Available' : '❌ Not available'}
        </div>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
            <strong>AI Suggestion:</strong><br>
            <div style="white-space: pre-wrap; margin-top: 10px;">${suggestion.aiSuggestion || 'No suggestion available'}</div>
        </div>
        <div style="text-align: right;">
            <button id="copy-suggestion" style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                Copy Suggestion
            </button>
            <button id="close-modal-btn" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                Close
            </button>
        </div>
    `;
    
    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 9999;
    `;
    
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    
    // Event listeners
    const closeModal = () => {
        modal.remove();
        backdrop.remove();
    };
    
    document.getElementById('close-modal').onclick = closeModal;
    document.getElementById('close-modal-btn').onclick = closeModal;
    backdrop.onclick = closeModal;
    
    document.getElementById('copy-suggestion').onclick = () => {
        navigator.clipboard.writeText(suggestion.aiSuggestion || '').then(() => {
            const btn = document.getElementById('copy-suggestion');
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            btn.style.background = '#28a745';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '#007bff';
            }, 2000);
        });
    };
    
    // Close on escape key
    document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    });
}

function getImpactColor(impact) {
    switch (impact?.toLowerCase()) {
        case 'critical': return '#d73027';
        case 'serious': return '#fc8d59';
        case 'moderate': return '#fee08b';
        case 'minor': return '#d9ef8b';
        default: return '#666';
    }
}

// Utility function to clear all highlights
window.clearAccessibilityHighlights = function() {
    document.querySelectorAll('[data-axe-highlighted]').forEach(el => {
        el.style.outline = '';
        el.removeAttribute('data-axe-highlighted');
        el.removeAttribute('data-axe-violation-id');
        el.removeAttribute('title');
    });
    
    const modal = document.getElementById('axe-suggestion-modal');
    if (modal) {
        modal.remove();
    }
    
    console.log('Cleared all accessibility highlights');
};

// Auto-initialize when script loads
document.head.appendChild(axeScript);

// Export for testing in console
console.log('Accessibility analyzer loaded. Use analyzeAccessibility() to run analysis.');
console.log('Use clearAccessibilityHighlights() to clear highlights.');

/* 
TESTING COMMANDS FOR BROWSER CONSOLE:
// Run analysis
analyzeAccessibility().then(results => console.log(results));

// Clear highlights
clearAccessibilityHighlights();
*/