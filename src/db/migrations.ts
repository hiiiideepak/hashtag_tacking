import "dotenv/config";
import pool from "./connection";

const migrations = [
  `
    CREATE TABLE IF NOT EXISTS hashtags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL UNIQUE,
      hashtag_id VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS media (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      hashtag_id VARCHAR(255) NOT NULL,
      media_id VARCHAR(255) NOT NULL,
      caption TEXT,
      media_type VARCHAR(50) NOT NULL,
      media_url TEXT NOT NULL,
      permalink TEXT NOT NULL,
      like_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      timestamp TIMESTAMP NOT NULL,
      local_asset_path VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(hashtag_id, media_id),
      FOREIGN KEY (hashtag_id) REFERENCES hashtags(hashtag_id)
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_media_hashtag_id ON media(hashtag_id);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at DESC);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_media_media_id ON media(media_id);
  `,
];

export async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log("Running migrations...");

    for (const migration of migrations) {
      await client.query(migration);
      console.log("Migration executed successfully");
    }

    console.log("All migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations().then(() => process.exit(0));
}
