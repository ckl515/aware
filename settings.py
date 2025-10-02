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
          "description": { "type": "STRING", "description": "The human-readable description of the violation." },
          "impact": { "type": "STRING", "description": "The severity or impact level of the violation." },
          "nodes": {
            "type": "ARRAY",
            "description": "The affected nodes in the DOM for this violation.",
            "items": {
              "type": "OBJECT",
              "properties": {
                "target": { "type": "ARRAY", "items": { "type": "STRING" }, "description": "The CSS selector(s) identifying the affected element(s)." },
                "html": { "type": "STRING", "description": "The raw HTML snippet of the affected element." }
              },
              "required": ["target", "html"]
            }
          },
          "aiSuggestion": { "type": "STRING", "description": "The AI-generated suggestion, including actionable fixes and code changes if applicable." },
          "hasSourceCode": { "type": "BOOLEAN", "description": "Indicates whether source code context was provided to the AI." }
        },
        "required": ["violationId", "description", "impact", "nodes", "aiSuggestion", "hasSourceCode"]
      }
    }
  },
  "required": ["suggestions"]
}
)