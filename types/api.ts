// Shared API DTO + envelope types (Phase 1)
export interface ResponseEnvelope<T> { data: T | null; error: ApiError | null; }
// Allow existing error helpers that may not include an index signature
export interface ApiError { code: string; message: string; details?: unknown; [k: string]: unknown }

export interface TradeDTO {
  id: string; instrumentId: string; direction: 'LONG' | 'SHORT'; entryPrice: number; exitPrice: number | null;
  quantity: number; status: 'OPEN' | 'CLOSED' | 'CANCELLED'; entryAt: string; exitAt: string | null; realizedPnl?: number | null; tags?: { id: string; label: string; color: string }[];
}

export interface Paginated<T> { items: T[]; nextCursor: string | null }

export interface GoalDTO {
  id: string;
  type: string; // narrowed by consumers via GoalType enum
  period: string;
  targetValue: number;
  currentValue: number;
  startDate: string;
  endDate: string;
  achievedAt: string | null;
  windowDays?: number | null;
}

export interface InstrumentDTO {
  id: string;
  symbol: string;
  name: string;
  category: string;
  currency: string;
  tickSize: number;
  contractMultiplier: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailyPnlPoint { date: string; pnl: number }
export interface DailyPnlPayload { days: DailyPnlPoint[] }

export interface ExportJobDTO {
  id: string; type: string; format: string; status: string; createdAt: number; startedAt?: number; completedAt?: number; error?: string; filename?: string; downloadToken?: string;
  tokenExpiresAt?: number; // epoch ms
  tokenConsumed?: boolean;
}

export interface ExportJobDetailDTO extends ExportJobDTO { contentType?: string; payloadBase64?: string }
