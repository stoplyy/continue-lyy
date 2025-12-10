import * as vscode from 'vscode';
import { LogManager } from './logManager';
import { AdoptionStatistics, AICodeChange, FileStatistics, ManualEdit } from './types';

export class StatisticsManager {
    private aiChanges: AICodeChange[] = [];
    private manualEdits: ManualEdit[] = [];
    private startTime: Date;
    private logManager: LogManager;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext, logManager: LogManager) {
        this.context = context;
        this.logManager = logManager;
        this.startTime = new Date();
        this.loadFromStorage();
    }

    /**
     * 记录 AI 代码变更
     */
    public recordAIChange(change: AICodeChange): void {
        this.aiChanges.push(change);
        this.saveToStorage();
        this.logManager.log(
            `AI Change recorded: ${change.changeType} in ${change.filePath} (${change.characterCount} chars)`,
            'info'
        );
    }

    /**
     * 记录手动编辑
     */
    public recordManualEdit(edit: ManualEdit): void {
        this.manualEdits.push(edit);
        this.saveToStorage();
        this.logManager.log(
            `Manual edit recorded: ${edit.filePath} (${edit.characterCount} chars)`,
            'debug'
        );
    }

    /**
     * 计算采用率统计
     */
    public calculateStatistics(): AdoptionStatistics {
        const now = new Date();
        
        const totalAIChanges = this.aiChanges.length;
        const aiAccepted = this.aiChanges.filter(c => c.changeType === 'ai-accept').length;
        const aiRejected = this.aiChanges.filter(c => c.changeType === 'ai-reject').length;
        const totalManualEdits = this.manualEdits.length;
        
        const aiCharacterCount = this.aiChanges.reduce((sum, c) => sum + c.characterCount, 0);
        const manualCharacterCount = this.manualEdits.reduce((sum, e) => sum + e.characterCount, 0);
        
        const totalCharacters = aiCharacterCount + manualCharacterCount;
        const adoptionRate = totalCharacters > 0 
            ? (aiCharacterCount / totalCharacters) * 100 
            : 0;

        // 按文件分组统计
        const byFile = this.calculateFileStatistics();

        return {
            period: {
                start: this.startTime,
                end: now
            },
            totalAIChanges,
            aiAccepted,
            aiRejected,
            totalManualEdits,
            aiCharacterCount,
            manualCharacterCount,
            adoptionRate,
            byFile
        };
    }

    /**
     * 按文件计算统计
     */
    private calculateFileStatistics(): Map<string, FileStatistics> {
        const fileStats = new Map<string, FileStatistics>();

        // 统计 AI 变更
        for (const change of this.aiChanges) {
            if (!fileStats.has(change.filePath)) {
                fileStats.set(change.filePath, {
                    filePath: change.filePath,
                    aiChanges: 0,
                    manualEdits: 0,
                    aiCharacters: 0,
                    manualCharacters: 0,
                    adoptionRate: 0
                });
            }
            const stats = fileStats.get(change.filePath)!;
            stats.aiChanges++;
            stats.aiCharacters += change.characterCount;
        }

        // 统计手动编辑
        for (const edit of this.manualEdits) {
            if (!fileStats.has(edit.filePath)) {
                fileStats.set(edit.filePath, {
                    filePath: edit.filePath,
                    aiChanges: 0,
                    manualEdits: 0,
                    aiCharacters: 0,
                    manualCharacters: 0,
                    adoptionRate: 0
                });
            }
            const stats = fileStats.get(edit.filePath)!;
            stats.manualEdits++;
            stats.manualCharacters += edit.characterCount;
        }

        // 计算每个文件的采用率
        for (const [, stats] of fileStats) {
            const total = stats.aiCharacters + stats.manualCharacters;
            stats.adoptionRate = total > 0 ? (stats.aiCharacters / total) * 100 : 0;
        }

        return fileStats;
    }

    /**
     * 获取格式化的统计报告
     */
    public getFormattedReport(): string {
        const stats = this.calculateStatistics();
        const duration = (stats.period.end.getTime() - stats.period.start.getTime()) / 1000 / 60; // 分钟

        let report = '═══════════════════════════════════════════════════\n';
        report += '          AI 代码采用率统计报告\n';
        report += '═══════════════════════════════════════════════════\n\n';
        
        report += `📊 统计周期: ${Math.round(duration)} 分钟\n`;
        report += `   起始时间: ${stats.period.start.toLocaleString()}\n`;
        report += `   结束时间: ${stats.period.end.toLocaleString()}\n\n`;
        
        report += '📈 总体统计:\n';
        report += `   AI 代码变更: ${stats.totalAIChanges} 次\n`;
        report += `     - 接受: ${stats.aiAccepted} 次\n`;
        report += `     - 拒绝: ${stats.aiRejected} 次\n`;
        report += `   手动编辑: ${stats.totalManualEdits} 次\n\n`;
        
        report += '💻 代码量统计:\n';
        report += `   AI 生成字符数: ${stats.aiCharacterCount.toLocaleString()}\n`;
        report += `   手动编辑字符数: ${stats.manualCharacterCount.toLocaleString()}\n`;
        report += `   总计: ${(stats.aiCharacterCount + stats.manualCharacterCount).toLocaleString()}\n\n`;
        
        report += `🎯 AI 代码采用率: ${stats.adoptionRate.toFixed(2)}%\n\n`;

        if (stats.byFile.size > 0) {
            report += '📁 按文件统计 (前 10 个):\n';
            const sortedFiles = Array.from(stats.byFile.values())
                .sort((a, b) => b.aiCharacters - a.aiCharacters)
                .slice(0, 10);

            for (const fileStats of sortedFiles) {
                const fileName = fileStats.filePath.split('/').pop() || fileStats.filePath;
                report += `\n   ${fileName}\n`;
                report += `     AI: ${fileStats.aiChanges} 次 (${fileStats.aiCharacters} 字符)\n`;
                report += `     手动: ${fileStats.manualEdits} 次 (${fileStats.manualCharacters} 字符)\n`;
                report += `     采用率: ${fileStats.adoptionRate.toFixed(2)}%\n`;
            }
        }

        report += '\n═══════════════════════════════════════════════════\n';
        return report;
    }

    /**
     * 重置统计数据
     */
    public reset(): void {
        this.aiChanges = [];
        this.manualEdits = [];
        this.startTime = new Date();
        this.saveToStorage();
        this.logManager.log('Statistics reset', 'info');
    }

    /**
     * 获取用于上传的数据
     */
    public getUploadPayload(): any {
        const statistics = this.calculateStatistics();
        return {
            deviceId: this.getDeviceId(),
            uploadTime: new Date(),
            statistics: {
                ...statistics,
                byFile: Array.from(statistics.byFile.values())
            },
            changes: this.aiChanges.slice(-100), // 最近 100 条
            manualEdits: this.manualEdits.slice(-100)
        };
    }

    /**
     * 获取设备 ID
     */
    private getDeviceId(): string {
        let deviceId = this.context.globalState.get<string>('deviceId');
        if (!deviceId) {
            deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            this.context.globalState.update('deviceId', deviceId);
        }
        return deviceId;
    }

    /**
     * 保存到存储
     */
    private saveToStorage(): void {
        this.context.globalState.update('aiChanges', this.aiChanges);
        this.context.globalState.update('manualEdits', this.manualEdits);
        this.context.globalState.update('startTime', this.startTime.toISOString());
    }

    /**
     * 从存储加载
     */
    private loadFromStorage(): void {
        const savedChanges = this.context.globalState.get<AICodeChange[]>('aiChanges');
        const savedEdits = this.context.globalState.get<ManualEdit[]>('manualEdits');
        const savedStartTime = this.context.globalState.get<string>('startTime');

        if (savedChanges) {
            this.aiChanges = savedChanges;
        }
        if (savedEdits) {
            this.manualEdits = savedEdits;
        }
        if (savedStartTime) {
            this.startTime = new Date(savedStartTime);
        }

        this.logManager.log(
            `Loaded ${this.aiChanges.length} AI changes and ${this.manualEdits.length} manual edits from storage`,
            'debug'
        );
    }
}
