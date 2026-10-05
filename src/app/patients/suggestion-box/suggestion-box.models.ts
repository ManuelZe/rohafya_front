export interface Suggestion {
  id: number;
  content: string;
  Note: number | null;
  CreatedAt: string | null;
  UpdatedAt: string | null;
  CreatedBy: number | null;
  UpdatedBy: number | null;
}

export interface SuggestionCreatePayload {
  content: string;
  note?: number | null;
}

export interface SuggestionUpdatePayload {
  content?: string;
  note?: number | null;
}
