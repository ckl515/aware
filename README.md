# AWARE - Accessibility Web Analysis and Reporting Engine

AWARE is an AI-powered web extension that enhances accessibility testing by automatically detecting issues using **axe-core** and providing developers with immediate, actionable code fixes—streamlining the entire process.

## Key features
- **Automatic Accessibility Issue Detection:** AWARE identifies a comprehensive range of web accessibility issues according to Web Content Accessibility Guidelines (WCAG) laws.
- **Immediate, Context-Aware Code Fixes:** AWARE gives developers instant, actionable fixes. When it finds a problem, it generates code snippets that they can simply copy and paste. 
- **Machine Learning for Alt-Text Generation:** AWARE will integrate PyTorch's powerful machine learning (ML) model to automatically generate contextually appropriate alternative text (alt-text) for images missing descriptions.
- **PDF Report:** AWARE provides a PDF report summarising the website’s full accessibility audit, including all identified issues and their severity rankings.


## Tech Stack

| Component | Technology | Version | Documentation |
|-----------|------------|---------|---------------|
| **Frontend Framework** | [React](https://react.dev/) | 19.1.1 | [React Docs](https://react.dev/learn) |
| **Build Tool** | [Vite](https://vitejs.dev/) | 7.1.3 | [Vite Guide](https://vitejs.dev/guide/) |
| **UI Styling** | [Tailwind CSS](https://tailwindcss.com/) | 4.1.12 | [Tailwind Docs](https://tailwindcss.com/docs) |
| **Accessibility Engine** | [Axe-Core](https://github.com/dequelabs/axe-core) | 4.10.3 | [Axe API Docs](https://www.deque.com/axe/core-documentation/) |
| **PDF Generation** | [jsPDF](https://github.com/parallax/jsPDF) | 3.0.3 | [jsPDF Documentation](https://raw.githack.com/MrRio/jsPDF/master/docs/) |
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com/) | 0.115.5 | [FastAPI Guide](https://fastapi.tiangolo.com/tutorial/) |
| **ASGI Server** | [Uvicorn](https://www.uvicorn.org/) | 0.32.1 | [Uvicorn Deployment](https://www.uvicorn.org/deployment/) |
| **AI/LLM Integration** | [Google Gemini AI](https://ai.google.dev/) | 0.8.3 | [Gemini API Docs](https://ai.google.dev/docs) |
| **Image Processing** | [Transformers](https://huggingface.co/transformers/) | 4.47.0 | [HuggingFace Docs](https://huggingface.co/docs/transformers) |
| **Computer Vision** | [PyTorch](https://pytorch.org/) | 2.5.1 | [PyTorch Tutorials](https://pytorch.org/tutorials/) |
| **Image Processing** | [Pillow (PIL)](https://pillow.readthedocs.io/) | 11.0.0 | [Pillow Handbook](https://pillow.readthedocs.io/en/stable/handbook/) |
| **WebSocket Communication** | [WebSockets](https://websockets.readthedocs.io/) | Built-in | [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) |
| **VS Code Extension API** | [VS Code API](https://code.visualstudio.com/api) | Latest | [Extension Guide](https://code.visualstudio.com/api/get-started/your-first-extension) |
| **Environment Management** | [Python Dotenv](https://github.com/theskumar/python-dotenv) | 1.0.1 | [Dotenv Documentation](https://saurabh-kumar.com/python-dotenv/) |
| **HTTP Client** | [Requests](https://requests.readthedocs.io/) | 2.32.3 | [Requests Docs](https://requests.readthedocs.io/en/latest/) |


### Architecture Components
- **Browser Extension**: Chrome Extension with React UI
- **Content Scripts**: DOM manipulation and accessibility scanning
- **Backend API**: FastAPI server with AI processing
- **VS Code Integration**: Real-time source code analysis
- **WebSocket Communication**: Bidirectional real-time messaging
- **AI Processing**: Google Gemini for code suggestions and image captioningted Web Accessibility Review Engine (AWARE)


## Deployment
Follow these steps to build, deploy, and run the Chrome extension and its backend server.

**1. Set Up Python Backend**

(Optional but recommended) Create and activate a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate      # macOS/Linux
venv\Scripts\activate.bat     # Windows
```
Install Python dependencies:

```bash
cd backend
pip3 install -r requirements.txt
```
Create a .env file in the root directory and add your Gemini API key:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

Start the backend server:

```bash
# From root directory
npm run dev:backend
# OR directly from backend directory
cd backend && python3 start_server.py
```

**2. Build the Chrome Extension**

Build the extension from the root directory:
```bash
npm run build:frontend
```

This creates the extension files in `frontend/extension/`.

**3. Set Up VSCode Extension (Optional)**

Navigate to the vscode-extension folder:

```bash
cd vscode-extension
npm install
```

Install the VSCode extension:
```bash
code --install-extension accessibility-source-engine-0.1.1.vsix
```

**4. Load the Chrome Extension**

Open Chrome and go to:
```bash
chrome://extensions/
```

Enable Developer mode (toggle in the top-right corner).

Click Load unpacked and select the `frontend/extension/` folder.

The extension should now be active and ready to use.

## Notes

- **Local Development Only**: This project is currently configured for local development and only works on `localhost`. The backend server runs on `http://127.0.0.1:5500` and the VS Code extension connects via `ws://localhost:5500/vscode`. For production deployment, additional configuration would be needed for HTTPS/WSS and CORS settings.
- **Python Version**: This project uses `python3`. If you see "command not found" errors, make sure you have Python 3 installed and use `python3` instead of `python`.
- **Dependencies**: The AI image processing features require PyTorch and Transformers, which may take time to load initially.
- **Browser Extension**: 
  - For extension development: Use `npm run build:frontend` and reload in Chrome
  - Browser extensions don't need a development server - they run as injected scripts
- **Test Mode (Demo)**: This mode is used for demonstration purposes for first-time users. A bad website is displayed as an example, along with the accessibility violations. Select `BadApp.tsx` when prompted in the VSCode file picker after running 'generate AI suggestions'.
- **AI Suggestions**: The generated code suggestions will take a couple of minutes to load.

## Development Tips

### Browser Extension Workflow
1. Edit files in `frontend/src/`
2. Run `npm run build:frontend` 
3. Go to `chrome://extensions/`
4. Click the reload button on your extension
5. Test the changes on any webpage

### Quick Commands Reference
```bash
# Start backend for AI features
npm run dev:backend

# Build extension after making changes  
npm run build:frontend

```

## Contributing

We welcome contributions to AWARE! Please follow these guidelines:

1. **Fork the repository** and create a feature branch
2. **Follow the project structure** - keep frontend, backend, and extensions separate
3. **Test your changes** thoroughly with both browser and VS Code extensions
4. **Update documentation** as needed
5. **Submit a pull request** with a clear description of changes

### Development Setup
- Follow the installation instructions above
- Use the provided test files in `tests/html/` for testing
- Ensure both frontend build and backend server work correctly
- Test the VS Code extension integration if making backend changes

## Acknowledgments

- **[Axe-Core](https://github.com/dequelabs/axe-core)** by Deque Systems - for comprehensive accessibility testing
- **[Google Gemini AI](https://ai.google.dev/)** - for intelligent code suggestions
- **[Transformers](https://huggingface.co/transformers/)** by Hugging Face - for image captioning capabilities
- **Web Content Accessibility Guidelines (WCAG)** - for accessibility standards
- **Chrome Extensions API** - for browser integration
- **VS Code Extension API** - for IDE integration

## Support

- **Issues**: Report bugs and feature requests on [GitHub Issues](https://github.com/ckl515/aware/issues)
- **Documentation**: Check this README and inline code comments

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 Kai Le Chang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

**Made with ❤️ for web accessibility**







