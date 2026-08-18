import axios from "axios";
import { InstagramMedia } from "../types";

class MetaService {
  private accessToken: string;
  private userId: string;
  private apiVersion: string;
  private baseUrl = "https://graph.facebook.com";

  constructor() {
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || "";
    this.userId = process.env.INSTAGRAM_USER_ID || "";
    this.apiVersion = process.env.INSTAGRAM_API_VERSION || "v24.0";

    if (!this.accessToken || !this.userId) {
      throw new Error("Missing Instagram API credentials");
    }
  }

  async getHashtagId(hashtagName: string): Promise<string> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.apiVersion}/ig_hashtag_search`,
        {
          params: {
            user_id: this.userId,
            q: hashtagName,
            access_token: this.accessToken,
          },
        }
      );

      if (!response.data.data || response.data.data.length === 0) {
        throw new Error(`Hashtag not found: ${hashtagName}`);
      }

      const hashtagId = response.data.data[0].id;
      console.log(`[MetaService] Found hashtag ID for ${hashtagName}: ${hashtagId}`);
      return hashtagId;
    } catch (error) {
      console.error(
        "[MetaService] Failed to get hashtag ID:",
        error instanceof Error ? error.message : error
      );
      throw error;
    }
  }

  async getTopMedia(hashtagId: string, limit: number = 5): Promise<InstagramMedia[]> {
    return this.getMediaFromEndpoint(
      `${this.baseUrl}/${this.apiVersion}/${hashtagId}/top_media`,
      limit
    );
  }

  async getRecentMedia(
    hashtagId: string,
    limit: number = 25
  ): Promise<InstagramMedia[]> {
    return this.getMediaFromEndpoint(
      `${this.baseUrl}/${this.apiVersion}/${hashtagId}/recent_media`,
      limit
    );
  }

  private async getMediaFromEndpoint(
    endpoint: string,
    limit: number
  ): Promise<InstagramMedia[]> {
    const maxItemsPerPage: number = Number(process.env.MAX_ITEMS_PER_PAGE) || 10;
    limit = limit ?? Number(process.env.LIMIT_PER_PAGE);

    const allMedia: InstagramMedia[] = [];
    let after: string | undefined;
    const maxPages = Math.ceil(maxItemsPerPage / limit);
    let pageCount = 0;

    try {
      while (pageCount < maxPages) {
        const params: Record<string, unknown> = {
          user_id: this.userId,
          fields:
            "id,media_type,timestamp,permalink,media_url,caption,like_count,comments_count",
          limit,
          access_token: this.accessToken,
        };

        if (after) {
          params.after = after;
        }

        console.log(endpoint, params);
        const response = await axios.get(endpoint, { params });

        if (!response.data.data || response.data.data.length === 0) {
          break;
        }

        allMedia.push(...response.data.data);
        console.log(`${allMedia.length} media pushed --`)

        if (
          !response.data.paging ||
          !response.data.paging.cursors ||
          !response.data.paging.cursors.after
        ) {
          break;
        }

        after = response.data.paging.cursors.after;
        pageCount++;
      }

      console.log(
        `[MetaService] Fetched ${allMedia.length} media items from endpoint`
      );
      return allMedia;
    } catch (error) {
      console.log('--herer--', error);
      console.error(
        "[MetaService] Failed to fetch media:",
        error instanceof Error ? error : error
      );
      throw error;
    }
  }
}

export const metaService = new MetaService();
