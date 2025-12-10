import * as vscode from 'vscode';
import { FileChangeMonitor } from './fileChangeMonitor';
import { LogManager } from './logManager';
import { StatisticsManager } from './statisticsManager';

let fileMonitor: FileChangeMonitor | undefined;
let logManager: LogManager | undefined;
let statisticsManager: StatisticsManager | undefined;
let uploadTimer: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('Continue LYY Monitor is now active!');

    // 检查 Continue 扩展是否已安装
    const continueExt = vscode.extensions.getExtension('continue.continue');
    if (!continueExt) {
        vscode.window.showWarningMessage(
            'Continue extension not found. Continue LYY Monitor requires Continue extension to work properly.'
        );
    }

    // 初始化日志管理器
    logManager = new LogManager(context);
    
    // 初始化统计管理器
    statisticsManager = new StatisticsManager(context, logManager);
    
    // 初始化文件监听器
    fileMonitor = new FileChangeMonitor(logManager, statisticsManager);

    // 注册命令
    const startMonitoring = vscode.commands.registerCommand('continue-lyy.startMonitoring', () => {
        fileMonitor?.start();
        vscode.window.showInformationMessage('Continue LYY: Monitoring started');
    });

    const stopMonitoring = vscode.commands.registerCommand('continue-lyy.stopMonitoring', () => {
        fileMonitor?.stop();
        vscode.window.showInformationMessage('Continue LYY: Monitoring stopped');
    });

    const viewLogs = vscode.commands.registerCommand('continue-lyy.viewLogs', () => {
        logManager?.showLogs();
    });

    const viewStatistics = vscode.commands.registerCommand('continue-lyy.viewStatistics', () => {
        if (statisticsManager) {
            const report = statisticsManager.getFormattedReport();
            
            // 在新的文本编辑器中显示报告
            vscode.workspace.openTextDocument({
                content: report,
                language: 'plaintext'
            }).then(doc => {
                vscode.window.showTextDocument(doc, { preview: true });
            });

            // 也输出到日志
            logManager?.log('\n' + report, 'info');
        }
    });

    const resetStatistics = vscode.commands.registerCommand('continue-lyy.resetStatistics', async () => {
        const answer = await vscode.window.showWarningMessage(
            'Are you sure you want to reset all statistics?',
            'Yes', 'No'
        );
        
        if (answer === 'Yes' && statisticsManager) {
            statisticsManager.reset();
            vscode.window.showInformationMessage('Statistics have been reset');
        }
    });

    context.subscriptions.push(
        startMonitoring, 
        stopMonitoring, 
        viewLogs, 
        viewStatistics,
        resetStatistics
    );

    // 设置定时上传
    setupAutoUpload(context);

    // 根据配置自动启动监听
    const config = vscode.workspace.getConfiguration('continue-lyy');
    if (config.get('enableAutoStart', true)) {
        fileMonitor.start();
        logManager.log('Continue LYY Monitor auto-started', 'info');
        logManager.log(`Tracking mode: ${config.get('trackOnlyAIChanges') ? 'AI changes only' : 'All changes'}`, 'info');
    }
}

/**
 * 设置自动上传
 */
function setupAutoUpload(context: vscode.ExtensionContext): void {
    const config = vscode.workspace.getConfiguration('continue-lyy');
    const interval = config.get<number>('uploadInterval', 300);
    const endpoint = config.get<string>('uploadEndpoint', '');

    if (interval > 0 && endpoint && statisticsManager && logManager) {
        uploadTimer = setInterval(() => {
            const payload = statisticsManager!.getUploadPayload();
            logManager!.log('Auto-uploading statistics...', 'info');
            
            // TODO: 实现实际上传
            logManager!.log(`Upload payload ready (${JSON.stringify(payload).length} bytes)`, 'debug');
            
            // 模拟上传
            // fetch(endpoint, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(payload)
            // });
        }, interval * 1000);

        context.subscriptions.push({
            dispose: () => {
                if (uploadTimer) {
                    clearInterval(uploadTimer);
                }
            }
        });
    }
}

export function deactivate() {
    fileMonitor?.stop();
    if (uploadTimer) {
        clearInterval(uploadTimer);
    }
    console.log('Continue LYY Monitor deactivated');
}
