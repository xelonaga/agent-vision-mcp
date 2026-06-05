# agent-vision-mcp

<div align="center">

**English** | [中文](./README-CN.md)

</div>

> 🖼️ An MCP server that gives non-vision AI models the ability to analyze images

[![npm version](https://img.shields.io/npm/v/agent-vision-mcp)](https://www.npmjs.com/package/agent-vision-mcp)
[![license](https://img.shields.io/npm/l/agent-vision-mcp)](./LICENSE)

## What is this?

Many users connect coding assistants like Claude Code to text-only models such as **DeepSeek v4** that have no vision capability. As a result, when you send an image in a conversation, the main model can't understand its content.

**agent-vision-mcp** solves this: it's an MCP (Model Context Protocol) server that lets you configure any **OpenAI-compatible vision API** (e.g. Gemini Flash, Alibaba Qwen-VL, OpenAI, or your own self-hosted vision model). When the main model encounters an image, it automatically calls this tool to get a text analysis of the image.

In short: **give your text model eyes.**

## How it works

```
You: Please analyze the error in this screenshot [uploads screenshot.png]
    ↓
Claude Code (DeepSeek v4) sees an image but can't understand it
    ↓
Claude Code calls the MCP tool: analyze_image(image="screenshot.png", prompt="Read the error in the screenshot")
    ↓
agent-vision-mcp sends the image to your configured vision API (e.g. Gemini Flash)
    ↓
The vision model returns: "The screenshot shows terminal output with a TypeError: Cannot read property 'map' of undefined error at src/app.ts line 42..."
    ↓
Claude Code receives the text description and replies: "Your code has a TypeError at src/app.ts:42..."
```

## Quick start

### 1. Install

```bash
npm install -g agent-vision-mcp
```

### 2. Prepare a vision API

You need an OpenAI-compatible vision API. Here are some common options:

| Provider | Cost | Configuration |
|----------|------|---------------|
| **Gemini Flash** | Cheap (free tier available) | Get an API key, use the OpenAI-compatible endpoint |
| **Alibaba Qwen-VL** | Pay-as-you-go | Get an API key from the DashScope platform |
| **OpenAI** | More expensive | Use `https://api.openai.com/v1` directly |
| **Self-hosted vLLM/LiteLLM** | Depends on hardware | Runs locally, no external cost |

### 3. Configure the MCP client

> **Transport: stdio** — This MCP server runs as a child process and communicates with the client via standard input/output (stdin/stdout) using JSON-RPC.

Add the following to your Claude Code / Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "agent-vision": {
      "type": "stdio",
      "command": "npx",
      "args": ["agent-vision-mcp"],
      "env": {
        "VISION_API_KEY": "your-api-key",
        "VISION_BASE_URL": "https://api.openai.com/v1",
        "VISION_MODEL_NAME": "gpt-4o"
      }
    }
  }
}
```

### 4. Use it

Once configured, just send an image in the conversation. The main model will automatically call the `analyze_image` tool to analyze it.

## Configuration reference

### Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VISION_API_KEY` | ✅ Yes | - | The vision API key |
| `VISION_BASE_URL` | No | `https://api.openai.com/v1` | OpenAI-compatible API endpoint |
| `VISION_MODEL_NAME` | No | `gpt-4o` | Model name |
| `VISION_MAX_TOKENS` | No | `1024` | Max output tokens |
| `VISION_MAX_IMAGE_SIZE` | No | `20971520` (20MB) | Max image size in bytes |
| `VISION_CACHE_ENABLED` | No | `false` | Enable caching (avoid re-analyzing the same image) |
| `VISION_CACHE_DIR` | No | System temp dir | Directory for cache files |

### Per-provider configuration examples

#### OpenAI

```json
{
  "env": {
    "VISION_API_KEY": "sk-proj-...",
    "VISION_BASE_URL": "https://api.openai.com/v1",
    "VISION_MODEL_NAME": "gpt-4o"
  }
}
```

#### Gemini (via OpenAI-compatible layer)

```json
{
  "env": {
    "VISION_API_KEY": "AIza...",
    "VISION_BASE_URL": "https://generativelanguage.googleapis.com/v1beta/openai",
    "VISION_MODEL_NAME": "gemini-2.0-flash"
  }
}
```

#### Alibaba Qwen-VL (DashScope)

```json
{
  "env": {
    "VISION_API_KEY": "sk-...",
    "VISION_BASE_URL": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "VISION_MODEL_NAME": "qwen-vl-max"
  }
}
```

#### Self-hosted vLLM

```json
{
  "env": {
    "VISION_API_KEY": "not-needed",
    "VISION_BASE_URL": "http://localhost:8000/v1",
    "VISION_MODEL_NAME": "Qwen2-VL-7B-Instruct"
  }
}
```

#### Self-hosted LiteLLM (aggregating proxy)

```json
{
  "env": {
    "VISION_API_KEY": "sk-your-lite-llm-key",
    "VISION_BASE_URL": "http://localhost:4000/v1",
    "VISION_MODEL_NAME": "gemini-2.0-flash"
  }
}
```

> **Tip:** LiteLLM is a great option — it converts various vision APIs into the OpenAI-compatible format, so you can use it to aggregate multiple providers.

## Tool: analyze_image

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `image` | string | Yes | The image. Accepts: base64 data URL, HTTP/HTTPS link, local file path. Formats: JPEG, PNG, WebP, GIF, BMP |
| `prompt` | string | Yes | The analysis instruction. Tells the vision model what information you want |

### prompt examples

- `"Describe everything in this image in detail"`
- `"Extract all visible text in the image (OCR)"`
- `"What UI elements and interactive components are in this design mockup?"`
- `"Analyze the trends and key data points in this chart"`
- `"Read the error message in this terminal output screenshot"`
- `"What objects are in this photo, and how are they positioned relative to each other?"`

## Caching

When caching is enabled, the same image + prompt combination won't be re-sent to the vision API; the previously cached result is returned directly.

```json
{
  "env": {
    "VISION_CACHE_ENABLED": "true",
    "VISION_CACHE_DIR": "/tmp/my-vision-cache"
  }
}
```

- Cache TTL: 1 hour
- Cache key: `SHA256(image data + "::" + prompt)`
- Storage: one JSON file per cache entry

## Development

```bash
# Clone the project
git clone https://github.com/yourusername/agent-vision-mcp.git
cd agent-vision-mcp

# Install dependencies
npm install

# Dev mode (run TypeScript directly with tsx)
npm run dev

# Build
npm run build

# Run the build output
npm start
```

### Tech stack

- TypeScript (strict mode)
- `@modelcontextprotocol/sdk` v1.x (MCP framework)
- `openai` v4.x (OpenAI-compatible API client)
- `zod` v3.x (parameter validation)

## Troubleshooting

### Startup error "VISION_API_KEY 未设置"

Make sure the `VISION_API_KEY` environment variable is set in your MCP client configuration.

### Tool call returns "API 密钥无效（401）"

Check that the API key is correct and has permission to access the specified model. Make sure there are no extra spaces or quotes in the key.

### Tool call returns "API 端点或模型不存在（404）"

Check that `VISION_BASE_URL` and `VISION_MODEL_NAME` are correct. Note that `VISION_BASE_URL` usually ends with `/v1`.

### Tool call returns "请求被限流（429）"

Free-tier APIs usually have rate limits. Wait a moment and retry, or consider enabling caching to reduce duplicate requests.

### Returns "不支持的图片格式"

Currently JPEG, PNG, WebP, GIF, and BMP are supported. Convert the image to one of these formats and try again.

## License

MIT
