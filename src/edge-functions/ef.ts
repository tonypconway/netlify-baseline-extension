import { getStore } from "@netlify/blobs";
// @ts-ignore
import type { IResult } from "https://deno.land/x/ua_parser_js@2.0.3/src/main/ua-parser.d.ts";
// @ts-ignore
import { UAParser } from "https://deno.land/x/ua_parser_js@2.0.3/src/main/ua-parser.mjs";

export default (request: Request) => {
  if (debug) console.log(request.url);
  const userAgent = request.headers.get("user-agent");
  if (userAgent === null || userAgent === "") {
    return;
  }
  setTimeout(() => incrementInBlob(userAgent), 0);
};

export const config = {
  path: "/*",
  excludedPath: [
    "/*.js",
    "/*.mjs",
    "/*.ts",
    "/*.tsx",
    "/*.css",
    "/*.png",
    "/*.jpg",
    "/*.jpeg",
    "/*.gif",
    "/*.svg",
    "/*.webp",
    "/*.ico",
    "/*.woff2",
    "/*.woff",
    "/*.ttf",
    "/*.eot",
    "/*.otf",
    "/*.mp4",
    "/*.mp3",
    "/*.wav",
    "/*.ogg",
    "/*.m4a",
    "/*.aac",
    "/*.flac",
    "/*.opus",
    "/*.webm",
    "/*.mov",
    "/*.avi",
    "/*.wmv",
    "/*.mkv",
    "/*.webp",
    "/*.avif",
    "/*.bmp",
    "/*.tiff",
    "/*.tif",
    "/*.raw",
  ],
  onError: "bypass",
};

const debug = Netlify.env.get("BASELINE_EXTENSION_DEBUG_EF") ? Netlify.env.get("BASELINE_EXTENSION_DEBUG_EF") : "false";

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
    browserName: browserMappings[ua.browser.name]?.shortName ?? ua.browser.name,
    version: "",
  }

  if (debug) console.log("UAParser result", ua.browser.name, ua.browser.version, ua.device.vendor, ua.device.type);

  if (!browserMappings.hasOwnProperty(ua.browser.name)) {
    throw new Error(`Browser ${ua.browser.name} not recognized`);
    result.version = "unknown";
    return result;
  }

  if (ua.device.type === "mobile" && ua.device.vendor === "Apple" && ua.browser.name != "Mobile Safari") {
    if (debug) console.log("detected iOS device with non-Safari browser");
    // For non-Safari iOS browsers, we need to use the OS version
    // instead of the browser version, because the browser version
    // doesn't tell us anything about which version of WebKit
    // is being used.
    const versionParts = ua.os.version.split(".");
    result.version =
      versionParts[1] == 0
        ? `${versionParts[0]}`
        : `${versionParts[0]}.${versionParts[1]}`;
    result.browserName = "safari_ios";
    return result;
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
    current[browserName] = {};
  }
  if (!current[browserName].hasOwnProperty(version)) {
    current[browserName][version] = {
      "count": 0
    };
  };
  current[browserName][version]["count"] += 1;
  // END: Baseline code

  await store.setJSON(key, current).then(() => {
    if (debug) console.log(`Incremented ${browserName} version ${version} count in key ${key} by 1`);
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
