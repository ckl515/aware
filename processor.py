from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
import asyncio
import json
import logging
import re
from google import genai
from google.genai import types
import os
from datetime import datetime
import uuid
from models import *
from settings import GEMINI_CONFIG, MODEL
from dotenv import load_dotenv
from imageCaptioning import generate_caption, extract_image_src_from_html

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Accessibility Engine Backend")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # in production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client(
    api_key=os.environ.get("GEMINI_API_KEY"),
)

# In-memory storage for sessions (use Redis/etc. in production)
active_sessions: Dict[str, Dict[str, Any]] = {}
vscode_connections: Dict[str, WebSocket] = {}
# Flag to disable source code requests for testing
DISABLE_VSCODE_REQUESTS = False

@app.post("/suggest-fixes")
async def suggest_fixes(request: AnalysisRequest):
    """
    Endpoint called by browser extension to get AI suggestions for violations
    """
    try:
        session_id = str(uuid.uuid4())
        # Store session data
        active_sessions[session_id] = {
            "violations": request.violations,
            "url": request.url,
            "timestamp": datetime.now(),
            "source_code": None,
            "suggestions": None
        }
        
        logger.info(f"Created session {session_id} with {len(request.violations)} violations")
        
        # Debug: Log violation IDs
        violation_ids = [v.id for v in request.violations]
        logger.info(f"Violation IDs received: {violation_ids}")
        
        # Check for image-alt violations specifically
        image_alt_violations = [v for v in request.violations if v.id == "image-alt"]
        logger.info(f"Image-alt violations found: {len(image_alt_violations)}")
        
        # Always request fresh source code from VS Code for every request
        # This ensures developer must choose a file every time
        source_code = None
        logger.info(f"Starting source code request process. VS Code connections: {len(vscode_connections)}, DISABLE_VSCODE_REQUESTS: {DISABLE_VSCODE_REQUESTS}")
        
        if vscode_connections and not DISABLE_VSCODE_REQUESTS:
            logger.info("🎯 ENTERING VS Code request flow - will wait for file selection")
            source_request = {
                "type": "request_source",
                "sessionId": session_id,
                "violations": [v.dict() for v in request.violations],
                "url": request.url
            }
            
            # Send to all connected VSCode instances
            dead_connections = []
            for connection_id, ws in vscode_connections.items():
                try:
                    await ws.send_text(json.dumps(source_request))
                    logger.info(f"✅ Sent source code request to VS Code connection {connection_id}")
                except Exception as e:
                    logger.error(f"❌ Failed to send to connection {connection_id}: {e}")
                    dead_connections.append(connection_id)
            
            # Remove dead connections
            for connection_id in dead_connections:
                del vscode_connections[connection_id]
            
            if vscode_connections:  # Only wait if we have active connections
                logger.info(f"⏳ Waiting for source code from VS Code... ({len(vscode_connections)} active connections)")
                for i in range(30):  # 30 second timeout
                    await asyncio.sleep(1)
                    current_source = active_sessions[session_id]["source_code"]
                    has_valid_source = current_source is not None and current_source.get('content') is not None
                    
                    # Debug logging
                    if current_source is not None:
                        file_path = current_source.get('filePath')
                        content_length = len(current_source.get('content') or '')
                        logger.info(f"⏱️  Wait iteration {i+1}/30 - Source exists: True, FilePath: {file_path}, ContentLength: {content_length}, Valid: {has_valid_source}")
                    else:
                        logger.info(f"⏱️  Wait iteration {i+1}/30 - Source exists: False, Valid: {has_valid_source}")
                    
                    if has_valid_source:
                        source_code = current_source
                        logger.info(f"✅ Received VALID source code after {i+1} seconds: {source_code.get('filePath', 'Unknown file')}")
                        break
                
                if source_code is None:
                    # Check if user cancelled or no file was selected
                    current_source = active_sessions[session_id]["source_code"]
                    if current_source is not None and current_source.get('content') is None:
                        logger.warning("👤 User cancelled file selection or no file was selected")
                        raise HTTPException(status_code=400, detail="File selection cancelled. Please select a source file to get context-aware suggestions.")
                    else:
                        logger.warning("⏰ Timeout waiting for source code from VS Code after 30 seconds")
                        raise HTTPException(status_code=408, detail="Timeout waiting for source code selection. Please ensure VS Code extension is active and you select a file.")
            else:
                logger.warning("❌ No active VS Code connections after sending requests")
                raise HTTPException(status_code=503, detail="No VS Code connection available. Please ensure VS Code extension is installed and active.")
        else:
            if DISABLE_VSCODE_REQUESTS:
                logger.info("🚫 VS Code requests disabled, proceeding without source code")
            else:
                logger.warning("❌ No VS Code connections available")
                raise HTTPException(status_code=503, detail="No VS Code connection available. Please ensure VS Code extension is installed and active.")
        
        # Debug what we're passing to generate_suggestions
        if source_code is None:
            logger.error("🚨 CRITICAL: No source code available - cannot generate context-aware suggestions")
            raise HTTPException(status_code=400, detail="No source code available. Please select a file in VS Code to get context-aware suggestions.")
        
        file_path = source_code.get('filePath', 'No path')
        content = source_code.get('content', '')
        content_length = len(content or '')
        
        if not content:
            logger.error("🚨 CRITICAL: Source code content is empty - cannot generate context-aware suggestions")
            raise HTTPException(status_code=400, detail="Source code content is empty. Please select a valid file with content in VS Code.")
            
        logger.info(f"✅ About to generate context-aware suggestions with source_code: {file_path} ({content_length} chars)")
        
        suggestions = await generate_suggestions(
            request.violations,
            source_code
        )
        
        active_sessions[session_id]["suggestions"] = suggestions
        return {"suggestions": suggestions, "sessionId": session_id}
        
    except Exception as e:
        logger.error(f"Error in suggest_fixes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/source-code")
