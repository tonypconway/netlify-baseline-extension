import { getStore } from "@netlify/blobs";
// @ts-ignore
import type { IResult } from "../ua-parser-main/main/ua-parser.d.ts"
// @ts-ignore
import { UAParser } from '../ua-parser-js/main/ua-parser.mjs'
// @ts-ignore
import { isBot, isAIBot } from '../ua-parser-js/helpers/ua-parser-helpers.mjs'

export default async (request: Request) => {

  const userAgent = request.headers.get("user-agent");
  if (userAgent === null || userAgent === "") {
    return;
  }
  setTimeout(() => incrementInBlob(userAgent, request.url), 0);
};

export const config = {
  path: "/*",
  excludedPath: [
    "/.netlify",
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

const botsAndCrawlers = [
  "HeadlessChrome",
  "Googlebot",
  "Bingbot",
  "BingPreview",
  "DuckDuckBot",
  "Baiduspider",
  "YandexBot",
  "Sogou Spider",
  "Exabot",
  "facebot",
  "ia_archiver",
  "Twitterbot",
  "LinkedInBot",
  "Slackbot",
  "WhatsApp",
  "Discordbot",
  "Pinterestbot",
  "TelegramBot",
  "Googlebot-Image",
  "Googlebot-Video",
  "Googlebot-News",
  "Googlebot-Mobile",
  "Googlebot-AdsBot",
  "AdsBot-Google",
  "AdsBot-Google-Mobile",
  "AdsBot-Google-Mobile-Ads",
  "AdsBot-Google-Mobile-Ads-Image",
  "AdsBot-Google-Mobile-Ads-Video",
  "AdsBot-Google-Mobile-Ads-Video",
  "ImagesiftBot",
  "openai.com/bot",
  "ChatGPT",
  "Statping-ng",
  "DotBot",
  "dotbot",
  "YisouSpider",
  "semrush",
  "rss-parser",
  "Amazonbot",
  "perplexity"
];

const getBrowserNameAndVersion = (ua: IResult, userAgent: string): {
  browserName: string;
  version: string;
} => {

  const result = {
    browserName: "",
    version: "",
  }

  if (!browserMappings.hasOwnProperty(ua.browser.name ?? 'unknown')) {
    result.browserName = ua.browser.name ?? 'unknown';
    result.version = ua.browser.version ?? 'unknown';
    return result;
  }

  if (ua.device.type === "mobile" && ua.device.vendor === "Apple" && ua.browser.name != "Mobile Safari") {
    // For non-Safari iOS browsers, we need to use the OS version
    // instead of the browser version, because the browser version
    // doesn't tell us anything about which version of WebKit
    // is being used.
    const versionParts = (ua.os.version ?? "").split(".");
    result.version =
      !versionParts[1] || versionParts[1] == "0" || versionParts[1] != 'unknown'
        ? `${versionParts[0]}`
        : `${versionParts[0]}.${versionParts[1]}`;
    result.browserName = "safari_ios";
    return result;
  }

  const browserMapping = browserMappings[ua.browser.name ?? 'unknown'];
  result.browserName = browserMapping.shortName ? browserMapping.shortName : ua.browser.name ?? 'unknown';

  // Split the version string into parts
  const versionParts = (ua.browser.version ?? 'unknown').split(".");

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

async function incrementInBlob(
  userAgent: string, requestUrl: string
): Promise<void> {

  const debug = !!Netlify.env.get("BASELINE_ANALYTICS_DEBUG_EDGE_FUNCTION");

  const requestTime = new Date().toISOString();

  const ua = UAParser(userAgent) as IResult;

  if (
    isBot(userAgent) ||
    isAIBot(userAgent) ||
    botsAndCrawlers.some(bot =>
      (userAgent.includes(bot) || userAgent.includes(bot.toLowerCase()))
    ) ||
    botsAndCrawlers.some(bot => ua.browser.name === bot)
  ) {
    if (debug) {
      console.log(
        `RequestTime=${requestTime}\n` +
        `UserAgent=${userAgent}\n` +
        `Crawler detected, this impression will not be recorded.\n`
      )
    };
    return
  }

  const store = getStore({
    name: "netlify-baseline",
    consistency: "strong",
  });

  // increment the count for today
  const today = new Date().toISOString().split("T")[0];
  const bucket = Math.floor(Math.random() * 25)
    .toString()
    .padStart(4, "0");
  const key = `counts/${today}/${bucket}`;
  const current = (await store.get(key, { type: "json" })) ?? {};

  let browserName: string = "";
  let version: string = "";
  if (ua.browser.name === undefined) {
    browserName = "undefined";
    version = "unknown";
  }
  else {
    const browserData = getBrowserNameAndVersion(ua, userAgent);
    browserName = browserData.browserName;
    version = browserData.version;
  }

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
    // debugMessage += `Incremented ${browserName} version ${version} count in key ${key} by 1\n`
  });

  if (debug) {
    console.log(
      `RequestTime=${requestTime}\n` +
      `RequestUrl=${requestUrl}\n` +
      `UserAgent=${userAgent}\n` +
      (!browserMappings.hasOwnProperty(ua.browser.name ?? 'unknown')
        ? `Browser ${ua.browser.name} will not be mapped to a browser in baseline-browser-mapping.\n`
        : ``) +
      ((ua.device.type === "mobile" && ua.device.vendor === "Apple" && ua.browser.name != "Mobile Safari")
        ? `detected iOS device with non-Safari browser\n`
        : ``) +
      (!browserMappings.hasOwnProperty(ua.browser.name ?? 'unknown')
        ? `Browser ${ua.browser.name} will not be mapped to a browser in baseline-browser-mapping.\n`
        : `UAParserResult: browser.name = ${ua.browser.name}, browser.version = ${ua.browser.version}, device.vendor = ${ua.device.vendor}, device.type = ${ua.device.type}\n` +
        `Incremented ${browserName} version ${version} count in key ${key} by 1\n`)
    )
  };

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
      await store.delete(blob.key).then(value => {
        console.log(`Cleared blob ${blob.key}`)
      });
    }
  }
  return
}
