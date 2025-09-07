// Centralized constant values (no hard-coded magic numbers in logic)
export const CURRENCIES = ['USD','EUR','MYR','GBP','JPY'] as const;
export const TRADE_DIRECTIONS = ['LONG','SHORT'] as const;
export const TRADE_STATUS = ['OPEN','CLOSED','CANCELLED'] as const;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
export const SOFT_DELETE_UNDO_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_TAGS_PER_TRADE = 8;
// Streaming export threshold (row count above which CSV uses chunked streaming)
let EXPORT_STREAMING_ROW_THRESHOLD_INTERNAL = Number(process.env.EXPORT_STREAMING_ROW_THRESHOLD || 10_000);
export function setExportStreamingRowThreshold(v: number) { EXPORT_STREAMING_ROW_THRESHOLD_INTERNAL = v; }
export function getExportStreamingRowThreshold() { return EXPORT_STREAMING_ROW_THRESHOLD_INTERNAL; }
// CSV streaming chunk size (number of rows per flush)
let EXPORT_STREAMING_CHUNK_SIZE_INTERNAL = Number(process.env.EXPORT_STREAMING_CHUNK_SIZE || 500);
export function setExportStreamingChunkSize(v: number) { EXPORT_STREAMING_CHUNK_SIZE_INTERNAL = v; }
export function getExportStreamingChunkSize() { return EXPORT_STREAMING_CHUNK_SIZE_INTERNAL; }

// Soft memory limit (MB) for assembling streaming exports in memory when persisting jobs.
// If exceeded, the job will fail fast with a clear error advising alternative approaches.
// Mutable via setter for tests to simulate low limits without creating huge datasets.
let EXPORT_MEMORY_SOFT_LIMIT_MB_INTERNAL = Number(process.env.EXPORT_MEMORY_SOFT_LIMIT_MB || 50);
export function setExportMemorySoftLimitMB(v: number) { EXPORT_MEMORY_SOFT_LIMIT_MB_INTERNAL = v; }
export function getExportMemorySoftLimitMB() { return EXPORT_MEMORY_SOFT_LIMIT_MB_INTERNAL; }

// COLOR_PALETTE retained for data visualization fallback; consider dynamic theming in future.
/* eslint-disable no-restricted-syntax */
export const COLOR_PALETTE = [
  '#22c55e', // success
  '#3b82f6', // accent
  '#6366f1', // accent alt
  '#ec4899', // magenta
  '#f59e0b', // warning
  '#ef4444', // danger
  '#8b5cf6', // violet
  '#06b6d4'  // info alt
];
/* eslint-enable no-restricted-syntax */
