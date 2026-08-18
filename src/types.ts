export interface InstagramMedia {
  id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL";
  timestamp: string;
  permalink: string;
  media_url: string;
  caption?: string;
  like_count: number;
  comments_count: number;
}

export interface MediaRecord {
  id: string;
  hashtag_id: string;
  media_id: string;
  caption: string | null;
  media_type: string;
  media_url: string;
  permalink: string;
  like_count: number;
  comments_count: number;
  timestamp: string;
  local_asset_path: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Hashtag {
  id: string;
  name: string;
  hashtag_id: string;
  created_at: Date;
}

export interface QueueJob {
  type: string;
  payload: Record<string, unknown>;
  createdAt: number;
  id: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
