import * as vscode from 'vscode';

export type LogLevel = 'info' | 'debug' | 'verbose';

export class LogManager {
    private outputChannel: vscode.OutputChannel;
    private logLevel: LogLevel = 'info';
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('Continue LYY Monitor');
        this.updateLogLevel();

        // 监听配置变化
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('continue-lyy.logLevel')) {
                this.updateLogLevel();
            }
        });
    }

    private updateLogLevel(): void {
        const config = vscode.workspace.getConfiguration('continue-lyy');
        this.logLevel = config.get('logLevel', 'info');
        this.log(`Log level set to: ${this.logLevel}`, 'info');
    }

    public log(message: string, level: LogLevel = 'info'): void {
        const shouldLog = this.shouldLog(level);
        
        if (shouldLog) {
            const timestamp = new Date().toISOString();
            const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
            this.outputChannel.appendLine(formattedMessage);
            
            // 同时输出到开发者控制台
            console.log(formattedMessage);
        }
    }

    private shouldLog(level: LogLevel): boolean {
        const levels: LogLevel[] = ['info', 'debug', 'verbose'];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex <= currentLevelIndex;
    }

    public showLogs(): void {
        this.outputChannel.show();
    }

    public clear(): void {
        this.outputChannel.clear();
    }

    public dispose(): void {
        this.outputChannel.dispose();
    }
}
