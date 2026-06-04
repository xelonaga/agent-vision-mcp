/**
 * 图片处理模块 —— 图片来源检测、下载/读取、base64 编码
 *
 * 支持三种图片来源：
 * 1. base64 data URL（data:image/...）—— 校验并透传
 * 2. HTTP/HTTPS 链接 —— fetch 下载后转 base64
 * 3. 本地文件路径 —— 读取文件后转 base64
 */

import { readFile, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";

/** 图片来源类型 */
export type ImageSourceType = "data-url" | "url" | "file";

/** 图片处理结果 */
export interface ProcessedImage {
  /** base64 data URL，可直接传给 vision API */
  dataUrl: string;
  /** MIME 类型，如 "image/png" */
  mimeType: string;
}

/** 图片处理错误 */
export class ImageProcessError extends Error {
  /** 错误码，方便调用方按类型处理 */
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ImageProcessError";
    this.code = code;
  }
}

/** 支持的图片扩展名 → MIME 类型映射 */
const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
};

/** 下载超时时间（毫秒） */
const DOWNLOAD_TIMEOUT_MS = 30_000;

/**
 * 检测图片来源类型
 */
export function detectImageSource(image: string): ImageSourceType {
  if (image.startsWith("data:image/")) {
    return "data-url";
  }
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return "url";
  }
  return "file";
}

/**
 * 处理图片输入，统一转换为 base64 data URL
 */
export async function processImage(
  image: string,
  maxSize: number,
): Promise<ProcessedImage> {
  const sourceType = detectImageSource(image);

  switch (sourceType) {
    case "data-url":
      return processDataUrl(image);
    case "url":
      return processUrl(image, maxSize);
    case "file":
      return processFile(image, maxSize);
  }
}

/**
 * 处理 base64 data URL
 */
function processDataUrl(dataUrl: string): ProcessedImage {
  // 提取 MIME 类型（格式：data:image/png;base64,...）
  const mimeMatch = dataUrl.match(/^data:(image\/\w+);/);
  if (!mimeMatch) {
    throw new ImageProcessError(
      "INVALID_DATA_URL",
      `无效的 data URL 格式：必须以 "data:image/" 开头`,
    );
  }
  return { dataUrl, mimeType: mimeMatch[1] };
}

/**
 * 处理远程 URL：下载 → 校验 → 转 base64
 */
async function processUrl(
  url: string,
  maxSize: number,
): Promise<ProcessedImage> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ImageProcessError(
        "DOWNLOAD_TIMEOUT",
        `下载图片超时（${DOWNLOAD_TIMEOUT_MS / 1000} 秒）：${url}`,
      );
    }
    throw new ImageProcessError(
      "DOWNLOAD_FAILED",
      `下载图片失败：${err instanceof Error ? err.message : String(err)}`,
    );
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new ImageProcessError(
      "DOWNLOAD_FAILED",
      `下载图片失败：HTTP ${response.status} ${response.statusText}`,
    );
  }

  // 校验 Content-Type 是否为图片类型
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new ImageProcessError(
      "NOT_AN_IMAGE",
      `URL 指向的不是图片（Content-Type: ${contentType}）`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) {
    throw new ImageProcessError("FILE_EMPTY", "下载的图片为空");
  }
  if (buffer.length > maxSize) {
    throw new ImageProcessError(
      "FILE_TOO_LARGE",
      `图片大小 ${formatSize(buffer.length)} 超出限制 ${formatSize(maxSize)}`,
    );
  }

  const mimeType = contentType.split(";")[0].trim();
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  return { dataUrl, mimeType };
}

/**
 * 处理本地文件：读取 → 校验 → 转 base64
 */
async function processFile(
  filePath: string,
  maxSize: number,
): Promise<ProcessedImage> {
  const absolutePath = resolve(filePath);

  // 检查文件状态
  let fileStat;
  try {
    fileStat = await stat(absolutePath);
  } catch {
    throw new ImageProcessError(
      "FILE_NOT_FOUND",
      `图片文件不存在：${filePath}`,
    );
  }

  if (!fileStat.isFile()) {
    throw new ImageProcessError(
      "FILE_NOT_FOUND",
      `路径不是文件：${filePath}`,
    );
  }
  if (fileStat.size === 0) {
    throw new ImageProcessError("FILE_EMPTY", `图片文件为空：${filePath}`);
  }
  if (fileStat.size > maxSize) {
    throw new ImageProcessError(
      "FILE_TOO_LARGE",
      `图片大小 ${formatSize(fileStat.size)} 超出限制 ${formatSize(maxSize)}`,
    );
  }

  // 从扩展名推断 MIME 类型
  const ext = basename(absolutePath).toLowerCase();
  const matchedExt = Object.keys(EXT_TO_MIME).find((e) => ext.endsWith(e));
  if (!matchedExt) {
    const supportedExts = Object.keys(EXT_TO_MIME).join("、");
    throw new ImageProcessError(
      "UNSUPPORTED_FORMAT",
      `不支持的图片格式 "${ext}"。支持的格式：${supportedExts}`,
    );
  }
  const mimeType = EXT_TO_MIME[matchedExt];

  // 读取文件并编码为 base64
  const buffer = await readFile(absolutePath);
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  return { dataUrl, mimeType };
}

/**
 * 格式化字节大小为人类可读的字符串
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
