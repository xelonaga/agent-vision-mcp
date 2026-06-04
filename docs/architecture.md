# 架构说明

## 数据流

```
Claude Code / MCP 客户端
        │ stdio (JSON-RPC)
        ▼
┌───────────────────────────────┐
│  index.ts                     │
│  McpServer("agent-vision-mcp")│
│  └─ registerTool("analyze_image")
│      └─ handler               │
│          ├─ image-processor   │  ← 检测来源、校验、base64 编码
│          ├─ cache (可选)       │  ← SHA256 文件缓存
│          └─ vision-client     │  ← OpenAI 兼容 API 调用
└───────────────────────────────┘
```

**调用流程：**

1. 主模型通过 MCP 协议调用 `analyze_image`，传入 `image`（base64/URL/文件路径）和 `prompt`
2. `image-processor` 检测图片来源（data URL / HTTP 链接 / 本地文件），统一转为 base64 data URL
3. 如果启用缓存（`VISION_CACHE_ENABLED=true`），计算 SHA256 key 并尝试命中
4. `vision-client` 用 `openai` SDK 调用 `chat.completions.create`，发送 `image_url` + `text` 内容
5. 提取 `choices[0].message.content` 返回给主模型
6. 如果启用缓存，将结果存入文件缓存

## 项目结构

```
agent-vision-mcp/
├── CLAUDE.md                 # AI 助手速查
├── README.md                 # 用户文档
├── docs/                     # 开发文档
│   ├── architecture.md       # 本文件
│   ├── configuration.md      # 环境变量和供应商配置
│   └── development.md        # 开发命令和代码约定
├── package.json
├── tsconfig.json
├── .env.example
└── src/
    ├── index.ts              # 入口：McpServer + StdioServerTransport
    ├── config.ts             # 环境变量加载和校验
    ├── image-processor.ts    # 图片来源检测、读取、base64 编码
    ├── vision-client.ts      # OpenAI 兼容 API 客户端
    ├── cache.ts              # SHA256 文件缓存（可选）
    └── analyze-image.ts      # MCP 工具 Schema + Handler
```

## 关键设计决策

| 决策 | 理由 |
|------|------|
| 使用 `openai` npm 包而非裸 `fetch` | SDK 自带错误类型、重试和正确的 `image_url` 视觉内容格式 |
| 单一工具 | 不预设 describe/ocr/ui-review 等模式，LLM 自己撰写分析 prompt |
| 不做多供应商故障转移 | （与 unblind 不同）用户配置一个端点，保持简单 |
| 缓存默认关闭 | 按需开启，减少不必要的文件操作 |
| stdio 传输 | MCP 本地工具的标准方式 |