async def receive_source_code(response: SourceCodeResponse):
    """
    Endpoint for VSCode extension to send source code
    """
    try:
        session_id = response.sessionId
        if session_id in active_sessions:
            active_sessions[session_id]["source_code"] = {
                "filePath": response.filePath,
                "content": response.content
            }
            logger.info(f"Received source code for session {session_id}")
            return {"status": "received"}
        else:
            raise HTTPException(status_code=404, detail="Session not found")
    except Exception as e:
        logger.error(f"Error receiving source code: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/vscode")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for VSCode extension connection
    """
    await websocket.accept()
    connection_id = str(uuid.uuid4())
    vscode_connections[connection_id] = websocket
    logger.info(f"VSCode extension connected: {connection_id}")
    
    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"Received WebSocket message: {data}")
            
            try:
                message = json.loads(data)
                
                if message.get("type") == "source_response":
                    session_id = message.get("sessionId")
                    logger.info(f"📨 Received source_response for session {session_id}")
                    if session_id in active_sessions:
                        file_path = message.get("filePath")
                        content = message.get("content")
                        
                        if file_path is None and content is None:
                            logger.info(f"� User cancelled file selection for session {session_id}")
                        else:
                            logger.info(f"�📄 Source code details - File: {file_path}, Content length: {len(content) if content else 0}")
                        
                        # Store in session
                        active_sessions[session_id]["source_code"] = {
                            "filePath": file_path,
                            "content": content
                        }
                        
                        if file_path is not None and content is not None:
                            logger.info(f"✅ Stored source code for session {session_id}: {file_path}")
                        else:
                            logger.info(f"❌ No source code for session {session_id} (user cancelled or no file selected)")
                    else:
                        logger.warning(f"❌ Session {session_id} not found in active_sessions")
                elif message.get("type") == "ping":
                    # Respond to ping messages
                    await websocket.send_text(json.dumps({"type": "pong"}))
                    
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received: {data}")
                
    except WebSocketDisconnect:
        logger.info(f"VSCode extension disconnected normally: {connection_id}")
    except Exception as e:
        logger.error(f"WebSocket error for connection {connection_id}: {str(e)}")
    finally:
        # Clean up connection
        if connection_id in vscode_connections:
            del vscode_connections[connection_id]
        logger.info(f"VSCode extension connection cleaned up: {connection_id}")

async def generate_suggestions(violations, source_code = None):
    """
    Generate AI suggestions using Gemini API (single call for all violations)
    Special handling for image-alt violations using image captioning model
    """
    try:
        logger.info(f"Processing {len(violations)} violations in generate_suggestions")
        
        suggestions = []
        regular_violations = []
        
        # Process each violation
        for violation in violations:
            logger.info(f"Processing violation: {violation.id}")
            
            if violation.id == "image-alt":
                logger.info(f"Found image-alt violation with {len(violation.nodes)} nodes")
                for node in violation.nodes:
                    try:
                        img_src = extract_image_src_from_html(node.html)
                        
                        if img_src:
                            base_url = None
                            if source_code and source_code.get("url"):
                                base_url = source_code.get("url")
                            
                            caption = generate_caption(img_src, base_url)
                            
                            tech_context = get_tech_context(source_code)
                            
                            if "react" in tech_context.lower() or "jsx" in tech_context.lower():
                                code_snippet = f'<img src="{img_src}" alt="{caption}" />'
                            else:
                                code_snippet = f'<img src="{img_src}" alt="{caption}">'
                            
                            suggestions.append({
                                "violationId": violation.id,
                                "fixDescription": f"Add descriptive alt text to image: '{caption}'",
                                "codeSnippet": code_snippet
                            })
                        else:
                            suggestions.append({
                                "violationId": violation.id,
                                "fixDescription": "Add descriptive alt text to image",
                                "codeSnippet": '<img src="..." alt="Describe the image content here">'
                            })
                    except Exception as e:
                        logger.error(f"Error processing image-alt violation: {e}")
                        suggestions.append({
                            "violationId": violation.id,
                            "fixDescription": "Add descriptive alt text to image",
                            "codeSnippet": '<img src="..." alt="Describe the image content here">'
                        })
            else:
                regular_violations.append(violation)
        
        if regular_violations:
            regular_suggestions = await generate_regular_suggestions(regular_violations, source_code)
            if isinstance(regular_suggestions, dict) and "suggestions" in regular_suggestions:
                suggestions.extend(regular_suggestions["suggestions"])
            
        return {"suggestions": suggestions}
        
    except Exception as e:
        logger.error(f"Error in generate_suggestions: {e}")
        return {"error": f"An error occurred: {e}"}

def get_tech_context(source_code):
    """Determine the technology context from source code"""
    if source_code and source_code.get("content"):
        content = source_code.get('content', '').lower()
        if 'jsx' in content or 'react' in content or 'usestate' in content or 'useeffect' in content:
            return "Return React/JSX code snippets."
        elif 'vue' in content or '@click' in content or 'v-if' in content:
            return "Return Vue.js code snippets."
        elif 'angular' in content or 'component' in content and 'typescript' in source_code.get('filePath', ''):
            return "Return Angular TypeScript code snippets."
        else:
            return "Return vanilla HTML code snippets."
    else:
        return "Return vanilla HTML code snippets."

def format_code_snippet(code: str) -> str:
    """
    Format HTML/code snippets with proper indentation and line breaks
    """
    import re
    
    # Remove extra whitespace
    code = code.strip()
    
    # Basic HTML formatting - add line breaks after opening tags
    # This is a simple formatter, not a full HTML parser
    formatted = code
    
    # Add line breaks after opening tags
    formatted = re.sub(r'>([^<\s])', r'>\n\1', formatted)
    
    # Add proper indentation
    lines = formatted.split('\n')
    indented_lines = []
    indent_level = 0
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Decrease indent for closing tags
        if line.startswith('</'):
            indent_level = max(0, indent_level - 1)
        
        # Add indentation
        indented_lines.append('    ' * indent_level + line)
        
        # Increase indent for opening tags (but not self-closing ones)
        if (line.startswith('<') and not line.startswith('</') and 
            not line.endswith('/>') and not line.endswith('/>')):
            # Check if it's not a self-closing tag
            tag_match = re.match(r'<(\w+)', line)
            if tag_match:
                tag_name = tag_match.group(1)
                # If this line doesn't contain the closing tag, increase indent
                if f'</{tag_name}>' not in line:
                    indent_level += 1
    
    return '\n'.join(indented_lines)

async def generate_regular_suggestions(violations, source_code = None):
    """
    Generate AI suggestions for non-image-alt violations using Gemini API
    """
    try:
        context = "You are an accessibility expert who will provide suggestions to developers to improve a website's accessibility.\n\n"
        
        if source_code and source_code.get("content"):
            # Using .get() is safer than ['key'] as it returns None if the key doesn't exist
            file_path = source_code.get('filePath', 'Unknown file') 
            content = source_code.get('content', '')
            context += f"SOURCE CODE CONTEXT:\nFile: {file_path}\n```\n{content[:2000]}...\n```\n\n"
        
        context += "ACCESSIBILITY VIOLATIONS:\n"
        
        violations_text = ""
        element_count = 0
        
        for violation in violations:
            violations_text += f"""
