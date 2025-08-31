// Centralized constant values (no hard-coded magic numbers in logic)
export const CURRENCIES = ['USD','EUR','MYR','GBP','JPY'] as const;
export const TRADE_DIRECTIONS = ['LONG','SHORT'] as const;
export const TRADE_STATUS = ['OPEN','CLOSED','CANCELLED'] as const;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
export const SOFT_DELETE_UNDO_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_TAGS_PER_TRADE = 8;

export const COLOR_PALETTE = [
  '#22c55e','#3b82f6','#6366f1','#ec4899','#f59e0b','#ef4444','#8b5cf6','#06b6d4'
];
