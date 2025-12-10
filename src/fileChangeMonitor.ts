import * as crypto from 'crypto';
import * as vscode from 'vscode';
import { LogManager } from './logManager';
import { StatisticsManager } from './statisticsManager';
import { AICodeChange, ManualEdit } from './types';

export interface FileChange {
    timestamp: Date;
    filePath: string;
    changeType: 'created' | 'modified' | 'deleted';
    content?: string;
    diff?: string;
}

export class FileChangeMonitor {
    private fileWatcher: vscode.FileSystemWatcher | undefined;
    private textDocumentWatcher: vscode.Disposable[] = [];
    private isMonitoring: boolean = false;
    private logManager: LogManager;
    private statisticsManager: StatisticsManager;
    private documentVersions: Map<string, number> = new Map();
    private continueExtension: vscode.Extension<any> | undefined;
    private lastChangeTimestamps: Map<string, number> = new Map();
    private recentAIEdits: Set<string> = new Set(); // 追踪最近的 AI 编辑
    private trackOnlyAI: boolean = true;

    constructor(logManager: LogManager, statisticsManager: StatisticsManager) {
        this.logManager = logManager;
        this.statisticsManager = statisticsManager;
        
        // 获取 Continue 扩展
        this.continueExtension = vscode.extensions.getExtension('continue.continue');
        if (this.continueExtension) {
            this.logManager.log('Continue extension found and will be monitored', 'info');
        } else {
            this.logManager.log('Continue extension not found - will track all changes', 'info');
        }

        // 读取配置
        const config = vscode.workspace.getConfiguration('continue-lyy');
        this.trackOnlyAI = config.get('trackOnlyAIChanges', true);
    }

