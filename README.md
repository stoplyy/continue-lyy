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

### ⚙️ 灵活配置
- 🎛️ 只追踪 AI 变更或追踪所有变更
- 🎛️ 可调节的日志级别
- 🎛️ 自动启动选项
- 🎛️ 数据持久化存储

## 🚀 快速开始

1. 克隆或复制此项目到本地
2. 在项目目录下运行:
   ```bash
   npm install
   ```

## 开发调试

1. 在 VS Code 中打开此项目
2. 按 `F5` 启动调试,会打开一个新的 VS Code 窗口
3. 在新窗口中,插件会自动激活并开始监听

## 使用方法

### 命令

在命令面板 (Ctrl+Shift+P / Cmd+Shift+P) 中可以使用以下命令:

- `Continue LYY: Start Monitoring` - 开始监听
- `Continue LYY: Stop Monitoring` - 停止监听
- `Continue LYY: View Logs` - 查看日志输出

### 配置

在设置中可以配置:

- `continue-lyy.enableAutoStart`: 是否在启动时自动开始监听 (默认: true)
- `continue-lyy.logLevel`: 日志级别 (info / debug / verbose, 默认: info)

## 工作原理

插件通过以下方式监听 Continue 扩展的文件改动:

1. **文件系统监听**: 使用 `vscode.workspace.createFileSystemWatcher` 监听文件的创建、修改和删除
2. **文档变更监听**: 使用 `onDidChangeTextDocument` 捕获实时的文档编辑事件
3. **保存事件监听**: 使用 `onDidSaveTextDocument` 记录文件保存时的完整内容
4. **日志记录**: 所有变更都会记录到专用的输出通道中
5. **模拟上传**: 当前使用日志输出模拟上传操作,后续可替换为实际的上传逻辑

## 输出示例

```
[2025-12-10T10:30:45.123Z] [INFO] Monitoring started
[2025-12-10T10:31:20.456Z] [INFO] [MODIFIED] /path/to/file.ts at 2025-12-10T10:31:20.456Z
[2025-12-10T10:31:20.457Z] [INFO] === UPLOAD SIMULATION ===
[2025-12-10T10:31:20.458Z] [VERBOSE] Data to upload: { ... }
[2025-12-10T10:31:20.459Z] [INFO] Upload completed successfully (simulated)
```

## 扩展开发

### 项目结构

```
continue-lyy/
├── src/
│   ├── extension.ts          # 插件入口
│   ├── fileChangeMonitor.ts  # 文件监听核心逻辑
│   └── logManager.ts         # 日志管理器
├── .vscode/
│   ├── launch.json           # 调试配置
│   └── tasks.json            # 构建任务
├── package.json              # 插件配置
└── tsconfig.json             # TypeScript 配置
```

### 添加实际上传功能

在 `fileChangeMonitor.ts` 中找到 `uploadChanges` 方法,替换模拟逻辑:

```typescript
private async uploadChanges(changeData: any): Promise<void> {
    try {
        // 实现实际的上传逻辑
        const response = await fetch('YOUR_API_ENDPOINT', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(changeData)
        });
        
        if (response.ok) {
            this.logManager.log('Upload completed successfully', 'info');
        } else {
            this.logManager.log(`Upload failed: ${response.statusText}`, 'info');
        }
    } catch (error) {
        this.logManager.log(`Upload error: ${error}`, 'info');
    }
}
```

## 许可证

MIT
