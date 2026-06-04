# 开发指南

## 命令

```bash
npm install        # 安装依赖
npm run dev        # tsx 直接运行 TypeScript
npm run build      # tsc 编译到 dist/
npm start          # node dist/index.js
npm run clean      # 删除 dist/
```

## 技术依赖

| 包 | 版本 | 用途 |
|---|------|------|
| `@modelcontextprotocol/sdk` | ^1.6 | MCP 服务器框架（v1.x 稳定版，生产推荐） |
| `openai` | ^4.73 | OpenAI 兼容的聊天补全 API |
| `zod` | ^3.23 | 工具参数运行时校验 |
| `typescript` | ^5.7 (dev) | tsc 编译器 |
| `tsx` | ^4.19 (dev) | 开发时直接运行 TS |
| `@types/node` | ^22.10 (dev) | Node.js 类型 |

> v2 SDK（`@modelcontextprotocol/server`）目前为 pre-alpha，稳定版预计 2026 年 7 月。本项���使用 v1.x。

## 代码约定

- **注释和文档使用中文**——目标用户是中文开发者
- **标识符使用英文**——变量名、函数名、类型名
- **关键字保持英文**——`const`、`async`、`return` 等
- **所有日志输出到 stderr**——`console.error()`，因为 stdout 是 MCP JSON-RPC 通信通道
- **TypeScript 严格模式**——`tsconfig.json` 中 `"strict": true`
- **Zod schema 使用 `.strict()`**——禁止额外字段
- **工具层捕获所有异常**——返回 `{ isError: true, content: [...] }`，绝不向上抛出
- **配置对象冻结**——`Object.freeze()`，防止运行时修改

## 模块说明

| 文件 | 功能 | 外部依赖 |
|------|------|----------|
| `config.ts` | 环境变量加载、校验、冻结导出 | `node:os`, `node:path` |
| `cache.ts` | SHA256 文件缓存，1 小时 TTL | `node:crypto`, `node:fs/promises` |
| `image-processor.ts` | 图片来源检测、fetch 下载/fs 读取、base64 编码 | `node:fs/promises`, `node:path` |
| `vision-client.ts` | `openai` SDK 封装，视觉聊天补全，中文错误映射 | `openai` |
| `analyze-image.ts` | Zod schema + handler 工厂，串联处理流程 | `zod` + 上述全部 |
| `index.ts` | MCP 服务器入口，工具注册，stdio 传输 | `@modelcontextprotocol/sdk` |

## 常见视觉 API 兼容性

任何提供 `/v1/chat/completions` 端点并支持 `image_url` 内容格式的 API 均可使用。`image_url` 格式是 OpenAI Chat Completions 视觉扩展的事实标准，大多数视觉模型供应商都支持。
