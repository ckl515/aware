"use strict";
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
    context.subscriptions.push(connectCommand, disconnectCommand);
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
        }
        else {
            statusBarItem.text = "$(x) Accessibility Disconnected";
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        }
    };
    function connectToBackend() {
        if (isConnected) {
            vscode.window.showInformationMessage('Already connected to Accessibility Engine');
            return;
        }
        try {
            ws = new WebSocket('ws://localhost:5500/vscode');
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
                }
                catch (error) {
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
        }
        catch (error) {
            console.error('Failed to connect:', error);
            vscode.window.showErrorMessage('Failed to connect to Accessibility Engine Backend');
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
    async function handleSourceCodeRequest(message) {
        try {
            const { sessionId, violations, url } = message;
            // Try to find relevant source files
            const sourceFiles = await findRelevantSourceFiles(violations, url);
            if (sourceFiles.length === 0) {
                // No source files found, send empty response
                sendSourceCodeResponse(sessionId, null, null);
                return;
            }
            // If multiple files found, let user choose or send the most relevant one
            let selectedFile = sourceFiles[0];
            if (sourceFiles.length > 1) {
                const items = sourceFiles.map(file => ({
                    label: path.basename(file.path),
                    description: file.path,
                    file: file
                }));
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Multiple source files found. Select one for accessibility analysis:'
                });
                if (selected) {
                    selectedFile = selected.file;
                }
                else {
                    // User cancelled, send empty response
                    sendSourceCodeResponse(sessionId, null, null);
                    return;
                }
            }
            // Read file content
            const content = await fs.promises.readFile(selectedFile.path, 'utf-8');
            sendSourceCodeResponse(sessionId, selectedFile.path, content);
            // Show notification
            vscode.window.showInformationMessage(`Sent source code from ${path.basename(selectedFile.path)} for accessibility analysis`);
        }
        catch (error) {
            console.error('Error handling source code request:', error);
            sendSourceCodeResponse(message.sessionId, null, null);
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
            // Get currently active file
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const activeFile = activeEditor.document.fileName;
                if (isRelevantSourceFile(activeFile)) {
                    sourceFiles.push({
                        path: activeFile,
                        relevance: 'active'
                    });
                }
            }
            // Search for React/Vue/Angular component files
            const searchPatterns = [
                '**/*.jsx',
                '**/*.tsx',
                '**/*.vue',
                '**/*.js',
                '**/*.ts',
                '**/*.html'
            ];
            for (const pattern of searchPatterns) {
                const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 50 // Limit results
                );
                for (const file of files) {
                    const filePath = file.fsPath;
                    if (!sourceFiles.find(f => f.path === filePath) && isRelevantSourceFile(filePath)) {
                        // Try to determine relevance based on file name and URL
                        const relevance = calculateFileRelevance(filePath, url, violations);
                        if (relevance > 0) {
                            sourceFiles.push({
                                path: filePath,
                                relevance: relevance
                            });
                        }
                    }
                }
            }
            // Sort by relevance
            return sourceFiles.sort((a, b) => b.relevance - a.relevance);
        }
        catch (error) {
            console.error('Error finding source files:', error);
            return [];
        }
    }
    function isRelevantSourceFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const relevantExtensions = ['.jsx', '.tsx', '.vue', '.js', '.ts', '.html'];
        return relevantExtensions.includes(ext);
    }
    function calculateFileRelevance(filePath, url, violations) {
        let relevance = 1;
        const fileName = path.basename(filePath, path.extname(filePath)).toLowerCase();
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
//# sourceMappingURL=extension.js.map