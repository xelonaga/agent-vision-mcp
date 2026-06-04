/**
 * 缓存模块 —— 可选的 SHA256 文件缓存
 *
 * 对相同的图片+提示词组合，缓存视觉 API 的返回结果，
 * 避免重复调用浪费 API 费用。默认关闭。
 */

import { createHash } from "node:crypto";
import { readFile, writeFile, unlink, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

/** 默认缓存 TTL：1 小时 */
const CACHE_TTL_MS = 60 * 60 * 1000;

/** 缓存条目结构 */
interface CacheEntry {
  result: string;
  cachedAt: number;
}

/**
 * 计算缓存键
 * 对图片数据 URL 和提示词的组合取 SHA256 哈希
 */
export function computeCacheKey(imageData: string, prompt: string): string {
  const hash = createHash("sha256");
  hash.update(imageData);
  hash.update("::");
  hash.update(prompt);
  return hash.digest("hex");
}

/**
 * 尝试从缓存读取结果
 * @returns 命中时返回结果字符串，未命中或过期返回 null
 */
export async function getCachedResult(
  cacheKey: string,
  cacheDir: string,
): Promise<string | null> {
  const filePath = join(cacheDir, `${cacheKey}.json`);
  try {
    const raw = await readFile(filePath, "utf-8");
    const entry = JSON.parse(raw) as CacheEntry;
    // 检查是否过期
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      // 过期，删除缓存文件
      await unlink(filePath).catch(() => {});
      return null;
    }
    return entry.result;
  } catch {
    // 文件不存在或读取失败 → 缓存未命中
    return null;
  }
}

/**
 * 将结果写入缓存
 */
export async function setCachedResult(
  cacheKey: string,
  result: string,
  cacheDir: string,
): Promise<void> {
  // 确保缓存目录存在
  if (!existsSync(cacheDir)) {
    await mkdir(cacheDir, { recursive: true });
  }

  const entry: CacheEntry = {
    result,
    cachedAt: Date.now(),
  };
  const filePath = join(cacheDir, `${cacheKey}.json`);
  await writeFile(filePath, JSON.stringify(entry), "utf-8");
}
