import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class AutoReleaseWebviewPanel {
    public static currentPanel: AutoReleaseWebviewPanel | undefined;
    public static readonly viewType = 'scribe.autoRelease';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor?.viewColumn;

        // If we already have a panel, show it
        if (AutoReleaseWebviewPanel.currentPanel) {
            AutoReleaseWebviewPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            AutoReleaseWebviewPanel.viewType,
            'Auto Release',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'out', 'src')
                ]
            }
        );

        AutoReleaseWebviewPanel.currentPanel = new AutoReleaseWebviewPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'getStatus':
                        this._handleGetStatus();
                        return;
                    case 'createRelease':
                        this._handleCreateRelease();
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        AutoReleaseWebviewPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _getCurrentVersion(): string {
        try {
            if (!vscode.workspace.workspaceFolders) {
                return '0.0.0';
            }
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
            const packageJsonPath = path.join(workspaceRoot, 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            return packageJson.version || '0.0.0';
        } catch (error) {
            return '0.0.0';
        }
    }

    private _getCurrentBranch(): string {
        try {
            // Use VS Code's built-in git extension if available
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (gitExtension && gitExtension.isActive) {
                const git = gitExtension.exports;
                const repo = git.getRepository(vscode.workspace.workspaceFolders?.[0].uri);
                if (repo && repo.state && repo.state.HEAD) {
                    return repo.state.HEAD.name || 'unknown';
                }
            }
            return 'unknown';
        } catch (error) {
            return 'unknown';
        }
    }

    private _hasUncommittedChanges(): boolean {
        try {
            // Use VS Code's built-in git extension if available
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (gitExtension && gitExtension.isActive) {
                const git = gitExtension.exports;
                const repo = git.getRepository(vscode.workspace.workspaceFolders?.[0].uri);
                if (repo && repo.state) {
                    const workingTreeChanges = repo.state.workingTreeChanges || [];
                    const indexChanges = repo.state.indexChanges || [];
                    return workingTreeChanges.length > 0 || indexChanges.length > 0;
                }
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    private _getLatestCommitMessage(): string {
        try {
            // Use VS Code's built-in git extension if available
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (gitExtension && gitExtension.isActive) {
                const git = gitExtension.exports;
                const repo = git.getRepository(vscode.workspace.workspaceFolders?.[0].uri);
                if (repo && repo.state && repo.state.HEAD && repo.state.HEAD.commit) {
                    return repo.state.HEAD.commit.message || 'No commit found';
                }
            }
            return 'No commit found';
        } catch (error) {
            return 'No commit found';
        }
    }

    private _handleGetStatus() {
        const status = {
            currentVersion: this._getCurrentVersion(),
            currentBranch: this._getCurrentBranch(),
            hasUncommittedChanges: this._hasUncommittedChanges(),
            latestCommit: this._getLatestCommitMessage()
        };

        this._panel.webview.postMessage({
            command: 'statusUpdate',
            status: status
        });
    }

    private async _handleCreateRelease() {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder found.');
            return;
        }

        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const currentBranch = this._getCurrentBranch();
        const hasUncommitted = this._hasUncommittedChanges();

        // Check prerequisites
        if (hasUncommitted) {
            vscode.window.showErrorMessage('You have uncommitted changes. Please commit or stash them before creating a release.');
            return;
        }

        if (currentBranch === 'main') {
            vscode.window.showErrorMessage('You are on the main branch. Please create a feature branch first.');
            return;
        }

        // Show confirmation dialog
        const version = this._getCurrentVersion();
        const proceed = await vscode.window.showWarningMessage(
            `This will create a PR from "${currentBranch}" to main, wait for CI checks, auto-merge, and create release v${version}. Continue?`,
            { modal: true },
            'Yes, Create Release',
            'Cancel'
        );

        if (proceed !== 'Yes, Create Release') {
            return;
        }

        // Show progress and run the auto-release script
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Creating release v${version}...`,
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Running auto-release script...' });
            
            // Run the auto-release script
            const terminal = vscode.window.createTerminal({
                name: 'Scribe Auto-Release',
                cwd: workspaceRoot
            });
            
            terminal.sendText('npm run auto-release');
            terminal.show();
            
            progress.report({ increment: 100, message: 'Auto-release script started' });
            
            vscode.window.showInformationMessage(
                `Auto-release script is running in the terminal. This will create PR, wait for CI, merge, and create release v${version}.`
            );
        });

        // Close the webview after starting the process
        this.dispose();
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Auto Release</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            font-weight: var(--vscode-font-weight);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
        }
        
        h1 {
            color: var(--vscode-textPreformat-foreground);
            margin-bottom: 20px;
            border-bottom: 1px solid var(--vscode-textSeparator-foreground);
            padding-bottom: 10px;
        }
        
        .status-section {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-textSeparator-foreground);
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .status-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid var(--vscode-textSeparator-foreground);
        }
        
        .status-item:last-child {
            border-bottom: none;
        }
        
        .status-label {
            font-weight: 600;
            color: var(--vscode-textPreformat-foreground);
        }
        
        .status-value {
            font-family: var(--vscode-editor-font-family);
            color: var(--vscode-textLink-foreground);
        }
        
        .warning {
            background-color: var(--vscode-inputValidation-warningBackground);
            border: 1px solid var(--vscode-inputValidation-warningBorder);
            color: var(--vscode-inputValidation-warningForeground);
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }
        
        .info {
            background-color: var(--vscode-inputValidation-infoBackground);
            border: 1px solid var(--vscode-inputValidation-infoBorder);
            color: var(--vscode-inputValidation-infoForeground);
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }
        
        .button-container {
            display: flex;
            gap: 10px;
            margin-top: 30px;
            justify-content: center;
        }
        
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 12px 24px;
            font-size: var(--vscode-font-size);
            border-radius: 4px;
            cursor: pointer;
            font-family: var(--vscode-font-family);
            transition: background-color 0.2s;
        }
        
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        button:disabled {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: not-allowed;
        }
        
        .primary-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .primary-button:hover:not(:disabled) {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .secondary-button {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .secondary-button:hover:not(:disabled) {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .loading {
            display: none;
            text-align: center;
            color: var(--vscode-textPreformat-foreground);
            margin: 20px 0;
        }
        
        ul {
            padding-left: 20px;
            margin: 10px 0;
        }
        
        li {
            margin: 5px 0;
        }
        
        code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
            font-size: 90%;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Auto Release</h1>
        
        <div class="info">
            <strong>Auto Release Process:</strong>
            <ul>
                <li>Creates a pull request from current branch to main</li>
                <li>Waits for CI checks (tests + SonarQube) to pass</li>
                <li>Auto-merges the PR if all checks pass</li>
                <li>Creates a new release with tag matching package.json version</li>
            </ul>
        </div>
        
        <div class="status-section">
            <h3>Current Status</h3>
            <div class="status-item">
                <span class="status-label">Version:</span>
                <span class="status-value" id="current-version">Loading...</span>
            </div>
            <div class="status-item">
                <span class="status-label">Branch:</span>
                <span class="status-value" id="current-branch">Loading...</span>
            </div>
            <div class="status-item">
                <span class="status-label">Uncommitted Changes:</span>
                <span class="status-value" id="uncommitted-changes">Loading...</span>
            </div>
            <div class="status-item">
                <span class="status-label">Latest Commit:</span>
                <span class="status-value" id="latest-commit">Loading...</span>
            </div>
        </div>
        
        <div id="warning-message" class="warning" style="display: none;">
            <strong>Warning:</strong> <span id="warning-text"></span>
        </div>
        
        <div class="button-container">
            <button id="refresh-btn" class="secondary-button">🔄 Refresh Status</button>
            <button id="create-release-btn" class="primary-button" disabled>🚀 Create Release</button>
        </div>
        
        <div class="loading" id="loading">
            <p>⏳ Processing...</p>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        let currentStatus = null;
        
        // DOM elements
        const currentVersionEl = document.getElementById('current-version');
        const currentBranchEl = document.getElementById('current-branch');
        const uncommittedChangesEl = document.getElementById('uncommitted-changes');
        const latestCommitEl = document.getElementById('latest-commit');
        const warningMessageEl = document.getElementById('warning-message');
        const warningTextEl = document.getElementById('warning-text');
        const refreshBtn = document.getElementById('refresh-btn');
        const createReleaseBtn = document.getElementById('create-release-btn');
        const loadingEl = document.getElementById('loading');
        
        // Event listeners
        refreshBtn.addEventListener('click', () => {
            refreshStatus();
        });
        
        createReleaseBtn.addEventListener('click', () => {
            createRelease();
        });
        
        // Message handling
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'statusUpdate':
                    updateStatus(message.status);
                    break;
            }
        });
        
        function refreshStatus() {
            vscode.postMessage({ command: 'getStatus' });
        }
        
        function createRelease() {
            setLoading(true);
            vscode.postMessage({ command: 'createRelease' });
        }
        
        function updateStatus(status) {
            currentStatus = status;
            
            currentVersionEl.textContent = status.currentVersion;
            currentBranchEl.textContent = status.currentBranch;
            uncommittedChangesEl.textContent = status.hasUncommittedChanges ? 'Yes' : 'No';
            latestCommitEl.textContent = status.latestCommit.length > 50 
                ? status.latestCommit.substring(0, 50) + '...' 
                : status.latestCommit;
            
            // Check for warnings and enable/disable button
            let canCreateRelease = true;
            let warnings = [];
            
            if (status.hasUncommittedChanges) {
                warnings.push('You have uncommitted changes');
                canCreateRelease = false;
            }
            
            if (status.currentBranch === 'main') {
                warnings.push('You are on the main branch');
                canCreateRelease = false;
            }
            
            if (warnings.length > 0) {
                warningTextEl.textContent = warnings.join('. ');
                warningMessageEl.style.display = 'block';
            } else {
                warningMessageEl.style.display = 'none';
            }
            
            createReleaseBtn.disabled = !canCreateRelease;
            
            setLoading(false);
        }
        
        function setLoading(loading) {
            if (loading) {
                loadingEl.style.display = 'block';
                refreshBtn.disabled = true;
                createReleaseBtn.disabled = true;
            } else {
                loadingEl.style.display = 'none';
                refreshBtn.disabled = false;
                // createReleaseBtn enabled state is controlled by status check
                if (currentStatus) {
                    updateStatus(currentStatus);
                }
            }
        }
        
        // Initial load
        refreshStatus();
    </script>
</body>
</html>`;
    }
}
