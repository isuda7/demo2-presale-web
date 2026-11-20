import type { DeepPartial } from './schema.js';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * 설정 덮어쓰기.
 * - 객체: 키 단위로 재귀 병합
 * - 배열: 통째로 교체(예: pages 를 바꾸려면 전체 목록을 다시 적는다)
 * - undefined: 무시(앞 단계 값 유지)
 */
export function mergeConfig<T>(base: T, ...layers: Array<DeepPartial<T> | undefined>): T {
  let out: unknown = structuredClone(base);
  for (const layer of layers) {
    if (layer !== undefined) out = mergeValue(out, layer);
  }
  return out as T;
}

function mergeValue(target: unknown, src: unknown): unknown {
  if (src === undefined) return target;
  if (isPlainObject(target) && isPlainObject(src)) {
    const result: Record<string, unknown> = { ...target };
    for (const [k, v] of Object.entries(src)) result[k] = mergeValue(target[k], v);
    return result;
  }
  return structuredClone(src);
}