    public start(): void {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;
        this.logManager.log('Monitoring started', 'info');

        // 监听文件系统变化
        this.fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');

        this.fileWatcher.onDidCreate((uri) => {
            this.handleFileChange(uri, 'created');
        });

        this.fileWatcher.onDidChange((uri) => {
            this.handleFileChange(uri, 'modified');
        });

        this.fileWatcher.onDidDelete((uri) => {
            this.handleFileChange(uri, 'deleted');
        });

        // 监听文档编辑事件 (捕获 Continue 触发的更改)
        const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument((event) => {
            this.handleTextDocumentChange(event);
        });

        const onDidSaveTextDocument = vscode.workspace.onDidSaveTextDocument((document) => {
            this.handleDocumentSave(document);
        });

        this.textDocumentWatcher.push(onDidChangeTextDocument, onDidSaveTextDocument);

        // 监听编辑器激活事件
        const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor) {
                this.logManager.log(`Active editor changed: ${editor.document.uri.fsPath}`, 'debug');
            }
        });

        this.textDocumentWatcher.push(onDidChangeActiveTextEditor);
    }

    public stop(): void {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;
        this.logManager.log('Monitoring stopped', 'info');

        if (this.fileWatcher) {
            this.fileWatcher.dispose();
            this.fileWatcher = undefined;
        }

        this.textDocumentWatcher.forEach((disposable) => disposable.dispose());
        this.textDocumentWatcher = [];
        this.documentVersions.clear();
    }

    private handleFileChange(uri: vscode.Uri, changeType: 'created' | 'modified' | 'deleted'): void {
        const change: FileChange = {
            timestamp: new Date(),
            filePath: uri.fsPath,
            changeType: changeType
        };

        this.logChange(change);
    }

    private handleTextDocumentChange(event: vscode.TextDocumentChangeEvent): void {
        const document = event.document;
        const uri = document.uri;

        // 忽略未保存的临时文档和输出面板
        if (uri.scheme !== 'file') {
            return;
        }

        // 检测版本变化
        const currentVersion = document.version;
        const previousVersion = this.documentVersions.get(uri.fsPath);

        if (previousVersion !== undefined && currentVersion > previousVersion) {
            // 记录文档变更
            const changes = event.contentChanges;
            if (changes.length > 0) {
                // 判断是否为 AI 编辑
                const isAIEdit = this.detectAIEdit(document, event);
                
                // 如果设置了只追踪 AI 变更,则过滤掉手动编辑
                if (this.trackOnlyAI && !isAIEdit) {
                    this.logManager.log(`Manual edit detected and skipped: ${uri.fsPath}`, 'debug');
                    this.documentVersions.set(uri.fsPath, currentVersion);
                    return;
                }

                const totalCharacters = changes.reduce((sum, c) => sum + c.text.length, 0);
                const changeId = this.generateChangeId(uri.fsPath, currentVersion);

                if (isAIEdit) {
                    // 记录 AI 编辑
                    const aiChange: AICodeChange = {
                        id: changeId,
                        timestamp: new Date(),
                        filePath: uri.fsPath,
                        changeType: 'ai-edit',
                        isFromContinue: true,
                        content: {
                            before: changes[0].rangeLength > 0 ? 'replaced' : undefined,
                            after: changes.map(c => c.text).join(''),
                            range: {
                                startLine: changes[0].range.start.line,
                                startCharacter: changes[0].range.start.character,
                                endLine: changes[0].range.end.line,
                                endCharacter: changes[0].range.end.character
                            }
                        },
                        characterCount: totalCharacters,
                        lineCount: changes[0].range.end.line - changes[0].range.start.line + 1,
                        continueContext: this.extractContinueContext()
                    };

                    this.statisticsManager.recordAIChange(aiChange);
                    this.logManager.log(
                        `✨ AI Edit detected: ${uri.fsPath} (${totalCharacters} chars)`,
                        'info'
                    );
                    this.uploadChanges({ type: 'ai-change', data: aiChange });
                } else {
                    // 记录手动编辑
                    const manualEdit: ManualEdit = {
                        id: changeId,
                        timestamp: new Date(),
                        filePath: uri.fsPath,
                        content: {
                            before: changes[0].rangeLength > 0 ? 'replaced' : undefined,
                            after: changes.map(c => c.text).join(''),
                            range: {
                                startLine: changes[0].range.start.line,
                                startCharacter: changes[0].range.start.character,
                                endLine: changes[0].range.end.line,
                                endCharacter: changes[0].range.end.character
                            }
                        },
                        characterCount: totalCharacters
                    };

                    this.statisticsManager.recordManualEdit(manualEdit);
                    this.logManager.log(
                        `✏️  Manual edit: ${uri.fsPath} (${totalCharacters} chars)`,
                        'debug'
                    );
                }
            }
        }

        this.documentVersions.set(uri.fsPath, currentVersion);
    }

    private handleDocumentSave(document: vscode.TextDocument): void {
        if (document.uri.scheme !== 'file') {
            return;
        }

        const change: FileChange = {
            timestamp: new Date(),
            filePath: document.uri.fsPath,
            changeType: 'modified',
            content: document.getText()
        };

        this.logManager.log(`Document saved: ${document.uri.fsPath}`, 'info');
        this.logChange(change);
    }

    private logChange(change: FileChange): void {
        const logMessage = `[${change.changeType.toUpperCase()}] ${change.filePath} at ${change.timestamp.toISOString()}`;
        this.logManager.log(logMessage, 'info');

        // 模拟上传操作
        this.uploadChanges(change);
    }

    private uploadChanges(changeData: any): void {
        // TODO: 实现实际的上传逻辑
        // 当前使用日志模拟上传
        this.logManager.log('=== UPLOAD SIMULATION ===', 'verbose');
        this.logManager.log(`Data type: ${changeData.type}`, 'verbose');
        this.logManager.log(`Timestamp: ${new Date().toISOString()}`, 'verbose');
        
        const config = vscode.workspace.getConfiguration('continue-lyy');
        const endpoint = config.get<string>('uploadEndpoint', '');
        
        if (endpoint) {
            this.logManager.log(`Would upload to: ${endpoint}`, 'verbose');
            // 实际上传代码:
            // fetch(endpoint, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(changeData)
            // });
        } else {
            this.logManager.log('No upload endpoint configured', 'verbose');
        }
        
        this.logManager.log('========================', 'verbose');
    }

    /**
     * 检测是否为 AI 编辑
     * 基于多种启发式方法判断
     */
    private detectAIEdit(document: vscode.TextDocument, event: vscode.TextDocumentChangeEvent): boolean {
        const uri = document.uri;
        const now = Date.now();
        const lastChange = this.lastChangeTimestamps.get(uri.fsPath) || 0;
        const timeSinceLastChange = now - lastChange;

        this.lastChangeTimestamps.set(uri.fsPath, now);

        // 启发式判断:
        // 1. Continue 扩展是否激活
        if (!this.continueExtension?.isActive) {
            return false;
        }

        // 2. 检查变更特征
        const changes = event.contentChanges;
        if (changes.length === 0) {
            return false;
        }

        // 3. AI 编辑通常是大块文本插入/替换
        const totalChars = changes.reduce((sum, c) => sum + c.text.length, 0);
        const isLargeChange = totalChars > 50; // AI 通常生成较大的代码块

        // 4. AI 编辑通常很快连续发生
        const isRapidChange = timeSinceLastChange < 100; // 毫秒

        // 5. 检查是否包含多行代码
        const hasMultipleLines = changes.some(c => c.text.includes('\n'));

        // 6. 检查活动编辑器的装饰器或特殊标记
        const hasAIMarker = this.checkForAIMarkers(document);

        // 综合判断
        const isAI = (isLargeChange && hasMultipleLines) || hasAIMarker || 
                     (isRapidChange && totalChars > 20);

        if (isAI) {
            this.recentAIEdits.add(uri.fsPath);
            // 5秒后清除标记
            setTimeout(() => this.recentAIEdits.delete(uri.fsPath), 5000);
        }

        return isAI;
    }

    /**
     * 检查文档中的 AI 标记
     */
    private checkForAIMarkers(document: vscode.TextDocument): boolean {
        // Continue 可能会在文档中留下特殊注释或标记
        // 这里可以根据实际情况调整
        const text = document.getText();
        
        // 检查是否有 Continue 的特殊标记
        const hasMarker = text.includes('// Generated by Continue') ||
                         text.includes('# Generated by Continue') ||
                         this.recentAIEdits.has(document.uri.fsPath);

        return hasMarker;
    }

    /**
     * 提取 Continue 上下文信息
     */
    private extractContinueContext(): any {
        // 尝试从 Continue 扩展获取上下文
        // 这需要 Continue 扩展提供公共 API
        if (this.continueExtension?.isActive) {
            try {
                // Continue 扩展的 API 可能提供当前会话信息
                const continueAPI = this.continueExtension.exports;
                return {
                    sessionId: continueAPI?.currentSessionId || 'unknown',
                    model: continueAPI?.currentModel || 'unknown',
                    prompt: continueAPI?.lastPrompt || undefined
                };
            } catch (error) {
                this.logManager.log(`Failed to extract Continue context: ${error}`, 'debug');
            }
        }
        return undefined;
    }

    /**
     * 生成变更 ID
     */
    private generateChangeId(filePath: string, version: number): string {
        const timestamp = Date.now();
        const data = `${filePath}-${version}-${timestamp}`;
        return crypto.createHash('md5').update(data).digest('hex').substring(0, 16);
    }
}
