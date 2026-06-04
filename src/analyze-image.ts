/**
 * 工具定义模块 —— analyze_image 工具的 Zod Schema 和处理函数
 *
 * 这是 MCP 工具的核心：定义输入参数 schema，
 * 并实现处理函数，串联图片处理 → 缓存 → 视觉 API 的完整流程。
 */

import { z } from "zod";
import type { AppConfig } from "./config.js";
import { processImage, ImageProcessError } from "./image-processor.js";
import { computeCacheKey, getCachedResult, setCachedResult } from "./cache.js";
import { analyzeImage as callVisionAPI, VisionAPIError } from "./vision-client.js";

/** analyze_image 工具的输入参数 Schema */
export const analyzeImageInputSchema = z.object({
  image: z.string()
    .min(1, "必须提供图片")
    .describe(
      "要分析的图片。支持三种格式：" +
      "① base64 data URL（data:image/...），" +
      "② HTTP/HTTPS 链接，" +
      "③ 本地文件路径（绝对路径或相对路径均可）。" +
      "支持的图片格式：JPEG、PNG、WebP、GIF、BMP。"
    ),
  prompt: z.string()
    .min(1, "必须提供分析指令")
    .describe(
      "描述你想从图片中分析或提取什么内容。" +
      "例如：'详细描述这张图片的内容'、" +
      "'提取图片中所有可见的文字（OCR）'、" +
      "'这张截图中有哪些 UI 元素？'、" +
      "'分析这张图表中的数据和趋势'、" +
      "'读取终端输出截图中的错误信息'。"
    ),
}).strict();

/** 从 Zod Schema 推导 TypeScript 类型 */
export type AnalyzeImageInput = z.infer<typeof analyzeImageInputSchema>;

/**
 * 创建 analyze_image 工具的处理函数
 *
 * 使用工厂函数模式，将配置注入 handler 闭包中。
 * handler 内部串联：图片处理 → 可选缓存查/存 → 视觉 API 调用
 */
export function createAnalyzeImageHandler(config: AppConfig) {
  return async (params: AnalyzeImageInput) => {
    try {
      // 1. 处理图片输入，统一转为 base64 data URL
      console.error(`[analyze_image] 处理图片输入...`);
      const { dataUrl, mimeType } = await processImage(
        params.image,
        config.maxImageSize,
      );
      console.error(`[analyze_image] 图片处理完成 (${mimeType})`);

      // 2. 如果启用了缓存，尝试命中缓存
      if (config.cacheEnabled) {
        const cacheKey = computeCacheKey(dataUrl, params.prompt);
        const cached = await getCachedResult(cacheKey, config.cacheDir);
        if (cached !== null) {
          console.error(`[analyze_image] ✅ 缓存命中，直接返回`);
          return {
            content: [{ type: "text" as const, text: cached }],
          };
        }

        // 3. 调用视觉 API
        console.error(`[analyze_image] 调用视觉 API...`);
        const startTime = Date.now();
        const result = await callVisionAPI(
          dataUrl,
          params.prompt,
          mimeType,
          {
            apiKey: config.apiKey,
            baseUrl: config.baseUrl,
            model: config.modelName,
            maxTokens: config.maxTokens,
          },
        );
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(`[analyze_image] API 调用完成，耗时 ${elapsed}s`);

        // 4. 写入缓存
        await setCachedResult(cacheKey, result, config.cacheDir);
        console.error(`[analyze_image] 结果已缓存`);

        return {
          content: [{ type: "text" as const, text: result }],
        };
      }

      // 未启用缓存：直接调用视觉 API
      console.error(`[analyze_image] 调用视觉 API...`);
      const startTime = Date.now();
      const result = await callVisionAPI(
        dataUrl,
        params.prompt,
        mimeType,
        {
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          model: config.modelName,
          maxTokens: config.maxTokens,
        },
      );
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(`[analyze_image] API 调用完成，耗时 ${elapsed}s`);

      return {
        content: [{ type: "text" as const, text: result }],
      };
    } catch (error) {
      // 所有异常都捕获并返回友好错误消息，绝不向上层抛出
      return formatErrorResponse(error);
    }
  };
}

/**
 * 将各类异常格式化为 MCP 工具的错误返回
 */
function formatErrorResponse(error: unknown): {
  isError: true;
  content: Array<{ type: "text"; text: string }>;
} {
  if (error instanceof ImageProcessError) {
    const messages: Record<string, string> = {
      INVALID_DATA_URL: "图片格式无效：data URL 必须以 data:image/ 开头",
      FILE_NOT_FOUND: "找不到图片文件，请检查路径是否正确",
      FILE_EMPTY: "图片文件为空",
      FILE_TOO_LARGE: "图片文件过大，请压缩后再试",
      UNSUPPORTED_FORMAT: "不支持的图片格式",
      DOWNLOAD_FAILED: "下载图片失败，请检查 URL 是否可访问",
      DOWNLOAD_TIMEOUT: "下载图片超时，请检查网络连接",
      NOT_AN_IMAGE: "提供的 URL 不是图片链接",
    };
    const defaultMsg = `图片处理失败：${error.message}`;
    const text = messages[error.code] ? `❌ ${messages[error.code]}（${error.message}）` : `❌ ${defaultMsg}`;
    return { isError: true, content: [{ type: "text", text }] };
  }

  if (error instanceof VisionAPIError) {
    return {
      isError: true,
      content: [{ type: "text", text: `❌ ${error.message}` }],
    };
  }

  // 未知错误
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[analyze_image] 未预期的错误：${message}`);
  return {
    isError: true,
    content: [{
      type: "text",
      text: `❌ 分析图片时发生未知错误：${message}`,
    }],
  };
}
