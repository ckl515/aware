const vscode = require('vscode');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

let ws = null;
let isConnected = false;
let reconnectInterval = null;

function activate(context) {
    console.log('Accessibility Source Code Extension activated');

    // Register commands
    const connectCommand = vscode.commands.registerCommand('accessibilityEngine.connect', connectToBackend);
    const disconnectCommand = vscode.commands.registerCommand('accessibilityEngine.disconnect', disconnectFromBackend);
    const testCommand = vscode.commands.registerCommand('accessibilityEngine.test', async () => {
    try {
        const config = vscode.workspace.getConfiguration('accessibilityEngine');
        const backendUrl = config.get('backendUrl', 'ws://localhost:5500/vscode');
        
        vscode.window.showInformationMessage(`Attempting to connect to: ${backendUrl}`);
        
        if (ws) {
            vscode.window.showInformationMessage(`WebSocket state: ${ws.readyState}`);
        } else {
            vscode.window.showInformationMessage('WebSocket not initialized');
        }
        
        await connectToBackend();
    } catch (error) {
        vscode.window.showErrorMessage(`Connection error: ${error.message}`);
    }
});

    context.subscriptions.push(connectCommand, disconnectCommand, testCommand);

    // Auto-connect on activation
    connectToBackend();

    // Status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(plug) Accessibility Engine";
    statusBarItem.tooltip = "Click to connect/disconnect Accessibility Engine";
    statusBarItem.command = 'accessibilityEngine.connect';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Update status bar based on connection
    const updateStatusBar = () => {
        if (isConnected) {
            statusBarItem.text = "$(check) Accessibility Connected";
            statusBarItem.backgroundColor = undefined;
        } else {
            statusBarItem.text = "$(x) Accessibility Disconnected";
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        }
    };

    function connectToBackend() {
        if (isConnected) {
            vscode.window.showInformationMessage('Already connected to Accessibility Engine');
            return;
        }
        const config = vscode.workspace.getConfiguration('accessibilityEngine');
        const backendUrl = config.get('backendUrl', 'ws://localhost:5500/vscode');
    
        console.log(`Attempting to connect to ${backendUrl}`);
    
        try {
            const options = {
                headers: {
                    Origin: 'vscode-extension://accessibility-engine.accessibility-source-engine'
                }
            }
            
            ws = new WebSocket(backendUrl, options);

            ws.on('open', () => {
                isConnected = true;
                updateStatusBar();
                vscode.window.showInformationMessage('Connected to Accessibility Engine Backend');
                
                // Clear reconnection attempts
                if (reconnectInterval) {
                    clearInterval(reconnectInterval);
                    reconnectInterval = null;
                }
            });

            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    await handleBackendMessage(message);
                } catch (error) {
                    console.error('Error handling message:', error);
                }
            });

            ws.on('close', () => {
                isConnected = false;
                updateStatusBar();
                vscode.window.showWarningMessage('Disconnected from Accessibility Engine Backend');
                
                // Attempt to reconnect every 10 seconds
                if (!reconnectInterval) {
                    reconnectInterval = setInterval(() => {
                        if (!isConnected) {
                            connectToBackend();
                        }
                    }, 10000);
                }
            });

            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                isConnected = false;
                updateStatusBar();
            });

        } catch (error) {
            console.error('Failed to connect:', error);
            vscode.window.showErrorMessage(`Failed to connect: ${error.message}`);
        }
    }

    function disconnectFromBackend() {
        if (ws) {
            ws.close();
            isConnected = false;
            updateStatusBar();
            
            if (reconnectInterval) {
                clearInterval(reconnectInterval);
                reconnectInterval = null;
            }
        }
    }

    async function handleBackendMessage(message) {
        switch (message.type) {
            case 'request_source':
                await handleSourceCodeRequest(message);
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }

    let isHandlingSourceRequest = false;

    async function handleSourceCodeRequest(message) {
        try {
            // Prevent multiple concurrent source code requests
            if (isHandlingSourceRequest) {
                console.log('⚠️  Already handling a source code request, ignoring duplicate');
                return;
            }
            
            isHandlingSourceRequest = true;
            
            const { sessionId, violations, url } = message;
            
            console.log('🔍 SOURCE CODE REQUEST RECEIVED');
            console.log('Session ID:', sessionId);
            console.log('URL:', url);
            console.log('Violations:', violations?.length || 0);
            
            // Show immediate notification
            vscode.window.showInformationMessage(
                `🔍 Accessibility analysis requested for ${violations?.length || 0} violations. Searching for source files...`
            );
            
            // Try to find relevant source files
            const sourceFiles = await findRelevantSourceFiles(violations, url);
            
            console.log('📁 Found source files:', sourceFiles.length);
            sourceFiles.forEach((file, index) => {
                if (index < 10 || file.path.includes('BadAccessibility')) { // Show top 10 and any BadAccessibility files
                    console.log(`  ${index + 1}. ${path.basename(file.path)} (relevance: ${file.relevance}) - ${file.path}`);
                }
            });
            
            if (sourceFiles.length === 0) {
                // No source files found, send empty response
                vscode.window.showWarningMessage('❌ No source files found in workspace');
                sendSourceCodeResponse(sessionId, null, null);
                return;
            }

            // Always show file picker, even for single files
            const items = sourceFiles.map(file => ({
                label: path.basename(file.path),
                description: file.path.replace(vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath || '', ''),
                detail: `Relevance: ${file.relevance}`,
                file: file
            }));
            
            console.log('📋 Showing Quick Pick with', items.length, 'items');
            
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: `Select source file for accessibility analysis (${items.length} files found)`,
                matchOnDescription: true,
                matchOnDetail: true
            });
            
            if (selected) {
                console.log('✅ User selected:', selected.file.path);
                
                // Read file content
                const content = await fs.promises.readFile(selected.file.path, 'utf-8');
                sendSourceCodeResponse(sessionId, selected.file.path, content);
                
                // Show success notification
                vscode.window.showInformationMessage(
                    `✅ Sent source code from ${path.basename(selected.file.path)} for accessibility analysis`
                );
            } else {
                console.log('❌ User cancelled file selection');
                // User cancelled, send empty response
                sendSourceCodeResponse(sessionId, null, null);
                vscode.window.showWarningMessage('❌ File selection cancelled - analysis will proceed without source code');
            }

        } catch (error) {
            console.error('❌ Error handling source code request:', error);
            vscode.window.showErrorMessage(`Error: ${error.message}`);
            sendSourceCodeResponse(message.sessionId, null, null);
        } finally {
            isHandlingSourceRequest = false;
        }
    }

    function sendSourceCodeResponse(sessionId, filePath, content) {
        if (ws && isConnected) {
            const response = {
                type: 'source_response',
                sessionId: sessionId,
                filePath: filePath,
                content: content
            };
            ws.send(JSON.stringify(response));
        }
    }

    async function findRelevantSourceFiles(violations, url) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return [];
        }

        const sourceFiles = [];
        
        try {
            // Get currently active file first
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const activeFile = activeEditor.document.fileName;
                if (isRelevantSourceFile(activeFile)) {
                    sourceFiles.push({
                        path: activeFile,
                        relevance: 10 // High relevance for active file
                    });
                }
            }

            // Search for ALL files in workspace (not just source files)
            const searchPatterns = [
                '**/*' // Search for everything
            ];

            // Also specifically search for accessibility component files
            const specificPatterns = [
                '**/BadAccessibilityComponent.*',
                '**/components/**/*.tsx',
                '**/components/**/*.jsx',
                '**/*Accessibility*.*'
            ];

            // Add specific patterns to search
            searchPatterns.push(...specificPatterns);

            for (const pattern of searchPatterns) {
                const files = await vscode.workspace.findFiles(
                    pattern,
                    '{**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/.vscode/**}', // Exclude common build/system folders
                    500 // Show up to 500 files
                );

                for (const file of files) {
                    const filePath = file.fsPath;
                    // Add ALL files (no filtering)
                    if (!sourceFiles.find(f => f.path === filePath)) {
                        const relevance = calculateFileRelevance(filePath, url, violations);
                        sourceFiles.push({
                            path: filePath,
                            relevance: relevance || 1 // Give all files at least relevance 1
                        });
                    }
                }
            }

            // Sort by relevance (highest first)
            return sourceFiles.sort((a, b) => b.relevance - a.relevance);

        } catch (error) {
            console.error('Error finding source files:', error);
            return [];
        }
    }

    function isRelevantSourceFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        // Expanded list of relevant extensions
        const relevantExtensions = [
            '.jsx', '.tsx', '.vue', '.js', '.ts', '.html', '.css', '.scss', 
            '.sass', '.less', '.md', '.json', '.py', '.php', '.rb', '.go',
            '.java', '.c', '.cpp', '.h'
        ];
        return relevantExtensions.includes(ext);
    }

    function calculateFileRelevance(filePath, url, violations) {
        let relevance = 1;
        const fileName = path.basename(filePath, path.extname(filePath)).toLowerCase();
        const fullFileName = path.basename(filePath).toLowerCase();
        
        // Check if this file is specifically mentioned in violation targets
        if (violations) {
            for (const violation of violations) {
                if (violation.nodes) {
                    for (const node of violation.nodes) {
                        if (node.target) {
                            const targets = Array.isArray(node.target) ? node.target : [node.target];
                            for (const target of targets) {
                                // Check if target mentions this file specifically
                                if (typeof target === 'string' && target.toLowerCase().includes(fileName)) {
                                    relevance += 10; // Very high relevance for exact matches
                                }
                                if (typeof target === 'string' && target.toLowerCase().includes(fullFileName)) {
                                    relevance += 15; // Even higher for full filename matches
                                }
                            }
                        }
                        // Also check HTML content for file references
                        if (node.html && typeof node.html === 'string') {
                            if (node.html.toLowerCase().includes(fileName) || node.html.toLowerCase().includes(fullFileName)) {
                                relevance += 8;
                            }
                        }
                    }
                }
            }
        }
        
        // Higher relevance for component files
        if (filePath.includes('.jsx') || filePath.includes('.tsx') || filePath.includes('.vue')) {
            relevance += 2;
        }

        // Try to match file name with URL path
        if (url) {
            const urlPath = url.split('/').pop() || '';
            if (fileName.includes(urlPath.toLowerCase()) || urlPath.toLowerCase().includes(fileName)) {
                relevance += 3;
            }
        }

        // Check for common component patterns
        if (fileName.includes('component') || fileName.includes('page') || fileName.includes('view')) {
            relevance += 1;
        }

        // Boost relevance for specific accessibility-related files
        if (fileName.includes('accessibility') || fileName.includes('badaccessibility')) {
            relevance += 5;
        }

        return relevance;
    }

    // Update status bar initially
    updateStatusBar();
}

function deactivate() {
    if (ws) {
        ws.close();
    }
    if (reconnectInterval) {
        clearInterval(reconnectInterval);
    }
}

module.exports = {
    activate,
    deactivate
};