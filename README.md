# Automated Web Accessibility Review Engine (AWARE)

AWARE is a web extension that enhances accessibility testing by automatically detecting issues using **axe-core** and providing developers with immediate, actionable code fixes—streamlining the entire process.

## Key features
- **Automatic Accessibility Issue Detection:** AWARE identifies a comprehensive range of web accessibility issues according to Web Content Accessibility Guidelines (WCAG) laws.
- **Immediate, Context-Aware Code Fixes:** AWARE gives developers instant, actionable fixes. When it finds a problem, it generates code snippets that they can simply copy and paste. 
- **Machine Learning for Alt-Text Generation:** AWARE will integrate PyTorch’s powerful machine learning (ML) model to automatically generate contextually appropriate alternative text (alt-text) for images missing descriptions. 

## Deployment
Follow these steps to build, deploy, and run the Chrome extension and its backend server.

**1. Set Up Python Backend**

(Optional but recommended) Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate      # macOS/Linux
venv\Scripts\activate.bat     # Windows
```
Install Python dependencies:

```bash
pip install -r requirements.txt
```
Create a .env file in the root directory and add your Gemini API key:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

Start the backend server:

```bash
python processor.py
```

**2. Build the Chrome Extension**

Install Node.js dependencies in the main project folder:
```bash
npm install
```
Build the extension:

```bash
npm run build
```
**3. Set Up VSCode Extension (Optional)**

Navigate to the vscode-extension folder:

```bash
cd vscode-extension
```

Install dependencies:
```bash
npm install
```

Install the VSCode extension:
```bash
code --install-extension
```

**4. Load the Chrome Extension**

Open Chrome and go to:
```bash
chrome://extensions/
```

Enable Developer mode (toggle in the top-right corner).

Click Load unpacked and select the extension folder in the project directory.

The extension should now be active and ready to use.






