# agent-vision-mcp
为非视觉模型提供图片分析能力的 MCP 服务器。单一工具 `analyze_image`，调用用户配置的 OpenAI 兼容视觉 API。

**技术栈：** TypeScript + tsx + tsc + npm | Node >= 18
**核心依赖：** `@modelcontextprotocol/sdk` v1.x + `openai` v4.x + `zod` v3.x

## 命令
- `npm run dev` — tsx 运行源码
- `npm run build` — tsc 编译到 dist/
- `npm start` — node dist/index.js

## 架构
`index.ts` → McpServer + StdioServerTransport 注册 `analyze_image` 工具 → handler 串联 `image-processor`（图片来源检测/base64）→ `cache`（SHA256 文件缓存，默认关闭）→ `vision-client`（openai SDK 调用 chat.completions.create）

## 约定
- 日志只打 `console.error`（stderr），stdout 是 MCP 通道
- 注释/文档用中文，标识符用英文，关键字英文
- Zod `.strict()`，TS 严格模式
- 工具层捕获所有异常返回 `{ isError: true }`，不向上抛
- 详见 `docs/`
