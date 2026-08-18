import pool from "../db/connection";
import { Hashtag } from "../types";

class HashtagService {
  async getOrCreate(name: string, hashtagId: string): Promise<Hashtag> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        "SELECT * FROM hashtags WHERE name = $1",
        [name]
      );

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      const createResult = await client.query(
        "INSERT INTO hashtags (name, hashtag_id) VALUES ($1, $2) RETURNING *",
        [name, hashtagId]
      );

      console.log(`[HashtagService] Created hashtag: ${name}`);
      return createResult.rows[0];
    } finally {
      client.release();
    }
  }

  async getByName(name: string): Promise<Hashtag | null> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        "SELECT * FROM hashtags WHERE name = $1",
        [name]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
      client.release();
    }
  }

  async getById(id: string): Promise<Hashtag | null> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        "SELECT * FROM hashtags WHERE id = $1",
        [id]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
      client.release();
    }
  }
}

export const hashtagService = new HashtagService();