=====================================
VIOLATION: {violation.id}
Description: {violation.description}
Impact: {violation.impact}
Help: {violation.help}

ELEMENTS TO FIX:
"""
            for i, node in enumerate(violation.nodes, 1):
                element_count += 1
                violations_text += f"""
[ELEMENT #{element_count}] - CREATE SPECIFIC FIX FOR THIS ELEMENT:
- Selector: {node.target}
- Current HTML: {node.html}
⬆️ Fix Element #{element_count} using its exact content above ⬆️
{'-'*50}
"""
        
        tech_context = get_tech_context(source_code)
        
        # Determine if this is React code and adjust instructions accordingly
        is_react = source_code and ("react" in str(source_code).lower() or "jsx" in str(source_code).lower() or ".tsx" in str(source_code.get('filePath', '')))

        if is_react:
            code_instructions = """
REACT/JSX SPECIFIC INSTRUCTIONS:
- Use JSX syntax with camelCase props (onClick, className, etc.)
- Use style objects: style={{{{ backgroundColor: '#fff', color: '#000' }}}}
- For images: <img src="..." alt="..." />
- For buttons: <button onClick={{handleClick}} aria-label="descriptive text">
- For forms: <label htmlFor="input-id">Label</label><input id="input-id" />
- Use semantic JSX: <main>, <nav>, <header>, <section>, <aside>
- Include React event handlers and state references where appropriate
- Use proper JSX self-closing tags
"""
        else:
            code_instructions = """
HTML SPECIFIC INSTRUCTIONS:
- Use standard HTML syntax
- Use hyphenated attributes (onclick, class, etc.)
- Use inline styles: style="background-color: #fff; color: #000;"
- Standard HTML tags and attributes
"""

        prompt = context + violations_text + f"""
TASK: Analyze the provided source code and violations to generate specific, contextual fixes.

{code_instructions}

CRITICAL REQUIREMENTS:
1. ANALYZE the actual source code provided above AND the specific HTML elements in violations
2. MODIFY the EXACT HTML code shown in the violation nodes, don't create new generic code
3. PRESERVE existing variable names, class names, IDs, attributes, text content, and structure
4. TAKE the actual HTML from violation nodes and APPLY fixes directly to that HTML
5. PROVIDE the MODIFIED version of the existing HTML, not new code
6. PRESERVE ALL TEXT CONTENT - do not change button text, headings, or any visible text

VIOLATION-SPECIFIC CODE MODIFICATION:
- Find the EXACT HTML element from the violation node (look at the "HTML:" field)
- Apply the accessibility fix to THAT specific element
- Keep all existing attributes, classes, styles, and TEXT CONTENT unless they conflict with the fix
- Return the SAME element with SAME text content but with the accessibility issue resolved
- If fixing a button that says "About", keep it saying "About" - don't change it to "Home"

EXAMPLE PROCESS:
If violation node shows: <div style="color: #ccc;">Low contrast text</div>
Then return: <div style="color: #333333;">Low contrast text</div>

If violation node shows: <img src="photo.jpg" class="gallery-image">
Then return: <img src="photo.jpg" class="gallery-image" alt="Description based on image content">

If violation node shows: <button class="nav-button">About</button>
Then return: <button class="nav-button" style="color: #000000;">About</button>

If violation node shows: <button onClick={{handleClick}}>🛒</button>
Then return: <button onClick={{handleClick}} aria-label="Add to cart">🛒</button>

RESPONSE FORMAT - Return ONLY valid JSON with this EXACT structure:
{{
  "suggestions": [
    {{
      "violationId": "violation-type",
      "fixDescription": "Brief explanation of what needs to be fixed",
      "codeSnippet": "Complete HTML/code that fixes the issue"
    }}
  ]
}}

IMPORTANT: Create ONE suggestion for EACH element shown in the violations above.
If there are 3 button elements with the same violation, create 3 separate suggestions.
Each suggestion should fix the exact HTML element provided, preserving its unique content.

SPECIFIC FIX GUIDELINES:
- color-contrast violations: Take existing style attributes and modify color values to meet contrast requirements
- region violations: Wrap the EXACT HTML content shown in violation with semantic landmarks
- document-title violations: Add title to existing document structure
- html-has-lang violations: Add lang attribute to the existing <html> tag shown
- page-has-heading-one violations: Modify existing heading structure or convert existing element to h1
- landmark-one-main violations: Wrap existing HTML structure with <main> element
- label violations: Add labels to the EXACT form elements shown in violations
- button-name violations: Add aria-label or text content to the EXACT button shown
- image-alt violations: Add alt attribute to the EXACT img element shown

CONTEXT-AWARE CODE MODIFICATION:
- Take the HTML from violation.nodes[].html and modify that EXACT code
- Preserve all existing attributes, classes, IDs unless they conflict with the fix
- Match the syntax style (HTML vs JSX) used in the violation node
- Keep existing event handlers, styles, and structure intact
- Only add or modify what's needed to fix the accessibility issue

CRITICAL RULES:
1. fixDescription: ONE sentence explaining the fix (no code examples in description)
2. codeSnippet: ONLY the actual HTML/code needed, using REAL context from source code
3. NO generic placeholders - use actual content, class names, IDs from source
4. NO markdown formatting in JSON strings
5. Return ONLY valid JSON, no other text
6. Every suggestion MUST have both fixDescription AND codeSnippet

CODE FORMATTING REQUIREMENTS:
- Format code with proper indentation (2 or 4 spaces)
- Use line breaks for nested elements
- Keep attributes readable (one per line for complex elements)
- Maintain consistent formatting style
- Ensure code is copy-paste ready for developers

EXAMPLE FORMATTING:
Instead of: <section><p>Text</p><img src="url"><div class="container"><span>Content</span></div></section>
Use this format:
<section>
    <p>Text</p>
    <img src="url" 
         alt="Descriptive text">
    <div class="container">
        <span>Content</span>
    </div>
</section>
"""
        
        contents = [
            types.Content(
                role="user",
                parts=[types.Part(text=prompt)]
            )
        ]
        
        response = client.models.generate_content(
            model=MODEL,
            contents=contents,
            config=GEMINI_CONFIG,
        )
        
        logger.info(f"Raw AI response: {response.text}")
        
        try:
            # Try to parse as JSON first
            ai_response = json.loads(response.text.strip())
            
            # Validate the response structure
            if "suggestions" in ai_response and isinstance(ai_response["suggestions"], list):
                valid_suggestions = []
                for suggestion in ai_response["suggestions"]:
                    # Check if suggestion has the required fields
                    if ("violationId" in suggestion and 
                        "fixDescription" in suggestion and 
                        "codeSnippet" in suggestion):
                        formatted_code = format_code_snippet(suggestion["codeSnippet"])
                        valid_suggestions.append({
                            "violationId": suggestion["violationId"],
                            "fixDescription": suggestion["fixDescription"].strip(),
                            "codeSnippet": formatted_code
                        })
                    else:
                        logger.warning(f"Invalid suggestion format: {suggestion}")
                
                if valid_suggestions:
                    return {"suggestions": valid_suggestions}
                else:
                    logger.error("No valid suggestions found in AI response")
            
            # If we reach here, the format was incorrect
            logger.error(f"Invalid AI response format: {ai_response}")
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            logger.error(f"Raw response: {response.text}")
        
        # Fallback: create basic suggestions for each violation
        fallback_suggestions = []
        for violation in violations:
            fallback_suggestions.append({
                "violationId": violation.id,
                "fixDescription": f"Fix the {violation.id} accessibility issue: {violation.help}",
                "codeSnippet": get_fallback_code(violation.id)
            })
        
        return {"suggestions": fallback_suggestions}

    except Exception as e:
        logger.error(f"Error generating suggestions: {str(e)}")
        # Return basic fallback suggestions
        fallback_suggestions = []
        for violation in violations:
            fallback_suggestions.append({
                "violationId": violation.id,
                "fixDescription": f"Fix the {violation.id} accessibility issue",
                "codeSnippet": get_fallback_code(violation.id)
            })
        return {"suggestions": fallback_suggestions}

def get_fallback_code(violation_id):
    """Generate fallback code snippets for violations"""
    fallbacks = {
        "region": "<main>\n  <h1>Your Page Title</h1>\n  <!-- Your main content here -->\n</main>",
        "landmark-one-main": "<main>\n  <!-- Your main content here -->\n</main>",
        "document-title": "<title>Your Page Title</title>",
        "html-has-lang": '<html lang="en">',
        "page-has-heading-one": "<h1>Your Main Heading</h1>",
        "image-alt": '<img src="image.jpg" alt="Descriptive text for the image">',
    }
    return fallbacks.get(violation_id, f'<!-- Fix for {violation_id} -->')

def extract_code_from_text(text, violation):
    """Extract code snippet from AI response text"""
    import re
    
    # Look for code examples in the text with more specific patterns
    code_patterns = [
        r'For example:\s*([^.]*?</[^>]*>)',                    # "For example: <code>"
        r'example:\s*([^.]*?</[^>]*>)',                        # "example: <code>"
        r'Example fix:\s*([^.]*?</[^>]*>)',                    # "Example fix: <code>"
        r'```html\s*(.*?)\s*```',                              # Code blocks
        r'```\s*(.*?)\s*```',                                  # Generic code blocks
        r'(<main>.*?</main>)',                                 # Main tags specifically
        r'(<[^>]+>.*?</[^>]*>)',                              # Any complete HTML element
        r'(<[^>]+\s*/?>)',                                     # Self-closing tags
        r'(<title>.*?</title>)',                               # Title tags
        r'(<html[^>]*>)',                                      # HTML opening tags
    ]
    
    for pattern in code_patterns:
        matches = re.findall(pattern, text, re.DOTALL | re.IGNORECASE)
        if matches:
            code = matches[0].strip()
            # Clean up the code snippet
            code = re.sub(r'^(For example:|example:|Example fix:)\s*', '', code, flags=re.IGNORECASE)
            return code
    
    # Look for any HTML-like content that appears to be code
    html_patterns = [
        r'<main[^>]*>.*?</main>',
        r'<[a-zA-Z][^>]*>.*?</[a-zA-Z][^>]*>',  # Complete tags
        r'<[a-zA-Z][^>]*\s*/?>',                 # Self-closing tags
    ]
    
    for pattern in html_patterns:
        matches = re.findall(pattern, text, re.DOTALL | re.IGNORECASE)
        if matches:
            return matches[0]
    
    # Fallback: generate specific code based on violation type
    if violation.id == "region":
        return "<main>\n  <h1>Your Page Title</h1>\n  <!-- Your main content here -->\n</main>"
    elif violation.id == "document-title":
        return "<title>Your Page Title</title>"
    elif violation.id == "html-has-lang":
        return '<html lang="en">'
    elif violation.id == "landmark-one-main":
        return "<main>\n  <!-- Your main content here -->\n</main>"
    else:
        return f'<!-- Code fix for {violation.id} -->'

@app.get("/test-vscode-connection")
async def test_vscode_connection():
    """Test endpoint to trigger VS Code file picker"""
    if not vscode_connections:
        return {"error": "No VS Code extensions connected", "connected": False}
    
    # Create a test session and send a source request
    session_id = str(uuid.uuid4())
    active_sessions[session_id] = {
        "violations": [],
        "url": "http://test-page.com",
        "timestamp": datetime.now(),
        "source_code": None
    }
    
    # Create a test violation to trigger file picker
    test_violation = {
        "id": "region",
        "impact": "moderate", 
        "description": "Test violation to trigger file picker",
        "help": "This is a test",
        "helpUrl": "https://test.com",
        "nodes": [{"html": "<div>test</div>", "target": ["div"]}]
    }
    
    source_request = {
        "type": "request_source",
        "sessionId": session_id,
        "violations": [test_violation],
        "url": "http://test-page.com"
    }
    
    # Send to all connected VSCode instances
    sent_count = 0
    dead_connections = []
    for connection_id, ws in vscode_connections.items():
        try:
            await ws.send_text(json.dumps(source_request))
            sent_count += 1
            logger.info(f"Sent test source request to VS Code connection {connection_id}")
        except Exception as e:
            logger.error(f"Failed to send to connection {connection_id}: {e}")
            dead_connections.append(connection_id)
    
    # Remove dead connections
    for connection_id in dead_connections:
        del vscode_connections[connection_id]
    
    return {
        "message": "Test source request sent to VS Code",
        "connected": True,
        "connections_sent": sent_count,
        "session_id": session_id,
        "instructions": "Check VS Code for file picker dialog"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "active_sessions": len(active_sessions),
        "vscode_connections": len(vscode_connections),
        "vscode_requests_disabled": DISABLE_VSCODE_REQUESTS
    }

@app.post("/toggle-vscode-requests")
async def toggle_vscode_requests():
    """Toggle VS Code source code requests on/off to prevent repeated file picker dialogs"""
    global DISABLE_VSCODE_REQUESTS
    DISABLE_VSCODE_REQUESTS = not DISABLE_VSCODE_REQUESTS
    status = "disabled" if DISABLE_VSCODE_REQUESTS else "enabled"
    return {"message": f"VS Code source code requests {status}", "disabled": DISABLE_VSCODE_REQUESTS}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=5500,
        ws_max_size=16777216,  # 16MB max message size
        ws_ping_interval=20,   # Send ping every 20 seconds
        ws_ping_timeout=10     # Wait 10 seconds for pong
    )
