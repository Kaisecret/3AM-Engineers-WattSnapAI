import { after, NextResponse } from "next/server";
import { admitRun, ingestAuthorization, runIngestion, type IngestTrigger } from "@/features/advisory-intelligence/ingest";
import { ingestConfigured, ingestDeps } from "@/features/advisory-intelligence/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// One Apify call can take two minutes, so a run needs this limit (Fluid Compute on Vercel).
// The run works to a deadline inside it and saves its progress as it goes. A deployment that
// allows less than 300 seconds is not supported: see docs/13-anteco-advisory-ingestion.md.
export const maxDuration = 300;

const answer = (body: Record<string, unknown>, status: number) => NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });

/**
 * "Check ANTECO's page now." Called by Vercel Cron once a day and by the Gmail script when a
 * Facebook notification arrives. Both send `Authorization: Bearer <CRON_SECRET>`. The request
 * body is never read. The script adds `?since=<when the email arrived, in milliseconds>` and keeps
 * sending the signal until it is served. Answers:
 *   200 served: true        new posts were fetched after `since`; the signal is done
 *   202 accepted            a run was started and continues after this response
 *   409 retry: true         a run is fetching or one started under two minutes ago; send again
 *   429 retry: false        the day's runs are used up; the daily run covers it
 */
/** `since` as an ISO time, or null when it is absent, not a time, or in the future. */
function signalTime(value: string | null): string | null {
  if (!value) return null;
  const stamp = /^\d{10,13}$/.test(value) ? Number(value) * (value.length <= 10 ? 1000 : 1) : Date.parse(value);
  return Number.isFinite(stamp) && stamp > 0 && stamp <= Date.now() + 60_000 ? new Date(stamp).toISOString() : null;
}

async function handle(request: Request, trigger: IngestTrigger) {
  const allowed = ingestAuthorization(request.headers.get("authorization"), process.env.CRON_SECRET);
  if (allowed === 401) return answer({ accepted: false, error: "Unauthorized." }, 401);
  if (allowed === 503 || !ingestConfigured()) return answer({ accepted: false, retry: true, error: "Advisory collection is not configured." }, 503);

  const deps = ingestDeps(maxDuration), url = new URL(request.url);
  try {
    const admission = await admitRun(deps, url.searchParams.get("trigger") === "manual" ? "manual" : trigger, signalTime(url.searchParams.get("since")));
    if (admission.status === 200) return answer({ accepted: false, served: true, retry: false }, 200);
    if (!admission.accepted) return answer({ accepted: false, retry: admission.retry, reason: admission.reason }, admission.status);
    // ?wait=1 runs inline and returns the counts, for checking by hand.
    if (url.searchParams.get("wait") === "1") return answer({ accepted: true, ...(await runIngestion(deps, admission.run)) }, 200);
    after(() => runIngestion(deps, admission.run).catch(error => console.error("[wattsnap:advisories] run", error instanceof Error ? error.message : error)));
    return answer({ accepted: true }, 202);
  } catch (error) {
    console.error("[wattsnap:advisories] ingest", error instanceof Error ? error.message : error);
    return answer({ accepted: false, retry: true, error: "Advisory collection is temporarily unavailable." }, 503);
  }
}

export const GET = (request: Request) => handle(request, "cron");
export const POST = (request: Request) => handle(request, "email");
