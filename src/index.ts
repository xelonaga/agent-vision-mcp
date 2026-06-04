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
      title: "分析图片",
      description: `使用视觉 AI 模型分析图片内容——让不具备视觉能力的主模型也能"看见"图片。

【何时使用】当你收到用户发送的图片，或需要分析某张图片的内容时，请调用此工具。

【工作原理】此工具将图片发送给你预先配置的视觉 API（OpenAI 兼容接口），由视觉模型分析图片，然后返回文字描述给你。

【参数说明】
- image（字符串，必填）：要分析的图片。支持三种方式提供：
  * base64 data URL（如 data:image/png;base64,...）
  * HTTP/HTTPS 图片链接
  * 本地文件路径（绝对路径或相对于工作目录的路径）
  支持的格式：JPEG、PNG、WebP、GIF、BMP。
- prompt（字符串，必填）：告诉视觉模型你想获取什么信息。
  建议根据实际需求撰写具体的分析指令，例如：
  * "请详细描述这张图片中的所有内容"
  * "用 OCR 提取这张图片里的所有文字"
  * "这张 UI 截图里有哪些界面元素和按钮？"
  * "分析这张数据图表中的趋势和关键数据"

【错误排查】如果调用失败，请检查环境变量配置：
- VISION_API_KEY：视觉 API 的密钥是否有效
- VISION_BASE_URL：API 地址是否正确
- VISION_MODEL_NAME：模型名称是否支持视觉功能`,
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
