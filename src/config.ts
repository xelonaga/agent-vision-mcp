/**
 * 配置模块 —— 加载和校验环境变量
 *
 * 从 process.env 读取所有配置项，校验必填项，应用默认值，
 * 最终导出一个冻结的只读配置对象。
 */

import os from "node:os";
import path from "node:path";

// 默认值常量
const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL_NAME = "gpt-4o";
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const DEFAULT_CACHE_ENABLED = false;

/** 应用配置类型 */
export interface AppConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly modelName: string;
  readonly maxTokens: number;
  readonly maxImageSize: number;
  readonly cacheEnabled: boolean;
  readonly cacheDir: string;
}

/**
 * 从环境变量加载配置
 * VISION_API_KEY 缺失时输出错误并退出进程
 */
export function loadConfig(): AppConfig {
  const apiKey = process.env["VISION_API_KEY"];
  if (!apiKey) {
    console.error("❌ 错误：环境变量 VISION_API_KEY 未设置。");
    console.error("   请在 MCP 客户端配置中设置 VISION_API_KEY 环境变量。");
    console.error("   例如：你的视觉 API 的 API Key（OpenAI、Gemini、MiniMax 等）。");
    process.exit(1);
  }

  const baseUrl = process.env["VISION_BASE_URL"] || DEFAULT_BASE_URL;
  const modelName = process.env["VISION_MODEL_NAME"] || DEFAULT_MODEL_NAME;
  const maxTokens = parseIntVar("VISION_MAX_TOKENS", DEFAULT_MAX_TOKENS);
  const maxImageSize = parseIntVar("VISION_MAX_IMAGE_SIZE", DEFAULT_MAX_IMAGE_SIZE);
  const cacheEnabled = process.env["VISION_CACHE_ENABLED"] === "true";
  const cacheDir = process.env["VISION_CACHE_DIR"] || getDefaultCacheDir();

  // 将配置摘要输出到 stderr（不会污染 MCP 的 stdout 通信通道）
  const maskedKey = apiKey.length > 3
    ? apiKey.slice(0, 3) + "***"
    : "***";
  console.error("=".repeat(50));
  console.error("agent-vision-mcp v0.1.0 已启动");
  console.error(`  模型:       ${modelName}`);
  console.error(`  API 地址:   ${baseUrl}`);
  console.error(`  API Key:    ${maskedKey}`);
  console.error(`  Max Tokens: ${maxTokens}`);
  console.error(`  图片上限:   ${formatBytes(maxImageSize)}`);
  console.error(`  缓存:       ${cacheEnabled ? `已启用 (${cacheDir})` : "已禁用"}`);
  console.error("=".repeat(50));

  // 冻结配置对象，防止运行时被意外修改
  return Object.freeze({
    apiKey,
    baseUrl,
    modelName,
    maxTokens,
    maxImageSize,
    cacheEnabled,
    cacheDir,
  });
}

/**
 * 解析整数型环境变量，无效时回退默认值
 */
function parseIntVar(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed) || parsed <= 0) {
    console.error(`⚠️  警告：${name}=${raw} 不是有效的正整数，使用默认值 ${defaultValue}`);
    return defaultValue;
  }
  return parsed;
}

/**
 * 获取默认缓存目录（系统临时目录下的子目录）
 */
function getDefaultCacheDir(): string {
  return path.join(os.tmpdir(), "agent-vision-cache");
}

/**
 * 将字节数格式化为人类可读的字符串
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
