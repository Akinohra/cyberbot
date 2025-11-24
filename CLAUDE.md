# CLAUDE.md

该文件为 Claude Code (claude.ai/code) 在本仓库中工作时提供指导。

## 常用命令

```bash
# 安装依赖
npm install

# 使用 tsx 的开发模式
npm run dev

# 将 TypeScript 编译为 JavaScript
npm run build

# 生产模式启动（编译后）
npm run start

# 测试（当前未实现）
npm run test
```

## 高层架构

CyberBot Next 是一个基于 TypeScript 和 NapCatQQ 构建的 QQ 机器人框架，采用插件式架构：

### 核心组件

1. **应用入口**: `app.ts`
   - 初始化 NapCat 连接
   - 加载配置
   - 启动插件管理器

2. **核心模块**: `core/`
   - `index.ts`: 主要导出项，包括 NapCat 实例、pluginManager 和事件系统
   - `event.ts`: QQ 消息、通知和请求的事件处理系统
   - `pluginManager.ts`: 插件生命周期管理（加载、卸载、重载）
   - `logger.ts`: 基于 Pino 的日志系统，支持日志轮转

3. **插件系统**: `plugins/`
   - 每个插件是 `plugins/` 目录下的一个文件夹，包含 `index.ts` 入口文件
   - 插件必须实现 `pluginManager.ts` 中定义的 `Plugin` 接口
   - 支持事件处理器、onLoad/onUnload 生命周期钩子和定时任务
   - 包括系统插件（无法卸载）和用户插件

4. **配置文件**: `cyberbot.json`
   - NapCat 连接设置 (baseUrl, accessToken)
   - 机器人和主人/管理员 QQ 号码
   - 插件配置 (系统/用户插件)
   - 日志设置

### 插件开发

插件可以处理三种主要事件类型：
- `message`: QQ 消息
- `notice`: 通知 (好友/群组变化等)
- `request`: 请求 (好友/群组邀请等)

插件还可以使用 `crons` 字段注册定时任务。

## 关键文件

- `app.ts`: 入口文件
- `core/pluginManager.ts`: 插件架构定义
- `cyberbot.json`: 配置文件
- `README.md`: 完整文档，包括插件开发指南

## 插件示例

一个最小化的插件：

```typescript
import { type Plugin } from "../../core/index.js";

const plugin: Plugin = {
  name: 'your-plugin-name',
  version: '1.0.0',
  description: 'Your plugin description',

  handlers: {
    message: async (context) => {
      // 处理消息
    }
  }
};

export default plugin;
```

