import { getStore } from "@netlify/blobs";
import type { IResult } from "https://deno.land/x/ua_parser_js@2.0.3/src/main/ua-parser.d.ts";
import { UAParser } from "https://deno.land/x/ua_parser_js@2.0.3/src/main/ua-parser.mjs";

export default (request: Request) => {
  const userAgent = request.headers.get("user-agent");
  if (userAgent === null || userAgent === "") {
    return;
  }
  setTimeout(() => incrementInBlob(userAgent), 0);
};

export const config = {
  path: "/*",
  onError: "bypass",
};

async function incrementInBlob(userAgent: string): Promise<void> {
  const store = getStore({
    name: "netlify-baseline",
    consistency: "strong",
  });

  // increment the count for today
  const today = new Date().toISOString().split("T")[0];
  const bucket = Math.floor(Math.random() * 100)
    .toString()
    .padStart(4, "0");
  const key = `counts/${today}/${bucket}`;
  const current = (await store.get(key, { type: "json" })) ?? {};

  // START: Baseline code
  const ua = UAParser(userAgent) as IResult;
  void current; // this is your JSON, do with it what you want
  // END: Baseline code

  await store.setJSON(key, current);

  // clean up all stats excluding last 7 days
  const expectedDates = new Set(
    Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split("T")[0];
    })
  );
  const { blobs: allCounts } = await store.list({ prefix: "counts/" });
  for (const blob of allCounts) {
    if (!expectedDates.has(blob.key.split("/")[1])) {
      await store.delete(blob.key);
    }
  }
}
