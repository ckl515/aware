import { useEffect, useState } from "react";
import ResultsPage from "./pages/ResultsPage";
import type { AxeResults } from "axe-core";
import FrontPage from "./pages/FrontPage";
import BadAccessibilityComponent from "./components/BadAccessibilityComponent";

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

const handleRunAxeTestMode = (setAxeResults: (results: AxeResults) => void) => {
  // Simulate running axe on the test component
  // In a real scenario, you'd inject axe into the test page
  console.log("Running accessibility test on demo component...");
  
  // Create mock violations that would be found in BadAccessibilityComponent
  const mockResults: AxeResults = {
    url: "chrome-extension://test-mode",
    timestamp: new Date().toISOString(),
    testEngine: {
      name: "axe-core",
      version: "4.10.0"
    },
    testRunner: {
      name: "axe"
    },
    testEnvironment: {
      userAgent: navigator.userAgent,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      orientationAngle: 0,
      orientationType: "landscape-primary"
    },
    toolOptions: {},
    inapplicable: [],
    incomplete: [],
    passes: [],
    violations: [
      {
        id: "page-has-heading-one",
        impact: "moderate",
        tags: ["cat.semantics", "best-practice"],
        description: "Page should contain exactly one heading-one",
        help: "Page should contain exactly one h1",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.10/page-has-heading-one",
        nodes: [
          {
            any: [],
            all: [],
            none: [],
            impact: "moderate",
            html: `
// BadAccessibilityComponent.tsx - Multiple H1 elements:
<h1>Welcome to Our Store</h1>
{selectedTab === 0 && <h1>Home Section</h1>}
{selectedTab === 1 && <h1>Our Products</h1>}
{selectedTab === 2 && <h1>Our Services</h1>}
{selectedTab === 3 && <h1>Contact Us</h1>}
// Should have only ONE h1 per page for proper heading hierarchy`,
            target: ["BadAccessibilityComponent"],
            failureSummary: "Multiple h1 elements found: 'Welcome to Our Store', 'Home Section', 'Our Products', 'Our Services', 'Contact Us'"
          }
        ]
      },
      {
        id: "image-alt",
        impact: "critical",
        tags: ["cat.text-alternatives", "wcag2a", "wcag111"],
        description: "Images must have alternate text",
        help: "Ensure <img> elements have alternate text or a role of none or presentation",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.10/image-alt",
        nodes: [
          {
            any: [],
            all: [],
            none: [],
            impact: "critical",
            html: `
// BadAccessibilityComponent.tsx - Images missing alt attributes:
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
  <img src="https://picsum.photos/300/200?random=10" style={{ width: '100%' }} />
  <img src="https://picsum.photos/300/200?random=11" style={{ width: '100%' }} />
  <img src="https://picsum.photos/300/200?random=12" style={{ width: '100%' }} />
</div>
// Product images in table:
<img src={product.image} style={{ width: '50px', height: '50px', marginRight: '10px' }} />`,
            target: ["BadAccessibilityComponent.tsx"],
            failureSummary: "React component images missing alt attributes in BadAccessibilityComponent.tsx"
          }
        ]
      },
      {
        id: "color-contrast",
        impact: "serious",
        tags: ["cat.color", "wcag2aa", "wcag143"],
        description: "Elements must have sufficient color contrast",
        help: "Ensure the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
        nodes: [
          {
            any: [],
            all: [],
            none: [],
            impact: "serious",
            html: 'const badStyles = { lowContrast: { color: "#cccccc", backgroundColor: "#dddddd" } }',
            target: ["BadAccessibilityComponent.tsx"],
            failureSummary: "Low contrast styles in React component badStyles object"
          }
        ]
      },
      {
        id: "label",
        impact: "critical",
        tags: ["cat.forms", "wcag2a", "wcag412"],
        description: "Form elements must have labels",
        help: "Ensure every form element has a label",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.10/label",
        nodes: [
          {
            any: [],
            all: [],
            none: [],
            impact: "critical",
            html: `
// BadAccessibilityComponent.tsx - Form inputs missing labels:
<form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
  <input type="text" placeholder="Full Name" onChange={handleInputChange} />
  <input type="email" placeholder="Email Address" onChange={handleInputChange} />
  <input type="tel" placeholder="Phone Number" onChange={handleInputChange} />
  <textarea placeholder="Message" rows={4} onChange={handleInputChange}></textarea>
  <button type="submit">Submit</button>
</form>`,
            target: ["BadAccessibilityComponent.tsx"],
            failureSummary: "React form inputs missing proper labels in contact form"
          }
        ]
      },
      {
        id: "button-name",
        impact: "critical",
        tags: ["cat.name-role-value", "wcag2a", "wcag412"],
        description: "Buttons must have discernible text",
        help: "Ensure buttons have discernible text",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.10/button-name",
        nodes: [
          {
            any: [],
            all: [],
            none: [],
            impact: "critical",
            html: `
// BadAccessibilityComponent.tsx - Button with only emoji, missing accessible text:
<div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
  <button onClick={() => setIsModalOpen(true)}>🛒</button>
  <button onClick={() => setLiked(!liked)}>❤️</button>
  <button onClick={() => setShowMenu(!showMenu)}>⚙️</button>
  <button onClick={() => navigate('/settings')}>👤</button>
</div>`,
            target: ["BadAccessibilityComponent.tsx"],
            failureSummary: "React button with emoji only, missing accessible text or aria-label"
          }
        ]
      },
      {
        id: "region",
        impact: "moderate",
        tags: ["cat.keyboard", "best-practice"],
        description: "All page content should be contained by landmarks",
        help: "Ensure all page content is contained by landmarks",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.10/region",
        nodes: [
          {
            any: [],
            all: [],
            none: [],
            impact: "moderate",
            html: `
// BadAccessibilityComponent.tsx - Content not in semantic landmarks:
return (
  <div className="bad-accessibility-component">
    <div className="header-content">
      <h2>Welcome to Our Site</h2>
      <div className="navigation">
        <a href="#home">Home</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
      </div>
    </div>
    <div className="main-content">
      <div className="product-grid">
        {products.map(product => (
          <div key={product.id} className="product-card">
            <img src={product.image} />
            <h3>{product.name}</h3>
            <p>{product.price}</p>
          </div>
        ))}
      </div>
    </div>
    <div className="footer-content">
      <p>&copy; 2024 Our Company</p>
    </div>
  </div>
);`,
            target: ["BadAccessibilityComponent.tsx"],
            failureSummary: "React component content not wrapped in semantic landmarks (main, nav, aside, etc.)"
          }
        ]
      }
    ]
  };

  // Simulate the async behavior and set results
  setTimeout(() => {
    setAxeResults(mockResults);
  }, 500);
};

