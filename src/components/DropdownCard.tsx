import type { NodeResult, ImpactValue } from "axe-core";
import { useState, type ReactNode } from "react";

interface Props {
  heading: string;
  description: string;
  helpUrl: string;
  nodeViolation: NodeResult;
  impact?: ImpactValue;
  llmOutput: ReactNode;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    // Could add a toast notification here if desired
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
}

function highlightViolation(selector: string) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: "highlight-violation", selector },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          }
        );
      } else {
        reject(new Error("No active tab found"));
      }
    });
  });
}

function DropdownCard({
  heading,
  description,
  helpUrl,
  impact,
  nodeViolation,
  llmOutput,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  const handleCopyCode = (codeText: string, e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(codeText);
    setCopiedText(codeText);
    // Reset the copied state after 2 seconds
    setTimeout(() => setCopiedText(null), 2000);
  };
  
  const handleCardClick = () => {
    setIsOpen(!isOpen);
    
    // Highlight the element when card is opened
    if (!isOpen && nodeViolation.target && nodeViolation.target.length > 0) {
      const selector = typeof nodeViolation.target[0] === 'string' 
        ? nodeViolation.target[0] 
        : nodeViolation.target[0].toString();
      
      highlightViolation(selector).catch(error => {
        console.error('Failed to highlight element:', error);
      });
    }
  };

  // useEffect(() => {
  //   if (isOpen) {
  //     highlightViolation(tabId, selector);
  //   }
  // }, [isOpen]);

  // Get severity color and badge text
  const getSeverityStyles = (impact: ImpactValue | undefined) => {
    switch (impact) {
      case 'critical':
        return {
          badgeColor: 'bg-red-600',
          borderColor: 'border-red-300',
          textColor: 'text-red-700',
          badge: 'CRITICAL'
        };
      case 'serious':
        return {
          badgeColor: 'bg-red-500',
          borderColor: 'border-red-200', 
          textColor: 'text-red-600',
          badge: 'SERIOUS'
        };
      case 'moderate':
        return {
          badgeColor: 'bg-yellow-500',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-700',
          badge: 'MODERATE'
        };
      case 'minor':
        return {
          badgeColor: 'bg-green-500',
          borderColor: 'border-green-200',
          textColor: 'text-green-700', 
          badge: 'MINOR'
        };
      default:
        return {
          badgeColor: 'bg-gray-500',
          borderColor: 'border-gray-300',
          textColor: 'text-gray-600',
          badge: 'UNKNOWN'
        };
    }
  };

  const severityStyles = getSeverityStyles(impact);

  return (
    <button
      className={`bg-white border rounded-md ${severityStyles.borderColor} p-3 pr-8 flex gap-2 select-none transition-all hover:shadow-lg ${
        isOpen ? "shadow-md mt-2 mb-2" : ""
      }`}
      onClick={handleCardClick}
    >
      <div className="w-4 h-4 flex justify-center">
        <div
          className={`bg-sky-700 self-center rounded-full transition-all duration-100 ease-in-out ${
            isOpen ? "w-3 h-1" : "w-2 h-2"
          }`}
        ></div>
      </div>

      <div className="text-xs text-left select-none w-full">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-medium text-gray-950">{heading}</h2>
          <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${severityStyles.badgeColor}`}>
            {severityStyles.badge}
          </span>
        </div>
        <p className={`text-gray-600 pt-1 pb-3 ${isOpen ? "" : "hidden"}`}>
          <>
            {description}
            {". "}
            <span
              className="italic underline cursor-pointer transition-all whitespace-nowrap duration-75 hover:font-semibold"
              onClick={(e) => {
                e.stopPropagation();
                window.open(helpUrl, "_blank");
              }}
            >
              {"Learn more."}
            </span>
          </>
        </p>

        <div
          className={`border rounded-md p-2 border-sky-700 bg-sky-50 pointer-events-auto flex gap-2 select-text cursor-text ${
            isOpen ? "" : "hidden"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4 size-4 fill-sky-800"
          >
            <path
              fill-rule="evenodd"
              d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z"
              clip-rule="evenodd"
            />
          </svg>

          <div className="w-full text-sky-900 font-[Inria_Sans]">
            {typeof llmOutput === 'string' && llmOutput.includes('💻 Suggested Code:') ? (
              <div>
                <div className="mb-3">
                  {llmOutput.split('💻 Suggested Code:')[0].trim()}
                </div>
                {(() => {
                  const codeSnippet = llmOutput.split('💻 Suggested Code:')[1]?.trim();
                  if (codeSnippet && codeSnippet !== 'No code snippet provided') {
                    return (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-sky-800">💻 Suggested Code:</span>
                          <button
                            onClick={(e) => handleCopyCode(codeSnippet, e)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-sky-600 hover:bg-sky-700 text-white rounded transition-colors duration-200"
                            title="Copy code to clipboard"
                          >
                            {copiedText === codeSnippet ? (
                              <>
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                </svg>
                                Copied!
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                                </svg>
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="bg-gray-100 border border-gray-300 rounded-md p-3 text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all text-gray-800">
                          {codeSnippet}
                        </pre>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{llmOutput}</div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export default DropdownCard;
