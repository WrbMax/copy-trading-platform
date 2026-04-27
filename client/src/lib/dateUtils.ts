/**
 * 北京时间（UTC+8）统一格式化工具
 * 所有时间展示必须使用此文件中的函数，确保全站时间统一显示为北京时间
 */

const BEIJING_OFFSET = 8 * 60; // 北京时间 UTC+8，分钟数

/**
 * 将任意时间值转为北京时间的 Date 对象（仅用于格式化，不改变时间戳）
 */
function toBeijingDate(d: Date | string | number | null | undefined): Date | null {
  if (!d) return null;
  const ts = typeof d === "number" ? d : new Date(d).getTime();
  if (isNaN(ts)) return null;
  // 将 UTC 时间戳加上北京时间偏移，生成一个"假 UTC"Date，用于格式化
  const utcMs = ts + BEIJING_OFFSET * 60 * 1000;
  return new Date(utcMs);
}

/**
 * 格式化为北京时间：yyyy-MM-dd HH:mm:ss
 */
export function formatBeijingDateTime(d: Date | string | number | null | undefined): string {
  const bd = toBeijingDate(d);
  if (!bd) return "-";
  const Y = bd.getUTCFullYear();
  const M = String(bd.getUTCMonth() + 1).padStart(2, "0");
  const D = String(bd.getUTCDate()).padStart(2, "0");
  const h = String(bd.getUTCHours()).padStart(2, "0");
  const m = String(bd.getUTCMinutes()).padStart(2, "0");
  const s = String(bd.getUTCSeconds()).padStart(2, "0");
  return `${Y}-${M}-${D} ${h}:${m}:${s}`;
}

/**
 * 格式化为北京时间：yyyy-MM-dd HH:mm（不含秒）
 */
export function formatBeijingDateTimeShort(d: Date | string | number | null | undefined): string {
  const bd = toBeijingDate(d);
  if (!bd) return "-";
  const Y = bd.getUTCFullYear();
  const M = String(bd.getUTCMonth() + 1).padStart(2, "0");
  const D = String(bd.getUTCDate()).padStart(2, "0");
  const h = String(bd.getUTCHours()).padStart(2, "0");
  const m = String(bd.getUTCMinutes()).padStart(2, "0");
  return `${Y}-${M}-${D} ${h}:${m}`;
}

/**
 * 格式化为北京时间：MM-dd HH:mm（月日时分，用于紧凑展示）
 */
export function formatBeijingMonthDay(d: Date | string | number | null | undefined): string {
  const bd = toBeijingDate(d);
  if (!bd) return "-";
  const M = String(bd.getUTCMonth() + 1).padStart(2, "0");
  const D = String(bd.getUTCDate()).padStart(2, "0");
  const h = String(bd.getUTCHours()).padStart(2, "0");
  const m = String(bd.getUTCMinutes()).padStart(2, "0");
  return `${M}-${D} ${h}:${m}`;
}

/**
 * 格式化为北京时间：yyyy-MM-dd（仅日期）
 */
export function formatBeijingDate(d: Date | string | number | null | undefined): string {
  const bd = toBeijingDate(d);
  if (!bd) return "-";
  const Y = bd.getUTCFullYear();
  const M = String(bd.getUTCMonth() + 1).padStart(2, "0");
  const D = String(bd.getUTCDate()).padStart(2, "0");
  return `${Y}-${M}-${D}`;
}

/**
 * 格式化为北京时间：yyyy/MM/dd（斜线日期，用于到期日展示）
 */
export function formatBeijingDateSlash(d: Date | string | number | null | undefined): string {
  const bd = toBeijingDate(d);
  if (!bd) return "-";
  const Y = bd.getUTCFullYear();
  const M = String(bd.getUTCMonth() + 1).padStart(2, "0");
  const D = String(bd.getUTCDate()).padStart(2, "0");
  return `${Y}/${M}/${D}`;
}
