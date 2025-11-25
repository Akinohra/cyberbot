# Repository Guidelines（仓库指南）

## 项目结构与模块组织
- src/：主源码目录。
- 	ests/：自动化测试文件。
- ssets/：静态资源存放目录。
- scripts/：开发辅助脚本。

## 构建、测试与开发命令
- 
pm install：安装项目依赖。
- 
pm run dev：启动本地开发环境。
- 
pm run build：生成生产环境构建产物。
- 
pm test：运行测试套件。

## 代码风格与命名规范
- 使用 2 空格缩进。
- 遵循 ESLint/Prettier 规则（运行 
pm run lint）。
- 变量/函数使用 camelCase，类名使用 PascalCase。
- 文件名使用 kebab-case。

## 测试指南
- 使用 Jest 进行测试。
- 测试文件命名为 *.test.js，放在 	ests/ 目录下。
- 新增功能应提供相应测试覆盖。

## Commit 与 Pull Request 规范
- 遵循 Conventional Commits，例如：eat:、ix:、docs: 等。
- PR 应包含变更摘要、关联 Issue，以及 UI 相关更改的截图（如适用）。
- 保持 PR 小而聚焦，避免一次性提交过多变更。

## 安全与配置建议
- 机密信息应存放在环境变量（.env）中，不应提交到仓库。
- 定期执行 
pm audit 检查安全风险。

## Agent 使用说明
- 修改文件时需遵循 AGENTS.md 内的规则。
- 优先进行最小化、目标明确的变更。
