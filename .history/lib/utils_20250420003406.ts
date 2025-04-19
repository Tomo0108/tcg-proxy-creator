import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 指定された範囲内のランダムな数値を生成します。
 * @param min 最小値 (含む)
 * @param max 最大値 (含まない)
 * @returns ランダムな数値
 */
export function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
