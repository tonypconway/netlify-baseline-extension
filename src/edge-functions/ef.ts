import { getStore } from "@netlify/blobs";
// @ts-ignore
import type { IResult } from "https://deno.land/x/ua_parser_js@2.0.3/src/main/ua-parser.d.ts";
// @ts-ignore
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
  excludePath: ["**/*.js*", "**/*.css*", "**/*.png*", "**/*.jpg*", "**/*.jpeg*", "**/*.gif*", "**/*.svg*", "**/*.webp*", "**/*.ico*", "**/*.woff2*", "**/*.woff*", "**/*.ttf*", "**/*.eot*", "**/*.otf*"],
  onError: "bypass",
};

// This is a mapping of browser names from UAParser to the names used in the blob
// and the type of version (single or double)
const browserMappings: {
  [key: string]: {
    shortName?: string;
    versionType: string;
  };
} = {
  "Chrome": {
    shortName: "chrome",
    versionType: "single"
  },
  "Mobile Chrome": {
    shortName: "chrome_android",
    versionType: "single"
  },
  "Edge": {
    shortName: "edge",
    versionType: "single"
  },
  "Firefox": {
    shortName: "firefox",
    versionType: "single"
  },
  "Mobile Firefox": {
    shortName: "firefox_android",
    versionType: "single"
  },
  "Safari": {
    shortName: "safari",
    versionType: "double"
  },
  "Mobile Safari": {
    shortName: "safari_ios",
    versionType: "double"
  },
  "Opera": {
    shortName: "opera",
    versionType: "single"
  },
  "Opera Mobi": {
    shortName: "opera_android",
    versionType: "single"
  },
  "Samsung Internet": {
    shortName: "samsunginternet_android",
    versionType: "double"
  },
  "Chrome WebView": {
    shortName: "webview_android",
    versionType: "single"
  },
  "Yandex": {
    shortName: "ya_android",
    versionType: "double"
  },
  "QQBrowser": {
    shortName: "qq_android",
    versionType: "double"
  },
  "UCBrowser": {
    shortName: "uc_android",
    versionType: "double"
  },
}

const getBrowserNameAndVersion = (ua: IResult): {
  browserName: string;
  version: string;
} => {

  const result = {
    browserName: "",
    version: "",
  }

  if (!browserMappings.hasOwnProperty(ua.browser.name)) {
    throw new Error(`Browser ${ua.browser.name} not recognized`);
  }

  const browserMapping = browserMappings[ua.browser.name];
  result.browserName = browserMapping.shortName ?? ua.browser.name;

  // Split the version string into parts
  const versionParts = ua.browser.version.split(".");

  if (browserMapping.versionType === "double") {
    // For double version types, we need to split the 
    // version string and recombine the first two parts.
    result.version = `${versionParts[0]}.${versionParts[1]}`;
  } else {
    // For single version types, we can use just the first 
    // part of the version string.
    result.version = versionParts[0];
  }

  return result;

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
  const { browserName, version } = getBrowserNameAndVersion(ua);
  if (!current.hasOwnProperty(browserName)) {
    console.log(`browserName: ${browserName} not found.  Setting ${version} as an empty object.`);
    current[browserName] = {};
  }
  if (!current[browserName].hasOwnProperty(version)) {
    console.log(`browserName: ${browserName} exists, but ${version} not found.  Setting with count 0.`);
    current[browserName][version] = {
      "count": 0
    };
  }
  current[browserName][version]["count"] += 1;
  // END: Baseline code

  await store.setJSON(key, current).then(() => {
    console.log("Incremented count for " + key + ' using ' + JSON.stringify(current));
  });

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
