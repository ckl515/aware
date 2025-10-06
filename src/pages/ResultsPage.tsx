import { useEffect, useState } from "react";
import DropdownCard from "../components/DropdownCard";
import Badge from "../components/NumberBadge";
import Button from "../components/Button";
import type { AxeResults } from "axe-core";
import jsPDF from "jspdf";

interface Props {
  onRunAxe: () => void;
  axeResults: AxeResults;
  onBack?: () => void;
  isTestMode?: boolean;
}

const ResultsPage = ({ onRunAxe, axeResults, onBack, isTestMode }: Props) => {
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
    
    // Set stopped message for all suggestions that were loading
    const stoppedMessage = "AI suggestions generation stopped";
    setAiSuggestions(prev => {
      const newSuggestions = new Map(prev);
      // Update any suggestions that don't have content yet
      sortedViolations.forEach(violation => {
        violation.nodes.forEach(node => {
          const suggestionKey = `${violation.id}-${node.target}`;
          if (!newSuggestions.has(suggestionKey) || newSuggestions.get(suggestionKey)?.includes("Loading")) {
            newSuggestions.set(suggestionKey, stoppedMessage);
          }
        });
      });
      return newSuggestions;
    });
    
    // Don't call onStop to avoid changing screens
  };

  const handleRerun = () => {
    // Clear all cached suggestions and force new source file selection
    setAiSuggestions(new Map());
    setLoadingSuggestions(new Set());
    setBulkRequestMade(false);
    setStopRequested(false);
    onRunAxe();
  };

  const generatePDFReport = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPosition = margin;
    
    // Helper function to add text with word wrapping
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12) => {
      pdf.setFontSize(fontSize);
      const lines = pdf.splitTextToSize(text, maxWidth);
      
      // Check if we need a new page
      if (y + (lines.length * fontSize * 0.4) > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      
      pdf.text(lines, x, y);
      return y + (lines.length * fontSize * 0.4) + 5;
    };

    // Header with branding
    pdf.setFillColor(59, 130, 246); // Blue color
    pdf.rect(0, 0, pageWidth, 30, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont("helvetica", "bold");
    pdf.text("Accessibility Report", margin, 20);
    
    pdf.setTextColor(0, 0, 0); // Reset to black
    yPosition = 50;
    
    // Current date and URL
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    yPosition = addWrappedText(`Generated: ${new Date().toLocaleString()}`, margin, yPosition, maxWidth);
    yPosition = addWrappedText(`URL: ${window.location.href}`, margin, yPosition, maxWidth);
    yPosition = addWrappedText(`Tool: Aware Accessibility Extension`, margin, yPosition, maxWidth);
    yPosition += 15;
    
    // Summary box
    pdf.setFillColor(248, 250, 252); // Light gray background
    pdf.rect(margin, yPosition - 5, maxWidth, 60, 'F');
    pdf.setDrawColor(226, 232, 240); // Border color
    pdf.rect(margin, yPosition - 5, maxWidth, 60, 'S');
    
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    yPosition = addWrappedText("Executive Summary", margin + 10, yPosition + 5, maxWidth - 20, 16);
    
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    yPosition = addWrappedText(`Total violations found: ${numViolations}`, margin + 10, yPosition, maxWidth - 20);
    yPosition = addWrappedText(`Unique violation types: ${sortedViolations.length}`, margin + 10, yPosition, maxWidth - 20);
    
    // Calculate compliance percentage (this is a rough estimate)
    const totalChecks = numViolations + 50; // Assume some passing checks
    const complianceRate = Math.max(0, Math.round(((totalChecks - numViolations) / totalChecks) * 100));
    yPosition = addWrappedText(`Estimated compliance rate: ${complianceRate}%`, margin + 10, yPosition, maxWidth - 20);
    
    yPosition += 20;
    
    // Violations by severity
    const severityCounts = sortedViolations.reduce((acc, violation) => {
      const impact = violation.impact || 'unknown';
      acc[impact] = (acc[impact] || 0) + violation.nodes.length;
      return acc;
    }, {} as Record<string, number>);
    
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    yPosition = addWrappedText("Violations by Severity", margin, yPosition, maxWidth, 14);
    
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    
    // Color-code severity levels
    const severityColors = {
      critical: [220, 38, 38],   // Red
      serious: [249, 115, 22],   // Orange  
      moderate: [234, 179, 8],   // Yellow
      minor: [34, 197, 94],      // Green
      unknown: [107, 114, 128]   // Gray
    };
    
    Object.entries(severityCounts).forEach(([severity, count]) => {
      const color = severityColors[severity as keyof typeof severityColors] || severityColors.unknown;
      pdf.setFillColor(color[0], color[1], color[2]);
      pdf.circle(margin + 5, yPosition + 3, 2, 'F');
      yPosition = addWrappedText(`${severity.charAt(0).toUpperCase() + severity.slice(1)}: ${count}`, margin + 15, yPosition, maxWidth - 15);
    });
    yPosition += 15;
    
    // Detailed violations
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    yPosition = addWrappedText("Detailed Violations", margin, yPosition, maxWidth, 16);
    yPosition += 5;
    
    sortedViolations.forEach((violation, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 120) {
        pdf.addPage();
        yPosition = margin;
      }
      
      // Violation header with severity indicator
      const severityColor = severityColors[violation.impact as keyof typeof severityColors] || severityColors.unknown;
      pdf.setFillColor(severityColor[0], severityColor[1], severityColor[2]);
      pdf.circle(margin + 5, yPosition + 5, 3, 'F');
      
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      yPosition = addWrappedText(`${index + 1}. ${violation.help}`, margin + 15, yPosition, maxWidth - 15, 14);
      
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      yPosition = addWrappedText(`Severity: ${(violation.impact || 'unknown').charAt(0).toUpperCase() + (violation.impact || 'unknown').slice(1)}`, margin + 15, yPosition, maxWidth - 15);
      yPosition = addWrappedText(`Rule ID: ${violation.id}`, margin + 15, yPosition, maxWidth - 15);
      yPosition = addWrappedText(`Elements affected: ${violation.nodes.length}`, margin + 15, yPosition, maxWidth - 15);
      yPosition = addWrappedText(`Description: ${violation.description}`, margin + 15, yPosition, maxWidth - 15);
      
      if (violation.helpUrl) {
        yPosition = addWrappedText(`More info: ${violation.helpUrl}`, margin + 15, yPosition, maxWidth - 15);
      }
      
      // List affected elements
      if (violation.nodes.length > 0) {
        yPosition = addWrappedText("Affected elements:", margin + 15, yPosition, maxWidth - 15);
        violation.nodes.slice(0, 3).forEach((node) => { // Limit to first 3 elements for readability
          const selector = Array.isArray(node.target) ? node.target.join(' ') : node.target;
          yPosition = addWrappedText(`• ${selector}`, margin + 25, yPosition, maxWidth - 25);
        });
        
        if (violation.nodes.length > 3) {
          yPosition = addWrappedText(`... and ${violation.nodes.length - 3} more elements`, margin + 25, yPosition, maxWidth - 25);
        }
      }
      
      yPosition += 10;
    });
    
    // Footer with page numbers
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Page ${i} of ${totalPages}`, pageWidth - 40, pageHeight - 10);
      pdf.text("Generated by Aware Extension", margin, pageHeight - 10);
    }
    
    // Save the PDF
    const fileName = `accessibility-report-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  };

  const fetchAllSuggestions = async () => {
    // Prevent multiple calls - exit early if already requested
    if (bulkRequestMade || !axeResults.violations.length || stopRequested) {
      console.log('Bulk request already made or conditions not met, skipping...');
      return;
    }
    
    console.log('Starting bulk AI suggestions request...');
    setBulkRequestMade(true);
    
    // Mark all violations as loading using sorted violations
    const allKeys = new Set<string>();
    sortedViolations.forEach(violation => {
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
          violations: sortedViolations.map(v => ({
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
        
        // Create a tracking system for suggestions per violation type
        const suggestionCounters = new Map<string, number>();
        
        // Map suggestions back to violations using sorted violations
        sortedViolations.forEach(violation => {
          // Initialize counter for this violation type
          if (!suggestionCounters.has(violation.id)) {
            suggestionCounters.set(violation.id, 0);
          }
          
          violation.nodes.forEach(node => {
            const suggestionKey = `${violation.id}-${node.target}`;
            
            // Get the current counter for this violation type
            const currentIndex = suggestionCounters.get(violation.id) || 0;
            
            // Find all suggestions for this violation type
            const matchingSuggestions = suggestionsArray.filter((s: any) => s.violationId === violation.id);
            
            // Get the suggestion at the current index, or the first one if we run out
            const matchingSuggestion = matchingSuggestions[currentIndex] || matchingSuggestions[0];
            
            if (matchingSuggestion) {
              const description = matchingSuggestion.aiSuggestion || matchingSuggestion.fixDescription || 'AI suggestion available';
              const codeSnippet = matchingSuggestion.codeSnippet || '';
              
              const suggestion = codeSnippet && codeSnippet !== 'No code snippet provided' ? 
                `${description}\n\n💻 Suggested Code:\n${codeSnippet}` :
                description;
                
              newSuggestions.set(suggestionKey, suggestion);
              
              // Increment the counter for this violation type
              suggestionCounters.set(violation.id, currentIndex + 1);
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
      
      // Reset bulk request flag on error so user can try again
      setBulkRequestMade(false);
      
      // Set error message for all suggestions
      allKeys.forEach(key => {
        setAiSuggestions(prev => new Map(prev).set(key, 'Network error - Backend not available. Click "Get AI Suggestions" to retry.'));
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

  // Define severity order (highest to lowest)
  const severityOrder = {
    'critical': 0,
    'serious': 1,
    'moderate': 2,
    'minor': 3
  } as const;

  // Sort violations by severity
  const sortedViolations = axeResults?.violations.slice().sort((a, b) => {
    const aSeverity = severityOrder[a.impact as keyof typeof severityOrder] ?? 999;
    const bSeverity = severityOrder[b.impact as keyof typeof severityOrder] ?? 999;
    return aSeverity - bSeverity;
  }) || [];

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
              <Button
                colour="bg-blue-600"
                hoverColour="hover:bg-blue-500"
                text={bulkRequestMade ? "✓ AI Suggestions Loaded" : "Get AI Suggestions"}
                textColour="text-white"
                onClick={fetchAllSuggestions}
                disabled={bulkRequestMade}
              />
              {loadingSuggestions.size > 0 && !stopRequested && (
                <Button
                  colour="bg-orange-600"
                  hoverColour="hover:bg-orange-500"
                  text="Stop Analysis"
                  textColour="text-white"
                  onClick={handleStop}
                />
              )}
              <Button
                colour="bg-green-600"
                hoverColour="hover:bg-green-700"
                text="📄 Generate PDF Report"
                textColour="text-white"
                onClick={generatePDFReport}
              />
            </div>
          </div>
        </div>
        <div className="overflow-auto flex flex-col gap-2 pb-5">
          {sortedViolations.map((violation) => {
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
                  impact={violation.impact}
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
