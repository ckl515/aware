import type { NodeResult, ImpactValue } from "axe-core";
import { useState, useEffect, type ReactNode } from "react";

interface Props {
  heading: string;
  description: string;
  helpUrl: string;
  nodeViolation: NodeResult;
  impact?: ImpactValue;
  llmOutput: ReactNode;
  index?: number; // For staggered animations
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
  index = 0,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHighlighting, setIsHighlighting] = useState(false);
  
  useEffect(() => {
    // Staggered animation entrance
    const timer = setTimeout(() => setIsVisible(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  const handleCopyCode = (codeText: string, e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(codeText);
    setCopiedText(codeText);
    // Reset the copied state after 2 seconds
    setTimeout(() => setCopiedText(null), 2000);
  };
  
  const handleCardClick = async () => {
    setIsOpen(!isOpen);
    
    // Highlight the element when card is opened
    if (!isOpen && nodeViolation.target && nodeViolation.target.length > 0) {
      setIsHighlighting(true);
      const selector = typeof nodeViolation.target[0] === 'string' 
        ? nodeViolation.target[0] 
        : nodeViolation.target[0].toString();
      
      try {
        await highlightViolation(selector);
      } catch (error) {
        console.error('Failed to highlight element:', error);
      } finally {
        setTimeout(() => setIsHighlighting(false), 500);
      }
    }
  };

  // Get severity color and badge text
  const getSeverityStyles = (impact: ImpactValue | undefined) => {
    switch (impact) {
      case 'critical':
        return {
          badgeColor: 'bg-gradient-to-r from-red-500 to-red-600',
          borderColor: 'border-red-200 hover:border-red-300',
          textColor: 'text-red-700',
          badge: 'CRITICAL',
          glowColor: 'hover:shadow-red-200',
          pulseColor: 'bg-red-400'
        };
      case 'serious':
        return {
          badgeColor: 'bg-gradient-to-r from-orange-500 to-orange-600',
          borderColor: 'border-orange-200 hover:border-orange-300', 
          textColor: 'text-orange-700',
          badge: 'SERIOUS',
          glowColor: 'hover:shadow-orange-200',
          pulseColor: 'bg-orange-400'
        };
      case 'moderate':
        return {
          badgeColor: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
          borderColor: 'border-yellow-200 hover:border-yellow-300',
          textColor: 'text-yellow-700',
          badge: 'MODERATE',
          glowColor: 'hover:shadow-yellow-200',
          pulseColor: 'bg-yellow-400'
        };
      case 'minor':
        return {
          badgeColor: 'bg-gradient-to-r from-green-500 to-green-600',
          borderColor: 'border-green-200 hover:border-green-300',
          textColor: 'text-green-700', 
          badge: 'MINOR',
          glowColor: 'hover:shadow-green-200',
          pulseColor: 'bg-green-400'
        };
      default:
        return {
          badgeColor: 'bg-gradient-to-r from-gray-500 to-gray-600',
          borderColor: 'border-gray-300 hover:border-gray-400',
          textColor: 'text-gray-600',
          badge: 'UNKNOWN',
          glowColor: 'hover:shadow-gray-200',
          pulseColor: 'bg-gray-400'
        };
    }
  };

  const severityStyles = getSeverityStyles(impact);

  return (
    <div className={`
      transform transition-all-smooth
      ${isVisible ? 'animate-fade-in-up opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
    `} style={{ animationDelay: `${index * 0.1}s` }}>
      <button
        className={`
          bg-white/90 backdrop-blur-sm border rounded-xl ${severityStyles.borderColor} 
          p-4 pr-6 flex gap-3 select-none 
          transition-all-smooth transform-gpu
          hover-lift hover:shadow-lg ${severityStyles.glowColor}
          ${isOpen ? "shadow-lg ring-2 ring-blue-100 mb-2" : "hover:shadow-md"}
          ${isHighlighting ? 'animate-pulse-custom ring-2 ring-blue-400' : ''}
          group relative overflow-hidden w-full
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        `}
        onClick={handleCardClick}
      >
        {/* Subtle background gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 to-purple-50/0 group-hover:from-blue-50/50 group-hover:to-purple-50/30 transition-all duration-500" />
        
        {/* Animated indicator */}
        <div className="w-5 h-5 flex justify-center items-center relative z-10">
          <div className={`
            ${severityStyles.pulseColor} rounded-full 
            transition-all duration-300 ease-out transform-gpu
            ${isOpen ? "w-4 h-1 animate-pulse" : "w-3 h-3"}
            ${isHighlighting ? 'animate-ping' : ''}
          `}>
            {isOpen && (
              <div className="absolute inset-0 bg-current rounded-full animate-pulse" />
            )}
          </div>
        </div>

        <div className="text-xs text-left select-none w-full relative z-10">
          {/* Header with enhanced animation */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-900 group-hover:text-gray-800 transition-colors-smooth">
              {heading}
            </h2>
            <span className={`
              px-3 py-1.5 rounded-full text-xs font-bold text-white 
              ${severityStyles.badgeColor} 
              shadow-sm transform transition-all-smooth
              group-hover:scale-105 group-hover:shadow-md
            `}>
              {severityStyles.badge}
            </span>
          </div>

          {/* Expandable description with smooth animation */}
          <div className={`
            overflow-hidden transition-all duration-500 ease-out
            ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}
          `}>
            <p className="text-gray-600 pt-1 pb-4 leading-relaxed">
              {description}
              {". "}
              <span
                className="
                  inline-flex items-center gap-1 italic underline cursor-pointer 
                  transition-all-smooth whitespace-nowrap
                  hover:text-blue-600 hover:font-medium
                  group/link
                "
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(helpUrl, "_blank");
                }}
              >
                Learn more
                <svg className="w-3 h-3 transition-transform group-hover/link:translate-x-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </span>
            </p>
          </div>

          {/* AI output section with enhanced styling */}
          <div className={`
            transition-all duration-500 ease-out overflow-hidden
            ${isOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"}
          `}>
            <div
              className="
                border rounded-xl p-4 border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-sky-50/60
                backdrop-blur-sm pointer-events-auto flex gap-3 select-text cursor-text
                shadow-sm hover:shadow-md transition-all-smooth
              "
              onClick={(e) => e.stopPropagation()}
            >
              {/* AI icon with animation */}
              <div className="flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5 fill-blue-600 animate-float"
                >
                  <path
                    fillRule="evenodd"
                    d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              <div className="w-full text-blue-900 font-[Inter]">
                {typeof llmOutput === 'string' && llmOutput.includes('💻 Suggested Code:') ? (
                  <div>
                    <div className="mb-4 leading-relaxed">
                      {llmOutput.split('💻 Suggested Code:')[0].trim()}
                    </div>
                    {(() => {
                      const codeSnippet = llmOutput.split('💻 Suggested Code:')[1]?.trim();
                      if (codeSnippet && codeSnippet !== 'No code snippet provided') {
                        return (
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                                💻 Suggested Code
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                              </span>
                              <button
                                onClick={(e) => handleCopyCode(codeSnippet, e)}
                                className={`
                                  flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg
                                  transition-all-smooth transform-gpu
                                  ${copiedText === codeSnippet 
                                    ? 'bg-green-600 text-white scale-105' 
                                    : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105'
                                  }
                                  shadow-sm hover:shadow-md active:scale-95
                                `}
                                title="Copy code to clipboard"
                              >
                                {copiedText === codeSnippet ? (
                                  <>
                                    <svg className="w-3 h-3 animate-bounce-custom" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                    </svg>
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3 h-3 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                                    </svg>
                                    Copy
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="
                              bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm font-mono 
                              overflow-x-auto custom-scrollbar whitespace-pre-wrap break-all text-gray-800
                              shadow-inner hover:bg-gray-100 transition-colors-smooth
                            ">
                              {codeSnippet}
                            </pre>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed">{llmOutput}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

export default DropdownCard;
