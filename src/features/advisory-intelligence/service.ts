import "server-only";
import { randomUUID } from "node:crypto";
import { downloadFacebookImages, fetchFacebookPosts, hasApifyToken } from "@/lib/apify/facebook-posts";
import { extractAdvisoryWithGemini, hasGeminiKey } from "@/lib/gemini/client";
import { ingestBudgetMs, type IngestDeps } from "./ingest";
import { advisoryStore } from "./repository";

/** ANTECO's official page. The only page the ingestion reads. */
const antecoPageUrl = "https://www.facebook.com/antecoPH";

export const ingestConfigured = () => hasApifyToken() && hasGeminiKey();

/** The real Apify, Gemini, database and clock for one ingestion run. */
export function ingestDeps(maxDurationSeconds: number): IngestDeps {
  return {
    store: advisoryStore,
    now: () => new Date(),
    newId: randomUUID,
    budgetMs: ingestBudgetMs(maxDurationSeconds),
    fetchPosts: query => fetchFacebookPosts({ pageUrl: antecoPageUrl, ...query }),
    loadImages: urls => downloadFacebookImages(urls),
    askModel: extractAdvisoryWithGemini,
  };
}
