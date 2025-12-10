# Continue LYY Monitor

一个专门用于监听和分析 **Continue AI 扩展**文件改动的 VS Code 插件,用于计算 AI 代码采用率和收集使用数据。

## 📋 核心功能

### 🎯 AI 代码追踪
- ✅ **智能识别 AI 编辑** - 自动区分 AI 生成代码和手动编辑
- ✅ **Continue 扩展集成** - 深度集成 Continue 扩展,获取会话上下文
- ✅ **实时监听** - 捕获所有通过 Continue 进行的代码变更
- ✅ **详细记录** - 记录变更位置、内容、时间戳等完整信息

### 📊 采用率统计
- 📈 AI 代码生成量 vs 手动编辑量
- 📈 AI 代码接受率和拒绝率
- 📈 按文件分组的详细统计
- 📈 时间段内的趋势分析

### 🔄 数据上传
- 🚀 可配置的自动上传间隔
- 🚀 批量上传优化
- 🚀 自定义上传端点
- 🚀 完整的采用率数据导出

## 🚀 快速开始

### 前置要求
- ✅ VS Code 1.80.0 或更高版本
- ✅ **Continue 扩展** (必需依赖)

### 安装步骤

```bash
cd /workspaces/continue-lyy
npm install
npm run compile
```

### 开发调试
1. 在 VS Code 中打开此项目
2. 按 `F5` 启动调试
3. 会打开一个新的扩展开发宿主窗口

## 📖 使用指南

### 命令面板

打开命令面板 (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- 🟢 **Continue LYY: Start Monitoring** - 开始监听
- 🔴 **Continue LYY: Stop Monitoring** - 停止监听
- 📊 **Continue LYY: View AI Adoption Statistics** - 查看采用率统计报告
- 📋 **Continue LYY: View Logs** - 查看详细日志
- 🔄 **Continue LYY: Reset Statistics** - 重置统计数据

### 配置选项

在设置中搜索 `continue-lyy`:

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `enableAutoStart` | boolean | true | 启动时自动开始监听 |
| `logLevel` | string | info | 日志级别 (info/debug/verbose) |
| `trackOnlyAIChanges` | boolean | true | 只追踪 AI 变更,忽略手动编辑 |
| `uploadEndpoint` | string | "" | 数据上传的 API 端点 |
| `uploadInterval` | number | 300 | 自动上传间隔(秒),0 禁用 |

### 统计报告示例

```
═══════════════════════════════════════════════════
          AI 代码采用率统计报告
═══════════════════════════════════════════════════

📊 统计周期: 45 分钟
   起始时间: 2025-12-10 10:00:00
   结束时间: 2025-12-10 10:45:00

📈 总体统计:
   AI 代码变更: 23 次
     - 接受: 20 次
     - 拒绝: 3 次
   手动编辑: 8 次

💻 代码量统计:
   AI 生成字符数: 5,420
   手动编辑字符数: 1,230
   总计: 6,650

🎯 AI 代码采用率: 81.50%

📁 按文件统计:
   app.ts
     AI: 8 次 (2,340 字符)
     手动: 3 次 (450 字符)
     采用率: 83.87%
```

## 🔧 工作原理

### AI 编辑检测机制

插件使用多种启发式方法智能识别 AI 编辑:

1. **Continue 扩展状态检测** - 检查 Continue 是否激活
2. **变更特征分析** - AI 通常生成较大的代码块(>50字符)
3. **时序分析** - AI 编辑通常快速连续发生(<100ms)
4. **内容分析** - 检测多行代码插入
5. **上下文标记** - 识别 Continue 的特殊标记
6. **扩展 API 集成** - 尝试从 Continue 获取会话信息

### 数据收集流程

```
Continue AI 编辑
       ↓
文档变更事件触发
       ↓
AI 编辑检测算法
       ↓
记录到统计管理器
       ↓
持久化到本地存储
       ↓
定时上传到服务器
```

### 数据结构

```typescript
interface AICodeChange {
    id: string;                    // 唯一标识
    timestamp: Date;               // 时间戳
    filePath: string;              // 文件路径
    changeType: string;            // 变更类型
    isFromContinue: boolean;       // 是否来自 Continue
    characterCount: number;        // 字符数
    lineCount: number;             // 行数
    continueContext?: {            // Continue 上下文
        sessionId?: string;
        prompt?: string;
        model?: string;
    };
}
```

## 📁 项目结构

```
continue-lyy/
├── src/
│   ├── extension.ts           # 插件入口,命令注册
│   ├── fileChangeMonitor.ts   # 核心监听器,AI 检测逻辑
│   ├── statisticsManager.ts   # 统计计算和数据管理
│   ├── logManager.ts          # 日志管理器
│   └── types.ts               # TypeScript 类型定义
├── .vscode/
│   ├── launch.json            # F5 调试配置
│   ├── tasks.json             # 编译任务
│   └── extensions.json        # 推荐扩展
├── package.json               # 插件清单,声明 Continue 依赖
├── tsconfig.json              # TypeScript 配置
└── README.md                  # 文档
```

## 🔌 API 集成

### 添加实际上传功能

编辑 `src/extension.ts` 中的 `setupAutoUpload` 函数:

```typescript
// 取消注释并配置实际的上传逻辑
fetch(endpoint, {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN'
    },
    body: JSON.stringify(payload)
}).then(response => {
    if (response.ok) {
        logManager.log('✅ Upload successful', 'info');
    }
}).catch(error => {
    logManager.log(`❌ Upload error: ${error}`, 'info');
});
```

### 上传数据格式

```json
{
  "deviceId": "device-1234567890-abc123",
  "uploadTime": "2025-12-10T10:45:00.000Z",
  "statistics": {
    "period": {
      "start": "2025-12-10T10:00:00.000Z",
      "end": "2025-12-10T10:45:00.000Z"
    },
    "totalAIChanges": 23,
    "aiAccepted": 20,
    "aiRejected": 3,
    "totalManualEdits": 8,
    "aiCharacterCount": 5420,
    "manualCharacterCount": 1230,
    "adoptionRate": 81.5,
    "byFile": [...]
  },
  "changes": [...],
  "manualEdits": [...]
}
```

## 🎯 使用场景

### 个人开发者
- 📊 了解自己的 AI 辅助编程习惯
- 📊 量化 AI 对编程效率的提升
- 📊 优化与 AI 协作的工作流程

### 团队管理者
- 📊 评估团队的 AI 代码采用情况
- 📊 识别高价值的 AI 使用模式
- 📊 制定更好的 AI 工具培训计划

### 研究人员
- 📊 研究 AI 辅助编程的实际效果
- 📊 收集真实的代码生成数据
- 📊 分析人机协作编程模式

## 🔒 隐私说明

- ✅ 所有数据默认存储在本地
- ✅ 上传功能需手动配置才启用
- ✅ 不收集个人身份信息
- ✅ 可随时清空统计数据

## 🛠️ 开发路线图

- [ ] 支持更多 AI 编程助手(GitHub Copilot, Cursor 等)
- [ ] 数据可视化仪表板
- [ ] 导出统计报告为 PDF/Excel
- [ ] 团队协作功能
- [ ] 机器学习模型优化 AI 检测准确率

## 📝 许可证

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request!

## 📧 联系方式

如有问题或建议,请创建 GitHub Issue。