function App() {
  const [axeResults, setAxeResults] = useState<AxeResults | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [welcomeMode, setWelcomeMode] = useState(true);

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

  // If we have results, show them regardless of test mode
  if (axeResults) {
    return (
      <ResultsPage 
        onRunAxe={testMode ? () => handleRunAxeTestMode(setAxeResults) : handleRunAxe} 
        axeResults={axeResults}
        onBack={() => setAxeResults(null)}
        onStop={() => {
          setAxeResults(null);
          setTestMode(false);
        }}
        isTestMode={testMode}
      />
    );
  }

  // Test mode for accessibility violations
  if (testMode) {
    return (
      <div>
        <div style={{ padding: '10px', background: '#f0f0f0', borderBottom: '1px solid #ccc', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setTestMode(false)}
            style={{ padding: '8px 16px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Exit Test Mode
          </button>
          <button 
            onClick={() => handleRunAxeTestMode(setAxeResults)}
            style={{ padding: '8px 16px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Run Accessibility Test
          </button>
          <div>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>Accessibility Test Page</h2>
            <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>This page contains intentional accessibility violations for testing</p>
          </div>
        </div>
        <BadAccessibilityComponent />
      </div>
    );
  }

  // Welcome mode to show instructions
  if (welcomeMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-6 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Aware</h1>
            <div className="w-16 h-1 bg-blue-500 mx-auto rounded"></div>
          </div>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">1</div>
              <div>
                <h3 className="font-semibold text-gray-800">Run Test</h3>
                <p className="text-sm text-gray-600">Analyze the current webpage for accessibility issues and violations.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">2</div>
              <div>
                <h3 className="font-semibold text-gray-800">Test Mode</h3>
                <p className="text-sm text-gray-600">Practice with a demo page that contains common accessibility violations.</p>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">💡 Pro Tip</h4>
              <p className="text-sm text-blue-700">Click on any violation card to highlight the problematic element on the page!</p>
            </div>
          </div>
          
          <button 
            onClick={() => setWelcomeMode(false)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            Get Started
          </button>
        </div>
      </div>
    );
  }

  return (
    <FrontPage 
      onRunAxe={handleRunAxe} 
      onTestMode={() => setTestMode(true)} 
      onWelcome={() => setWelcomeMode(true)}
    />
  );
}

export default App;
