#!/usr/bin/env node
/**
 * agent-vision-mcp 入口模块
 *
 * 一个极简的 MCP 服务器，为非视觉模型提供图片分析能力。
 * 用户可自行配置任意 OpenAI 兼容的视觉 API（OpenAI、Gemini、MiniMax、Qwen 等）。
 *
 * 启动方式：
 *   node dist/index.js    （编译后）
 *   tsx src/index.ts      （开发模式）
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import {
  analyzeImageInputSchema,
  createAnalyzeImageHandler,
} from "./analyze-image.js";

async function main() {
  // 加载并校验配置（API key 缺失时 process.exit(1)）
  const config = loadConfig();

  // 创建 MCP 服务器实例
  const server = new McpServer({
    name: "agent-vision-mcp",
    version: "0.1.0",
  });

  // 注册 analyze_image 工具
  server.registerTool(
    "analyze_image",
    {
      title: "Analyze Image",
      description: `Analyze an image with a vision AI model, giving a non-vision main model the ability to "see" image content.
Call this when the user sends an image, or when you need to understand an image (describe it, OCR text, identify UI elements, read charts, etc.).
The image can be provided as a base64 data URL, an HTTP(S) link, or a local file path.`,
      inputSchema: analyzeImageInputSchema,
      annotations: {
        readOnlyHint: true,    // 仅读取数据，不修改任何环境
        destructiveHint: false, // 不执行破坏性操作
        idempotentHint: true,   // 相同参数重复调用结果一致
      },
    },
    createAnalyzeImageHandler(config),
  );

  // 使用 stdio 传输（标准输入输出）连接 MCP 客户端
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // 注：所有日志已通过 config.ts 和 handler 输出到 stderr
  // stdout 仅用于 MCP JSON-RPC 通信，绝不污染
}

main().catch((err) => {
  console.error("agent-vision-mcp 启动失败:", err.message);
  process.exit(1);
});
