#!/usr/bin/env python3
"""
AWARE Backend Server Launcher
Run this script to start the FastAPI backend server
"""
import os
import sys
import uvicorn

# Add the src directory to Python path so imports work
src_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src')
sys.path.insert(0, src_dir)

if __name__ == "__main__":
    # Import after path setup
    from processor import app
    
    print("Starting AWARE Backend Server...")
    print("Server will be available at: http://127.0.0.1:5500")
    print("API docs will be available at: http://127.0.0.1:5500/docs")
    print("Press Ctrl+C to stop the server")
    
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=5500,
        reload=True,
        log_level="info"
    )