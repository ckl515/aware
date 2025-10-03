import type { NodeResult } from "axe-core";
import { useState, type ReactNode } from "react";

interface Props {
  heading: string;
  description: string;
  helpUrl: string;
  nodeViolation: NodeResult;
  llmOutput: ReactNode;
}

// function highlightViolation(tabId: number, selector: string) {
//   return new Promise((resolve, reject) => {
//     chrome.tabs.sendMessage(
//       tabId,
//       { type: "highlight-violation", selector },
//       (response) => {
//         if (chrome.runtime.lastError) {
//           reject(chrome.runtime.lastError);
//         } else {
//           resolve(response);
//         }
//       }
//     );
//   });
// }

function DropdownCard({
  heading,
  description,
  helpUrl,
  // nodeViolation,
  llmOutput,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  // const selector = nodeViolation.target;

  // useEffect(() => {
  //   if (isOpen) {
  //     highlightViolation(tabId, selector);
  //   }
  // }, [isOpen]);

  return (
    <button
      className={`bg-white border rounded-md border-gray-400 p-3 pr-8 flex gap-2 select-none transition-all hover:shadow-lg ${
        isOpen ? "shadow-md mt-2 mb-2" : ""
      }`}
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="w-4 h-4 flex justify-center">
        <div
          className={`bg-sky-700 self-center rounded-full transition-all duration-100 ease-in-out ${
            isOpen ? "w-3 h-1" : "w-2 h-2"
          }`}
        ></div>
      </div>

      <div className="text-xs text-left select-none w-full">
        <h2 className="font-medium text-gray-950">{heading}</h2>
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
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-sky-800">💻 Suggested Code:</span>
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
