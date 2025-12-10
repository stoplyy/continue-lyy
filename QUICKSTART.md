# 快速开始指南

## 1. 安装依赖

```bash
cd /workspaces/continue-lyy
npm install
```

## 2. 开发调试

### 方式一: 使用 VS Code 调试

1. 在 VS Code 中打开 `continue-lyy` 文件夹
2. 按 `F5` 键,会启动一个新的"扩展开发宿主"窗口
3. 插件会自动激活并开始监听

### 方式二: 手动编译

```bash
# 单次编译
npm run compile

# 监视模式(自动编译)
npm run watch
```

## 3. 使用插件

### 查看日志

1. 打开命令面板: `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac)
2. 输入 `Continue LYY: View Logs`
3. 会打开日志输出面板

### 手动控制监听

- **开始监听**: `Continue LYY: Start Monitoring`
- **停止监听**: `Continue LYY: Stop Monitoring`

### 配置选项

打开设置 (File > Preferences > Settings),搜索 "continue-lyy":

- **Enable Auto Start**: 启动时自动开始监听
- **Log Level**: 选择日志级别
  - `info`: 基本信息
  - `debug`: 调试信息
  - `verbose`: 详细信息(包括完整的变更数据)

## 4. 测试监听功能

1. 在扩展开发宿主窗口中,创建或编辑任何文件
2. 查看 "Continue LYY Monitor" 输出面板,会看到类似输出:

```
[2025-12-10T10:30:45.123Z] [INFO] Monitoring started
[2025-12-10T10:31:20.456Z] [DEBUG] Document changed: /path/to/file.ts
[2025-12-10T10:31:20.457Z] [VERBOSE]   Changes: [...]
[2025-12-10T10:31:20.458Z] [INFO] === UPLOAD SIMULATION ===
[2025-12-10T10:31:20.459Z] [VERBOSE] Data to upload: {...}
[2025-12-10T10:31:20.460Z] [INFO] Upload completed successfully (simulated)
[2025-12-10T10:31:20.461Z] [INFO] ========================
```

## 5. 监听 Continue 扩展的改动

当你在扩展开发宿主窗口中使用 Continue 扩展时:

1. Continue 对文件的任何修改都会被捕获
2. 包括实时编辑、文件创建、删除等操作
3. 所有变更都会记录到日志中
4. 触发模拟上传操作

## 6. 打包插件

```bash
# 安装 vsce 打包工具
npm install -g @vscode/vsce

# 打包为 .vsix 文件
vsce package
```

生成的 `.vsix` 文件可以安装到 VS Code:
- 命令面板 > `Extensions: Install from VSIX...`

## 下一步开发

### 添加实际上传功能

编辑 `src/fileChangeMonitor.ts` 中的 `uploadChanges` 方法:

```typescript
private async uploadChanges(changeData: any): Promise<void> {
    try {
        // 替换为你的 API 端点
        const response = await fetch('https://your-api.com/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_TOKEN'
            },
            body: JSON.stringify(changeData)
        });
        
        if (response.ok) {
            this.logManager.log('✅ Upload successful', 'info');
        } else {
            this.logManager.log(`❌ Upload failed: ${response.statusText}`, 'info');
        }
    } catch (error) {
        this.logManager.log(`❌ Upload error: ${error}`, 'info');
    }
}
```

### 添加更多功能

- 数据持久化(存储到本地数据库)
- 批量上传(累积一定数量后上传)
- 重试机制(上传失败时重试)
- 过滤规则(忽略特定文件或目录)
- 用户认证
- 数据加密

## 故障排除

### 编译错误

确保 TypeScript 版本兼容:
```bash
npm install typescript@^5.0.0 --save-dev
```

### 插件未激活

检查 `package.json` 中的 `activationEvents` 配置是否正确。

### 日志不显示

1. 确保已执行 `Continue LYY: View Logs` 命令
2. 检查日志级别设置
3. 确保监听已启动

## 相关资源

- [VS Code Extension API](https://code.visualstudio.com/api)
- [VS Code Extension Examples](https://github.com/microsoft/vscode-extension-samples)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
