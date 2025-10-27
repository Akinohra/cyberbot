# CyberBot Next - 基于 NapCat 的 QQ 机器人框架

<p align="center">
  <img src="logo.jpg" alt="CyberBot Logo" width="200">
</p>

<p align="center">
  一个基于 TypeScript 和 NapCat 的可扩展 QQ 机器人框架
</p> 

## 🌟 简介

CyberBot Next 是一个基于 TypeScript 和 [NapCat](https://github.com/HkTeamX/node-napcat-ts) 的现代化 QQ 机器人框架。该框架采用插件化架构，允许开发者轻松扩展机器人的功能，并提供了丰富的内置插件来满足日常需求。

### 特性

- 🧩 **插件化架构**: 模块化的插件系统，易于扩展和维护
- ⚡ **高性能**: 使用 TypeScript 和现代 JavaScript 引擎
- 📦 **丰富内置插件**: 包含命令、关键词回复、定时任务等多种实用插件
- 🛠️ **易开发**: 清晰的插件开发接口和文档
- 🔄 **热插拔**: 支持运行时动态加载和卸载插件
- 📝 **日志系统**: 集成 pino 日志系统，支持日志轮转
- 🕒 **定时任务**: 支持 cron 表达式的定时任务

## 🚀 快速开始

### 环境要求

- Node.js >= 18.x
- NapCat 服务端 (用于连接 QQ)

### 安装步骤

1. 克隆项目：
```bash
git clone https://github.com/Akinohra/cyberbot.git
cd cyberbot
```

2. 安装依赖：
```bash
npm install
```

3. 配置 NapCat 连接信息：
编辑 `cyberbot.json` 文件，修改以下字段：
```json
{
  "baseUrl": "ws://127.0.0.1:3001",  // NapCat WebSocket 地址
  "accessToken": "your-access-token", // 访问令牌
  "bot": 123456789,                   // 机器人 QQ 号
  "master": [987654321]               // 主人 QQ 号
}
```

4. 启动机器人( 若是windows系统请先运行`chcp 65001`解决控制台中文乱码问题)：
```bash
# 下载依赖
npm i
# 开发模式
npm run dev
# 生产模式
npm run build
npm run start
```

> Tips：build完成后可以将dist单独拿出来使用，需将package.json放入dist目录，执行npm i、node app.js即可。

## 🧩 插件系统

CyberBot Next 提供了强大的插件系统，支持多种类型的插件：

| 插件名称 | 功能描述 |
|---------|----------|
| cmds | 机器人控制命令插件(系统) |
| keyword | 关键词回复插件 |
| like | 点赞插件 |
| manage | 微群管插件 |
| verification | 入群验证插件 |

### 开发新插件（可参照demo插件编写）

1. 在 `plugins/` 目录下创建新的插件文件夹
2. 在插件文件夹内创建 `index.ts` 文件
3. 实现插件逻辑：

```typescript
import { type Plugin } from "../../core/index.js";

const plugin: Plugin = {
  name: 'your-plugin-name',
  version: '1.0.0',
  description: 'Your plugin description',
  
  onLoad: async () => {
    // 插件加载时执行
    console.log('Plugin loaded');
  },
  
  onUnload: async () => {
    // 插件卸载时执行
    console.log('Plugin unloaded');
  },
  
  handlers: {
    message: async (context) => {
      // 处理消息事件
    },
    
    notice: async (context) => {
      // 处理通知事件
    },
    
    request: async (context) => {
      // 处理请求事件
    }
  }
};

export default plugin;
```

## 📁 项目结构

```
cyberbot/
├── core/                 # 核心模块
│   ├── event.ts          # 事件处理
│   ├── index.ts          # 核心导出
│   ├── logger.ts         # 日志系统
│   └── pluginManager.ts  # 插件管理器
├── plugins/              # 插件目录
│   ├── cmds/             # 命令插件
│   ├── keyword/          # 关键词插件
│   └── ...               # 更多插件
├── app.ts                # 应用入口
├── cyberbot.json         # 配置文件
└── package.json          # 项目依赖
```

## ⚙️ 配置说明

主要配置项位于 `cyberbot.json` 文件中：

```json
{
  "baseUrl": "ws://127.0.0.1:3001",  // NapCat WebSocket 地址
  "accessToken": "123456",            // 访问令牌
  "throwPromise": false,              // 是否在 socket.error 时抛出错误
  "reconnection": {                   // 自动重连配置
    "enable": true,
    "attempts": 10,
    "delay": 5000
  },
  "debug": false,                     // 是否开启调试模式
  "bot": 12345678,                  // 机器人 QQ 号
  "master": [10000001],             // 主人 QQ 号列表
  "admins": [10000001],             // 管理员 QQ 号列表
  "plugins": {                        // 插件配置
    "system": ["cmds"],               // 系统插件
    "user": []                        // 用户插件
  }
}
```

## 🛠️ 开发指南

### 本地开发

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 开发时为方便调试看日志可以将 cyberbot.json 文件中 loginfo里的 isProduction: true 字段设置为 false, log控制台会有颜色方便查看，生产环境推荐保持为true

```

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ES Module 语法
- 使用 Pino 进行日志记录
- 插件应具有清晰的生命周期管理

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进 CyberBot Next！

## 📄 许可证

本项目采用 MIT 许可证，详情请见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- 感谢 [NapCat](https://github.com/HkTeamX/node-napcat-ts) 提供的 QQ 协议支持
- 感谢 [node-napcat-ts](https://github.com/HkTeamX/node-napcat-ts) 提供的 TypeScript SDK
- 参考了 kivibot 项目的设计理念

---

Made with ❤️ by 星火

