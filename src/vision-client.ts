/**
 * 视觉 API 客户端 —— 基于 openai SDK 封装
 *
 * 调用用户配置的 OpenAI 兼容视觉 API（OpenAI、Gemini、MiniMax、Qwen 等均支持），
 * 将图片和分析提示词发送给视觉模型，返回文字分析结果。
 */

import OpenAI, { APIError } from "openai";

/** API 调用参数 */
export interface VisionClientOptions {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
}

/** 视觉 API 错误 */
export class VisionAPIError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "VisionAPIError";
    this.code = code;
  }
}

/**
 * 调用视觉 API 分析单张图片
 *
 * @param dataUrl - base64 编码的图片 data URL
 * @param prompt - 用户提供的分析指令
 * @param mimeType - 图片的 MIME 类型（保留参数，openai SDK 从 dataUrl 自动推断）
 * @param options - API 连接和模型配置
 * @returns 视觉模型返回的文字分析结果
 */
export async function analyzeImage(
  dataUrl: string,
  prompt: string,
  _mimeType: string,
  options: VisionClientOptions,
): Promise<string> {
  const client = createClient(options);
  const content = buildContent([dataUrl], prompt);

  try {
    return await callVision(client, options, content);
  } catch (error) {
    return handleError(error);
  }
}

/** 单张图片处理结果 */
export interface ProcessedImage {
  dataUrl: string;
  mimeType: string;
}

/**
 * 调用视觉 API 同时分析多张图片（对比模式）
 *
 * 将所有图片放在同一个 user message 的 content 数组中，
 * 视觉模型可以同时看到所有图片进行对比分析。
 *
 * @param images - 已处理的图片数组（至少 2 张）
 * @param prompt - 用户提供的对比分析指令
 * @param options - API 连接和模型配置
 * @returns 视觉模型返回的对比分析结果
 */
export async function compareImages(
  images: ProcessedImage[],
  prompt: string,
  options: VisionClientOptions,
): Promise<string> {
  const client = createClient(options);
  const content = buildContent(
    images.map((img) => img.dataUrl),
    prompt,
  );

  try {
    return await callVision(client, options, content);
  } catch (error) {
    return handleError(error);
  }
}

function createClient(options: VisionClientOptions): OpenAI {
  return new OpenAI({
    apiKey: options.apiKey,
    baseURL: options.baseUrl,
  });
}

function buildContent(
  dataUrls: string[],
  prompt: string,
): Array<
  | { type: "image_url"; image_url: { url: string } }
  | { type: "text"; text: string }
> {
  const parts: Array<
    { type: "image_url"; image_url: { url: string } }
    | { type: "text"; text: string }
  > = dataUrls.map((url) => ({
    type: "image_url" as const,
    image_url: { url },
  }));
  parts.push({ type: "text" as const, text: prompt });
  return parts;
}

async function callVision(
  client: OpenAI,
  options: VisionClientOptions,
  content: ReturnType<typeof buildContent>,
): Promise<string> {
  const response = await client.chat.completions.create({
    model: options.model,
    max_tokens: options.maxTokens,
    messages: [{ role: "user" as const, content }],
  });

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new VisionAPIError(
      "EMPTY_RESPONSE",
      "视觉 API 返回的内容为空，请检查 API 是否正常或尝试换一个提示词。",
    );
  }

  return text;
}

function handleError(error: unknown): never {
  if (error instanceof APIError) {
    return handleOpenAIError(error);
  }
  if (error instanceof VisionAPIError) {
    throw error;
  }
  throw new VisionAPIError(
    "UNKNOWN",
    `视觉 API 调用失败：${error instanceof Error ? error.message : String(error)}`,
  );
}

/**
 * 将 openai SDK 错误映射为用户友好的中文消息
 */
function handleOpenAIError(error: APIError): never {
  const status = error.status;
  const message = error.message;

  switch (status) {
    case 400:
      throw new VisionAPIError(
        "BAD_REQUEST",
        `请求参数有误（400）：${message}。请检查 VISION_MODEL_NAME 是否正确，以及该模型是否支持视觉功能。`,
      );
    case 401:
      throw new VisionAPIError(
        "AUTH_ERROR",
        `API 密钥无效（401）。请检查 VISION_API_KEY 是否正确设置，以及该密钥是否有权限访问指定的模型。`,
      );
    case 403:
      throw new VisionAPIError(
        "FORBIDDEN",
        `访问被拒绝（403）：${message}。请检查 API 密钥权限和账户状态。`,
      );
    case 404:
      throw new VisionAPIError(
        "NOT_FOUND",
        `API 端点或模型不存在（404）。请检查 VISION_BASE_URL 和 VISION_MODEL_NAME 是否正确。`,
      );
    case 429:
      throw new VisionAPIError(
        "RATE_LIMITED",
        `请求被限流（429）。请稍等片刻后重试，或降低调用频率。`,
      );
    case 500:
    case 502:
    case 503:
      throw new VisionAPIError(
        "SERVER_ERROR",
        `视觉 API 服务端错误（${status}）。请稍后重试，或联系服务提供商。`,
      );
    default:
      throw new VisionAPIError(
        "API_ERROR",
        `视觉 API 错误（${status}）：${message}`,
      );
  }
}
