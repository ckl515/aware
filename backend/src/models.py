from pydantic import BaseModel
from typing import List, Optional

class ViolationNode(BaseModel):
    target: List[str]
    html: str

class Violation(BaseModel):
    id: str
    description: str
    impact: str
    help: str
    helpUrl: str
    nodes: List[ViolationNode]

class AnalysisRequest(BaseModel):
    violations: List[Violation]
    url: Optional[str] = None
    timestamp: Optional[str] = None

class SourceCodeRequest(BaseModel):
    filePath: str
    violations: List[Violation]
    sessionId: str

class SourceCodeResponse(BaseModel):
    filePath: str
    content: str
    sessionId: str

class SuggestionItem(BaseModel):
    violationId: str
    fixDescription: str
    codeSnippet: str

class SuggestionResponse(BaseModel):
    suggestions: List[SuggestionItem]