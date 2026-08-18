import fs from "fs";
import path from "path";
import axios from "axios";

class StorageService {
  private storagePath: string;

  constructor(storagePath: string = "./storage/media") {
    this.storagePath = storagePath;
    this.ensureStorageDirectory();
  }

  private ensureStorageDirectory(): void {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
      console.log(`[Storage] Created storage directory: ${this.storagePath}`);
    }
  }

  async downloadAndStore(
    mediaUrl: string,
    mediaId: string
  ): Promise<string> {
    try {
      const response = await axios.get(mediaUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
      });

      const extension = this.getFileExtension(mediaUrl);
      const filename = `${mediaId}${extension}`;
      const filepath = path.join(this.storagePath, filename);

      fs.writeFileSync(filepath, response.data);
      console.log(`[Storage] Downloaded and stored: ${filename}`);

      return filepath;
    } catch (error) {
      console.error(
        `[Storage] Failed to download media ${mediaId}:`,
        error instanceof Error ? error.message : error
      );
      throw error;
    }
  }

  private getFileExtension(url: string): string {
    const urlPath = new URL(url).pathname;
    const ext = path.extname(urlPath);
    return ext || ".jpg";
  }

  getStoragePath(): string {
    return this.storagePath;
  }

  fileExists(filepath: string): boolean {
    return fs.existsSync(filepath);
  }
}

export const storageService = new StorageService(
  process.env.STORAGE_PATH || "./storage/media"
);
