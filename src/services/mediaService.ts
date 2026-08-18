import pool from "../db/connection";
import { InstagramMedia, MediaRecord, PaginatedResponse, PaginationParams } from "../types";

class MediaService {
  async mediaExists(hashtagId: string, mediaId: string): Promise<boolean> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        "SELECT id FROM media WHERE hashtag_id = $1 AND media_id = $2",
        [hashtagId, mediaId]
      );

      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  async createMedia(
    hashtagId: string,
    media: InstagramMedia,
    localAssetPath?: string
  ): Promise<MediaRecord> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `INSERT INTO media
         (hashtag_id, media_id, caption, media_type, media_url, permalink,
          like_count, comments_count, timestamp, local_asset_path)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          hashtagId,
          media.id,
          media.caption || null,
          media.media_type,
          media.media_url,
          media.permalink,
          media.like_count,
          media.comments_count,
          media.timestamp,
          localAssetPath || null,
        ]
      );

      console.log(
        `[MediaService] Created media record: ${media.id} for hashtag ${hashtagId}`
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getMediaByHashtag(
    hashtagId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<MediaRecord>> {
    const client = await pool.connect();

    try {
      const offset = (pagination.page - 1) * pagination.limit;

      const countResult = await client.query(
        "SELECT COUNT(*) FROM media WHERE hashtag_id = $1",
        [hashtagId]
      );
      const total = parseInt(countResult.rows[0].count, 10);

      const mediaResult = await client.query(
        `SELECT * FROM media
         WHERE hashtag_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [hashtagId, pagination.limit, offset]
      );

      return {
        data: mediaResult.rows,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
        },
      };
    } finally {
      client.release();
    }
  }

  async getAllMedia(
    pagination: PaginationParams
  ): Promise<PaginatedResponse<MediaRecord>> {
    const client = await pool.connect();

    try {
      const offset = (pagination.page - 1) * pagination.limit;

      const countResult = await client.query("SELECT COUNT(*) FROM media");
      const total = parseInt(countResult.rows[0].count, 10);

      const mediaResult = await client.query(
        `SELECT * FROM media
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [pagination.limit, offset]
      );

      return {
        data: mediaResult.rows,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
        },
      };
    } finally {
      client.release();
    }
  }

  async getMediaCount(hashtagId: string): Promise<number> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        "SELECT COUNT(*) FROM media WHERE hashtag_id = $1",
        [hashtagId]
      );

      return parseInt(result.rows[0].count, 10);
    } finally {
      client.release();
    }
  }
}

export const mediaService = new MediaService();
