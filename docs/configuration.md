# 配置参考

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `VISION_API_KEY` | ✅ | - | API 密钥 |
| `VISION_BASE_URL` | ❌ | `https://api.openai.com/v1` | OpenAI 兼容 API 地址 |
| `VISION_MODEL_NAME` | ❌ | `gpt-4o` | 模型名称 |
| `VISION_MAX_TOKENS` | ❌ | `1024` | 最大输出 token 数 |
| `VISION_MAX_IMAGE_SIZE` | ❌ | `20971520`（20MB） | 图片最大字节数 |
| `VISION_CACHE_ENABLED` | ❌ | `false` | 是否启用 SHA256 缓存 |
| `VISION_CACHE_DIR` | ❌ | 系统临时目录 | 缓存文件存放目录 |

## MCP 客户端配置示例

> 本 MCP 服务器使用 **stdio** 传输类型 —— 以子进程方式运行，通过 stdin/stdout 与 MCP 客户端通信。**不是** SSE 或 HTTP。

### Claude Code / Claude Desktop

```json
{
  "mcpServers": {
    "agent-vision": {
      "type": "stdio",
      "command": "node",
      "args": ["path/to/agent-vision-mcp/dist/index.js"],
      "env": {
        "VISION_API_KEY": "sk-your-api-key",
        "VISION_BASE_URL": "https://api.openai.com/v1",
        "VISION_MODEL_NAME": "gpt-4o",
        "VISION_MAX_TOKENS": "1024"
      }
    }
  }
}
```

或通过 npx：

```json
{
  "mcpServers": {
    "agent-vision": {
      "type": "stdio",
      "command": "npx",
      "args": ["agent-vision-mcp"],
      "env": {
        "VISION_API_KEY": "sk-your-api-key",
        "VISION_BASE_URL": "https://api.openai.com/v1",
        "VISION_MODEL_NAME": "gpt-4o"
      }
    }
  }
}
```

## 各供应商配置示例

### OpenAI

```json
{
  "env": {
    "VISION_API_KEY": "sk-proj-...",
    "VISION_BASE_URL": "https://api.openai.com/v1",
    "VISION_MODEL_NAME": "gpt-4o"
  }
}
```

### Gemini (OpenAI 兼容层)

```json
{
  "env": {
    "VISION_API_KEY": "AIza...",
    "VISION_BASE_URL": "https://generativelanguage.googleapis.com/v1beta/openai",
    "VISION_MODEL_NAME": "gemini-2.0-flash"
  }
}
```

### 阿里 Qwen-VL (DashScope)

```json
{
  "env": {
    "VISION_API_KEY": "sk-...",
    "VISION_BASE_URL": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "VISION_MODEL_NAME": "qwen-vl-max"
  }
}
```

### 自部署 vLLM

```json
{
  "env": {
    "VISION_API_KEY": "not-needed",
    "VISION_BASE_URL": "http://localhost:8000/v1",
    "VISION_MODEL_NAME": "Qwen2-VL-7B-Instruct"
  }
}
```

### 自部署 LiteLLM

```json
{
  "env": {
    "VISION_API_KEY": "sk-your-lite-llm-key",
    "VISION_BASE_URL": "http://localhost:4000/v1",
    "VISION_MODEL_NAME": "gemini-2.0-flash"
  }
}
```
