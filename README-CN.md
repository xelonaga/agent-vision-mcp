# agent-vision-mcp

<div align="center">

[English](./README.md) | **中文**

</div>

> 🖼️ 为非视觉 AI 模型提供图片分析能力的 MCP 服务器

[![npm version](https://img.shields.io/npm/v/agent-vision-mcp)](https://www.npmjs.com/package/agent-vision-mcp)
[![license](https://img.shields.io/npm/l/agent-vision-mcp)](./LICENSE)

## 这是什么？

很多用户给 Claude Code 等编程助手接入了 **DeepSeek v4** 等不具备视觉能力的模型。这样一来，当你在对话中发送图片时，主模型无法理解图片内容。

**agent-vision-mcp** 解决了这个问题：它是一个 MCP（Model Context Protocol）服务器，允许你自行配置一个 **OpenAI 兼容的视觉 API**（比如 Gemini Flash、阿里 Qwen-VL、OpenAI、或者你自己部署的视觉模型），当主模型遇到图片时，自动调用这个工具来获取图片的文字分析结果。

简单说：**让你的文字模型"长出眼睛"。**

## 效果演示

```
你：请分析这张截图中的错误信息 [上传 screenshot.png]
    ↓
Claude Code (DeepSeek v4) 发现用户发来图片，但自己无法理解
    ↓
Claude Code 调用 MCP 工具：analyze_image(image="screenshot.png", prompt="读取截图中的错误信息")
    ↓
agent-vision-mcp 把图片发给你配置的视觉 API（比如 Gemini Flash）
    ↓
视觉模型返回："截图显示的是终端输出，有一个 TypeError: Cannot read property 'map' of undefined 错误，出现在 src/app.ts 第 42 行..."
    ↓
Claude Code 收到文字描述，回复你："你的代码在 src/app.ts:42 处有一个 TypeError..."
```

## 快速开始

### 1. 安装

```bash
npm install -g agent-vision-mcp
```

### 2. 准备一个视觉 API

你需要有一个 OpenAI 兼容的视觉 API。以下是几种常见选择：

| 供应商 | 费用 | 配置 |
|--------|------|------|
| **Gemini Flash** | 便宜（有免费额度） | 需获取 API key，配置 OpenAI 兼容端点 |
| **阿里 Qwen-VL** | 按量付费 | DashScope 平台获取 API key |
| **OpenAI** | 较贵 | 直接使用 `https://api.openai.com/v1` |
| **自部署 vLLM/LiteLLM** | 取决于硬件 | 本地运行，无需外部费用 |

### 3. 配置 MCP 客户端

> **传输类型：stdio** —— 本 MCP 服务器以子进程方式运行，通过标准输入输出（stdin/stdout）与客户端进行 JSON-RPC 通信。

在你的 Claude Code / Claude Desktop 的 MCP 配置中添加：

```json
{
  "mcpServers": {
    "agent-vision": {
      "type": "stdio",
      "command": "npx",
      "args": ["agent-vision-mcp"],
      "env": {
        "VISION_API_KEY": "你的 API 密钥",
        "VISION_BASE_URL": "https://api.openai.com/v1",
        "VISION_MODEL_NAME": "gpt-4o"
      }
    }
  }
}
```

### 4. 使用

配置完成后，直接在对话中发送图片即可。主模型会自动调用 `analyze_image` 工具来分析图片。

## 配置参考

### 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `VISION_API_KEY` | ✅ 是 | - | 视觉 API 的密钥 |
| `VISION_BASE_URL` | 否 | `https://api.openai.com/v1` | OpenAI 兼容 API 地址 |
| `VISION_MODEL_NAME` | 否 | `gpt-4o` | 模型名称 |
| `VISION_MAX_TOKENS` | 否 | `1024` | 最大输出 token 数 |
| `VISION_MAX_IMAGE_SIZE` | 否 | `20971520`（20MB） | 图片最大字节数 |
| `VISION_CACHE_ENABLED` | 否 | `false` | 是否启用缓存（避免重复分析同一图片） |
| `VISION_CACHE_DIR` | 否 | 系统临时目录 | 缓存文件存放目录 |

### 各供应商配置示例

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

#### Gemini (via OpenAI 兼容层)

```json
{
  "env": {
    "VISION_API_KEY": "AIza...",
    "VISION_BASE_URL": "https://generativelanguage.googleapis.com/v1beta/openai",
    "VISION_MODEL_NAME": "gemini-2.0-flash"
  }
}
```

#### 阿里 Qwen-VL (DashScope)

```json
{
  "env": {
    "VISION_API_KEY": "sk-...",
    "VISION_BASE_URL": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "VISION_MODEL_NAME": "qwen-vl-max"
  }
}
```

#### 自部署 vLLM

```json
{
  "env": {
    "VISION_API_KEY": "not-needed",
    "VISION_BASE_URL": "http://localhost:8000/v1",
    "VISION_MODEL_NAME": "Qwen2-VL-7B-Instruct"
  }
}
```

#### 自部署 LiteLLM（聚合代理）

```json
{
  "env": {
    "VISION_API_KEY": "sk-your-lite-llm-key",
    "VISION_BASE_URL": "http://localhost:4000/v1",
    "VISION_MODEL_NAME": "gemini-2.0-flash"
  }
}
```

> **提示：** LiteLLM 是一个很好的方案——它把各种视觉 API 都转成 OpenAI 兼容格式，你可以用它来聚合多个供应商。

## 工具：analyze_image

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `image` | string | 是 | 图片。支持：base64 data URL、HTTP/HTTPS 链接、本地文件路径。格式：JPEG、PNG、WebP、GIF、BMP |
| `prompt` | string | 是 | 分析指令。告诉视觉模型你想获取什么信息 |

### prompt 示例

- `"详细描述这张图片中的所有内容"`
- `"提取图片中所有可见的文字（OCR）"`
- `"这张 UI 设计稿中有哪些界面元素和交互组件？"`
- `"分析这张数据图表中的趋势和关键数据点"`
- `"读取终端输出截图中的错误信息"`
- `"这张照片中有哪些物体？它们的位置关系是怎样的？"`

## 缓存功能

启用缓存后，相同的图片+提示词组合不会被重复发送到视觉 API，而是直接返回之前缓存的结果。

```json
{
  "env": {
    "VISION_CACHE_ENABLED": "true",
    "VISION_CACHE_DIR": "/tmp/my-vision-cache"
  }
}
```

- 缓存 TTL：1 小时
- 缓存 Key：`SHA256(图片数据 + "::" + prompt)`
- 存储：每个缓存条目一个 JSON 文件

## 开发

```bash
# 克隆项目
git clone https://github.com/yourusername/agent-vision-mcp.git
cd agent-vision-mcp

# 安装依赖
npm install

# 开发模式（tsx 直接运行 TypeScript）
npm run dev

# 编译
npm run build

# 运行编译产物
npm start
```

### 技术栈

- TypeScript（严格模式）
- `@modelcontextprotocol/sdk` v1.x（MCP 框架）
- `openai` v4.x（OpenAI 兼容 API 客户端）
- `zod` v3.x（参数校验）

## 故障排查

### 启动报错 "VISION_API_KEY 未设置"

在 MCP 客户端配置中确保设置了 `VISION_API_KEY` 环境变量。

### 工具调用返回 "API 密钥无效（401）"

检查 API key 是否正确，以及是否有权限访问指定的模型。key 不要有多余的空格或引号。

### 工具调用返回 "API 端点或模型不存在（404）"

检查 `VISION_BASE_URL` 和 `VISION_MODEL_NAME` 是否正确。注意 `VISION_BASE_URL` 通常以 `/v1` 结尾。

### 工具调用返回 "请求被限流（429）"

免费额度的 API 通常有频率限制。等待片刻后重试，或考虑启用缓存减少重复请求。

### 返回 "不支持的图片格式"

当前支持 JPEG、PNG、WebP、GIF、BMP 格式。将图片转换为这些格式后再试。

## License

MIT
