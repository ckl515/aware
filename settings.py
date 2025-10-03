from google.genai import types

# --- GOOGLE GEMINI CONFIG ---
MODEL = "gemini-2.5-flash"
GEMINI_CONFIG = types.GenerateContentConfig(
    temperature=0.2,
    top_p=0.1,
    max_output_tokens=65535,
    response_mime_type="application/json",
    response_schema={
  "type": "OBJECT",
  "properties": {
    "suggestions": {
      "type": "ARRAY",
      "description": "A list of AI-generated suggestions for fixing accessibility violations.",
      "items": {
        "type": "OBJECT",
        "description": "A single AI-generated suggestion for a violation.",
        "properties": {
          "violationId": { "type": "STRING", "description": "The ID of the accessibility violation." },
          "fixDescription": { "type": "STRING", "description": "A brief explanation of what needs to be fixed (no code examples)." },
          "codeSnippet": { "type": "STRING", "description": "The exact HTML/code that fixes the issue (no explanatory text)." }
        },
        "required": ["violationId", "fixDescription", "codeSnippet"]
      }
    }
  },
  "required": ["suggestions"]
}
)