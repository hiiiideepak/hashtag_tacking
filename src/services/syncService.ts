import { metaService } from "./metaService";
import { hashtagService } from "./hashtagService";
import { mediaService } from "./mediaService";
import { storageService } from "../storage/storage";

class SyncService {
  async syncTopMedia(hashtagName: string): Promise<void> {
    console.log(`[SyncService] Starting top media sync for hashtag: ${hashtagName}`);

    try {
      const hashtagId = await metaService.getHashtagId(hashtagName);

      const hashtag = await hashtagService.getOrCreate(hashtagName, hashtagId);

      const topMedia = await metaService.getTopMedia(hashtagId);

      let createdCount = 0;
      let skippedCount = 0;

      for (const media of topMedia) {
        const exists = await mediaService.mediaExists(hashtagId, media.id);

        if (exists) {
          skippedCount++;
          continue;
        }

        try {
          let localAssetPath: string | undefined;

          if (media.media_url) {
            try {
              localAssetPath = await storageService.downloadAndStore(
                media.media_url,
                media.id
              );
            } catch (error) {
              console.warn(
                `[SyncService] Failed to download media ${media.id}, proceeding without local asset`
              );
            }
          }

          await mediaService.createMedia(hashtagId, media, localAssetPath);
          createdCount++;
        } catch (error) {
          console.error(
            `[SyncService] Failed to create media record for ${media.id}:`,
            error instanceof Error ? error.message : error
          );
        }
      }

      console.log(
        `[SyncService] Top media sync completed: ${createdCount} created, ${skippedCount} skipped`
      );
    } catch (error) {
      console.error(
        "[SyncService] Top media sync failed:",
        error instanceof Error ? error.message : error
      );
      throw error;
    }
  }

  async syncRecentMedia(hashtagName: string): Promise<void> {
    console.log(
      `[SyncService] Starting recent media sync for hashtag: ${hashtagName}`
    );

    try {
      const hashtagId = await metaService.getHashtagId(hashtagName);

      const hashtag = await hashtagService.getOrCreate(hashtagName, hashtagId);

      const recentMedia = await metaService.getRecentMedia(hashtagId);

      let createdCount = 0;
      let skippedCount = 0;

      for (const media of recentMedia) {
        const exists = await mediaService.mediaExists(hashtagId, media.id);

        if (exists) {
          skippedCount++;
          continue;
        }

        try {
          let localAssetPath: string | undefined;

          if (media.media_url) {
            try {
              localAssetPath = await storageService.downloadAndStore(
                media.media_url,
                media.id
              );
            } catch (error) {
              console.warn(
                `[SyncService] Failed to download media ${media.id}, proceeding without local asset`
              );
            }
          }

          await mediaService.createMedia(hashtagId, media, localAssetPath);
          createdCount++;
        } catch (error) {
          console.error(
            `[SyncService] Failed to create media record for ${media.id}:`,
            error instanceof Error ? error.message : error
          );
        }
      }

      console.log(
        `[SyncService] Recent media sync completed: ${createdCount} created, ${skippedCount} skipped`
      );
    } catch (error) {
      console.error(
        "[SyncService] Recent media sync failed:",
        error instanceof Error ? error.message : error
      );
      throw error;
    }
  }
}

export const syncService = new SyncService();
