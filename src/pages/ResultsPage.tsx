import { useEffect, useState } from "react";
import DropdownCard from "../components/DropdownCard";
import Badge from "../components/NumberBadge";
import Button from "../components/Button";
import type { AxeResults } from "axe-core";

interface Props {
  onRunAxe: () => void;
  axeResults: AxeResults;
  onBack?: () => void;
  onStop?: () => void;
  isTestMode?: boolean;
}

const ResultsPage = ({ onRunAxe, axeResults, onBack, onStop, isTestMode }: Props) => {
  const [aiSuggestions, setAiSuggestions] = useState<Map<string, string>>(new Map());
  const [loadingSuggestions, setLoadingSuggestions] = useState<Set<string>>(new Set());
  const [bulkRequestMade, setBulkRequestMade] = useState(false);
  const [stopRequested, setStopRequested] = useState(false);

  // Clear suggestions when axeResults change (new test run)
  useEffect(() => {
    setAiSuggestions(new Map());
    setLoadingSuggestions(new Set());
    setBulkRequestMade(false);
    setStopRequested(false);
  }, [axeResults]);

  const handleStop = () => {
    setStopRequested(true);
    setLoadingSuggestions(new Set());
    if (onStop) {
      onStop();
    }
  };

  const handleRerun = () => {
    // Clear all cached suggestions and force new source file selection
    setAiSuggestions(new Map());
    setLoadingSuggestions(new Set());
    setBulkRequestMade(false);
    onRunAxe();
  };

  const fetchAllSuggestions = async () => {
    if (bulkRequestMade || !axeResults.violations.length || stopRequested) return;
    
    setBulkRequestMade(true);
    
    // Mark all violations as loading
    const allKeys = new Set<string>();
    axeResults.violations.forEach(violation => {
      violation.nodes.forEach(node => {
        const suggestionKey = `${violation.id}-${node.target}`;
        allKeys.add(suggestionKey);
      });
    });
    setLoadingSuggestions(allKeys);

    try {
      console.log('Fetching all AI suggestions in bulk...');
      
      const response = await fetch('http://localhost:5500/suggest-fixes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          violations: axeResults.violations.map(v => ({
            id: v.id,
            description: v.description,
            impact: v.impact,
            help: v.help,
            helpUrl: v.helpUrl,
            nodes: v.nodes.map(node => ({
              target: Array.isArray(node.target) ? node.target : [node.target],
              html: node.html || ''
            }))
          })),
          url: window.location.href,
          timestamp: new Date().toISOString()
        })
      });

      // Check if stop was requested during the fetch
      if (stopRequested) {
        setLoadingSuggestions(new Set());
        return;
      }

      if (response.ok) {
        const data = await response.json();
        console.log('Bulk AI suggestion response:', data);
        
        const suggestionsArray = data.suggestions?.suggestions || data.suggestions || [];
        const newSuggestions = new Map<string, string>();
        
        // Map suggestions back to violations
        axeResults.violations.forEach(violation => {
          violation.nodes.forEach(node => {
            const suggestionKey = `${violation.id}-${node.target}`;
            const matchingSuggestion = suggestionsArray.find((s: any) => s.violationId === violation.id);
            
            if (matchingSuggestion) {
              const description = matchingSuggestion.aiSuggestion || matchingSuggestion.fixDescription || 'AI suggestion available';
              const codeSnippet = matchingSuggestion.codeSnippet || '';
              
              const suggestion = codeSnippet && codeSnippet !== 'No code snippet provided' ? 
                `${description}\n\n💻 Suggested Code:\n${codeSnippet}` :
                description;
                
              newSuggestions.set(suggestionKey, suggestion);
            } else {
              newSuggestions.set(suggestionKey, 'AI suggestion not available');
            }
          });
        });
        
        setAiSuggestions(newSuggestions);
      } else {
        console.error('Failed to fetch bulk AI suggestions:', response.status, response.statusText);
        
        let errorMessage = 'Failed to load AI suggestion';
        if (response.status === 400) {
          errorMessage = 'File selection cancelled. Please select a source file to get context-aware suggestions.';
        } else if (response.status === 408) {
          errorMessage = 'Timeout waiting for VS Code file selection. Please select a file in VS Code.';
        } else if (response.status === 503) {
          errorMessage = 'VS Code extension not connected. Please ensure VS Code extension is active.';
        }
        
        // Set error message for all suggestions
        allKeys.forEach(key => {
          setAiSuggestions(prev => new Map(prev).set(key, errorMessage));
        });
      }
    } catch (error) {
      console.error('Error fetching bulk AI suggestions:', error);
      // Set error message for all suggestions
      allKeys.forEach(key => {
        setAiSuggestions(prev => new Map(prev).set(key, 'Network error - Backend not available'));
      });
    } finally {
      setLoadingSuggestions(new Set());
    }
  };

  const popUpIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-4 fill-white"
    >
      <path
        fillRule="evenodd"
        d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm15.408 3.352a.75.75 0 0 0-.919.53 7.5 7.5 0 0 1-12.548 3.364l-1.902-1.903h3.183a.75.75 0 0 0 0-1.5H2.984a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.059-4.035.75.75 0 0 0-.53-.918Z"
        clipRule="evenodd"
      />
    </svg>
  );

  useEffect(() => {
    document.body.classList.add("bg-slate-100");

    return () => {
      document.body.classList.remove("bg-slate-100");
    };
  });

  const numViolations: number =
    axeResults?.violations?.reduce(
      (sum, violation) => sum + (violation?.nodes?.length ?? 0),
      0
    ) ?? 0;

  return (
    <div className="flex justify-center items-center mt-10">
      <div className="flex flex-col gap-10 justify-items-center-safe justify-center min-w-xs w-9/10 max-w-lg">
        <div className="flex flex-row gap-5">
          <div className="flex-none">
            <Badge number={numViolations} />
          </div>
          <div className="flex flex-col justify-center gap-3">
            <h1 className="text-sm select-none">
              <span className="font-bold">
                {numViolations} accessibility-related issues
              </span>
              {" have been detected within this webpage."}
            </h1>
            <div className="flex flex-row gap-2">
              {onBack && (
                <Button
                  colour="bg-gray-600"
                  hoverColour="hover:bg-gray-500"
                  text="Back"
                  textColour="text-white"
                  onClick={onBack}
                />
              )}
              <Button
                colour="bg-red-800"
                hoverColour="hover:bg-red-600"
                icon={popUpIcon}
                text={isTestMode ? "Re-run Test Mode" : "Re-run Test"}
                textColour="text-white"
                onClick={handleRerun}
              />
              {!bulkRequestMade && (
                <Button
                  colour="bg-blue-600"
                  hoverColour="hover:bg-blue-500"
                  text="Get AI Suggestions"
                  textColour="text-white"
                  onClick={fetchAllSuggestions}
                />
              )}
              {onStop && (
                <Button
                  colour="bg-orange-600"
                  hoverColour="hover:bg-orange-500"
                  text="Stop Analysis"
                  textColour="text-white"
                  onClick={handleStop}
                />
              )}
            </div>
          </div>
        </div>
        <div className="overflow-auto flex flex-col gap-2 pb-5">
          {axeResults?.violations.map((violation) => {
            return violation.nodes.map((node, index) => {
              const suggestionKey = `${violation.id}-${node.target}`;
              const suggestion = aiSuggestions.get(suggestionKey);
              const isLoading = loadingSuggestions.has(suggestionKey);

              return (
                <DropdownCard
                  key={`${violation.id}-${index}`}
                  heading={violation.help}
                  description={violation.description}
                  helpUrl={violation.helpUrl}
                  nodeViolation={node}
                  llmOutput={suggestion || (isLoading ? "Loading AI suggestion..." : "Click 'Get AI Suggestions' to analyze with source code")}
                />
              );
            });
          })}
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
