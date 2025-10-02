from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
import asyncio
import json
import logging
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
        
        if vscode_connections:
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
                except Exception as e:
                    logger.error(f"Failed to send to connection {connection_id}: {e}")
                    dead_connections.append(connection_id)
            
            # Remove dead connections
            for connection_id in dead_connections:
                del vscode_connections[connection_id]
            
            # Wait for source code response
            for _ in range(30):  # 30 second timeout
                await asyncio.sleep(1)
                if active_sessions[session_id]["source_code"] is not None:
                    break
        
        suggestions = await generate_suggestions(
            request.violations,
            active_sessions[session_id].get("source_code")
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
    # Accept connection without additional validation
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
                    if session_id in active_sessions:
                        active_sessions[session_id]["source_code"] = {
                            "filePath": message.get("filePath"),
                            "content": message.get("content")
                        }
                        logger.info(f"Received source code via WebSocket for session {session_id}")
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
                # Handle image alt text violations with image captioning
                for node in violation.nodes:
                    try:
                        # Extract image src from the HTML
                        img_src = extract_image_src_from_html(node.html)
                        
                        if img_src:
                            # Get the base URL from source code or use a default
                            base_url = None
                            if source_code and source_code.get("url"):
                                base_url = source_code.get("url")
                            
                            # Generate caption for the image
                            caption = generate_caption(img_src, base_url)
                            
                            # Determine technology context for code snippet
                            tech_context = get_tech_context(source_code)
                            
                            # Generate appropriate code snippet
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
                            # Fallback if we can't extract image src
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
        for violation in violations:
            violations_text += f"""
Violation ID: {violation.id}
Description: {violation.description}
Impact: {violation.impact}
Help: {violation.help}
Affected Elements:
"""
            for node in violation.nodes:
                violations_text += f"- Target: {node.target}\n- HTML: {node.html}\n\n"
        
        tech_context = get_tech_context(source_code)

        prompt = context + violations_text + f"""
For each violation above, provide ONLY:
1. A concise fix description (1-2 sentences max)
2. The exact code snippet that fixes the issue in the appropriate technology format

{tech_context}

IMPORTANT: 
- Return ONLY the minimal code needed to fix each violation
- Do NOT include explanations, best practices, or additional context
- Match the technology/framework detected in the source code
- If no source code context, use vanilla HTML
- Keep responses concise and focused on the fix

Return as JSON with this exact structure:
{{
  "suggestions": [
    {{
      "violationId": "string",
      "fixDescription": "brief description",
      "codeSnippet": "exact code to implement"
    }}
  ]
}}
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
        
        return json.loads(response.text.strip())
        
    except Exception as e:
        logger.error(f"Gemini call failed: {e}")
        if 'response' in locals() and hasattr(response, 'text'):
            logger.error(f"Failed response text: {response.text}")
        return {"suggestions": []}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "active_sessions": len(active_sessions),
        "vscode_connections": len(vscode_connections)
    }

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