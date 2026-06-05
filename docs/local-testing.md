# 本地测试指南

发布到 npm 之前，你可以在本地完成全链路测试。

> **传输类型：stdio** —— 本 MCP 以子进程方式运行，通过 stdin/stdout 与客户端通信。**不是** SSE 或 HTTP。

## 方式一：直接路径引用（最简单）

在 Claude Code 的 MCP 配置中直接指向 `dist/index.js`：

```json
{
  "mcpServers": {
    "agent-vision": {
      "type": "stdio",
      "command": "node",
      "args": ["D:/code/opensource/my-vision-mcp/agent-vision-mcp/dist/index.js"],
      "env": {
        "VISION_API_KEY": "你的密钥",
        "VISION_BASE_URL": "https://api.openai.com/v1",
        "VISION_MODEL_NAME": "gpt-4o"
      }
    }
  }
}
```

每次修改源码后，先 `npm run build`，然后重新加载 MCP 即可。

## 方式二：npm link（模拟全局安装）

```bash
cd D:/code/opensource/my-vision-mcp/agent-vision-mcp
npm link
```

这会创建一个全局符号链接，之后可以用 `agent-vision-mcp` 命令直接启动。然后在 MCP 配置中使用：

```json
{
  "mcpServers": {
    "agent-vision": {
      "type": "stdio",
      "command": "agent-vision-mcp",
      "env": {
        "VISION_API_KEY": "你的密钥",
        "VISION_BASE_URL": "https://api.openai.com/v1",
        "VISION_MODEL_NAME": "gpt-4o"
      }
    }
  }
}
```

解除 link：

```bash
npm unlink -g agent-vision-mcp
```

## 方式三：npx + tsx 直接跑源码（开发调试）

```json
{
  "mcpServers": {
    "agent-vision": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "D:/code/opensource/my-vision-mcp/agent-vision-mcp/src/index.ts"],
      "env": {
        "VISION_API_KEY": "你的密钥",
        "VISION_BASE_URL": "https://api.openai.com/v1",
        "VISION_MODEL_NAME": "gpt-4o"
      }
    }
  }
}
```

> 优势：跳过 `npm run build`，直接运行 TypeScript 源码，适合开发期快速迭代。

## 使用 MCP Inspector 调试

MCP Inspector 是官方提供的调试工具，可以直观地查看工具列表、发送测试请求、查看返回结果：

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

启动后会打开一个网页，你可以：
1. 查看已注册的工具（应该只有 `analyze_image`）
2. 手动填入 `image` 和 `prompt` 参数
3. 点击调用，查看视觉 API 返回的文字结果

**注意事项：**
- Inspector 会继承当前终端的环境变量，所以需要提前设好 `VISION_API_KEY`
- Windows 上可用 `set VISION_API_KEY=sk-xxx`，Linux/Mac 用 `export`

## 快速冒烟测试

先在终端中确认服务器能正常启动：

```bash
# 设一个假 key，验证不会因为缺 key 而崩溃
set VISION_API_KEY=test-key && node dist/index.js
```

预期输出（服务器卡在 stdio 等待状态，这是正常的——它正在等待 MCP 客户端连接）：

```
==================================================
agent-vision-mcp v0.1.0 已启动
  模型:       gpt-4o
  API 地址:   https://api.openai.com/v1
  API Key:    tes***
  Max Tokens: 1024
  图片上限:   20.0 MB
  缓存:       已禁用
==================================================
```

按 Ctrl+C 退出。然后配上一个真实的视觉 API key，在 Claude Code 里发一张图片试试。

## 修改源码后的操作

1. 修改 `.ts` 文件
2. `npm run build`
3. 在 Claude Code 中执行 `/mcp reload agent-vision`（或重启对话）
4. 再次发送图片测试

## 为什么是 stdio？

因为在 `src/index.ts` 中使用了 `StdioServerTransport`：

```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// ...
const transport = new StdioServerTransport();
await server.connect(transport);
```

如果你想把 MCP 部署为远程 HTTP 服务（多个客户端共享），可以把 `StdioServerTransport` 替换为 `StreamableHTTPServerTransport`，并添加 express 等 web 框架。但作为本地工具，stdio 是最简单高效的方式。
