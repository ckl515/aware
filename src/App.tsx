import { useEffect, useState } from "react";
import ResultsPage from "./pages/ResultsPage";
import type { AxeResults } from "axe-core";
import FrontPage from "./pages/FrontPage";

const handleRunAxe = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;

    if (!tabId) return;

    chrome.scripting
      .executeScript({
        target: { tabId },
        files: ["content-script.js"],
      })
      .then(() => {
        chrome.tabs.sendMessage(tabId, { type: "run-axe", tabId }, (response) =>
          console.log("Content script response:", response)
        );
      });
  });
};

function App() {
  const [axeResults, setAxeResults] = useState<AxeResults | null>(null);

  useEffect(() => {
    const listener = (message: any) => {
      if (message.type === "axe-results") {
        setAxeResults(message.results);
      }
    };

    chrome.runtime.onMessage.addListener(listener);

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  });

  return axeResults ? (
    <ResultsPage onRunAxe={handleRunAxe} axeResults={axeResults} />
  ) : (
    <FrontPage onRunAxe={handleRunAxe} />
  );
}

export default App;
