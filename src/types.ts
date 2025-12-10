/**
 * AI 代码采用数据类型定义
 */

export interface AICodeChange {
    /** 变更唯一标识 */
    id: string;
    /** 时间戳 */
    timestamp: Date;
    /** 文件路径 */
    filePath: string;
    /** 变更类型 */
    changeType: 'ai-suggestion' | 'ai-accept' | 'ai-reject' | 'ai-edit' | 'manual-edit';
    /** 是否来自 Continue AI */
    isFromContinue: boolean;
    /** 变更内容 */
    content: {
        /** 变更前的内容 */
        before?: string;
        /** 变更后的内容 */
        after: string;
        /** 变更的行范围 */
        range: {
            startLine: number;
            startCharacter: number;
            endLine: number;
            endCharacter: number;
        };
    };
    /** 变更的字符数 */
    characterCount: number;
    /** 变更的行数 */
    lineCount: number;
    /** Continue 会话上下文(如果有) */
    continueContext?: {
        /** 会话 ID */
        sessionId?: string;
        /** 提示词 */
        prompt?: string;
        /** 使用的模型 */
        model?: string;
    };
}

export interface ManualEdit {
    /** 编辑唯一标识 */
    id: string;
    /** 时间戳 */
    timestamp: Date;
    /** 文件路径 */
    filePath: string;
    /** 变更内容 */
    content: {
        before?: string;
        after: string;
        range: {
            startLine: number;
            startCharacter: number;
            endLine: number;
            endCharacter: number;
        };
    };
    /** 变更的字符数 */
    characterCount: number;
}

export interface AdoptionStatistics {
    /** 统计时间范围 */
    period: {
        start: Date;
        end: Date;
    };
    /** AI 生成的代码变更总数 */
    totalAIChanges: number;
    /** AI 代码被接受的次数 */
    aiAccepted: number;
    /** AI 代码被拒绝的次数 */
    aiRejected: number;
    /** 手动编辑次数 */
    totalManualEdits: number;
    /** AI 生成的总字符数 */
    aiCharacterCount: number;
    /** 手动编辑的总字符数 */
    manualCharacterCount: number;
    /** AI 代码采用率 (%) */
    adoptionRate: number;
    /** 按文件分组的统计 */
    byFile: Map<string, FileStatistics>;
}

export interface FileStatistics {
    filePath: string;
    aiChanges: number;
    manualEdits: number;
    aiCharacters: number;
    manualCharacters: number;
    adoptionRate: number;
}

export interface UploadPayload {
    /** 设备/用户标识 */
    deviceId: string;
    /** 上传时间 */
    uploadTime: Date;
    /** 统计数据 */
    statistics: AdoptionStatistics;
    /** 详细变更记录 */
    changes: AICodeChange[];
    /** 手动编辑记录 */
    manualEdits: ManualEdit[];
}
