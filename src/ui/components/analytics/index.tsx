import {
  Button,
  Card,
  CardLoader,
  CardTitle,
} from "@netlify/sdk/ui/react/components";
import { trpc } from "../../trpc";
import * as React from "react";

type BrowserData = {
  [browserName: string]: {
    [version: string]: {
      count: number;
    };
  };
}

type BaselineYears = { [key: string]: { year: number; count: number; }; }

type ProcessedData = {
  baselineYears: BaselineYears;
  waCompatibleWeights: { [key: string]: number; };
  totalRecognisedImpressions: number;
  totalUnrecognisedImpressions: number;
  debugUi?: boolean;
  debugData?: any;
}

const baselineYearsTest: BaselineYears = {
  "2016": { "year": 2016, "count": 10 },
  "2017": { "year": 2017, "count": 10 },
  "2018": { "year": 2018, "count": 20 },
  "2019": { "year": 2019, "count": 30 },
  "2020": { "year": 2020, "count": 1000 },
  "2021": { "year": 2021, "count": 5000 },
  "2022": { "year": 2022, "count": 10000 },
  "2023": { "year": 2023, "count": 15000 },
  "2024": { "year": 2024, "count": 25000 },
  "2025": { "year": 2025, "count": 15000 }
}

const testData: ProcessedData = {
  baselineYears: baselineYearsTest,
  totalRecognisedImpressions: Object.entries(baselineYearsTest).reduce((acc, [_, { count }]) => acc + count, 0),
  totalUnrecognisedImpressions: 1000,
  waCompatibleWeights: {
    true: 66950,
    false: 4120
  },
}

const flattenDays = (data: BrowserData[]): BrowserData => {
  const output = {} as BrowserData;
  data.forEach((day) => {
    Object.entries(day).forEach(([browserName, versions]) => {
      if (!output[browserName]) {
        output[browserName] = {};
      }
      Object.entries(versions).forEach(([version, { count }]) => {
        if (!output[browserName][version]) {
          output[browserName][version] = { count: 0 };
        }
        output[browserName][version].count += count;
      });
    });
  });
  return output;
}

const processAnalyticsData = (
  data: BrowserData[],
  bbm: any,
  debugUi: boolean,
  debugUseFakeData: boolean
): ProcessedData => {
  let totalUnrecognisedImpressions: number = 0;
  const waCompatibleWeights: { [key: string]: number } = {
    true: 0,
    false: 0
  };
  let nextYear = new Date().getFullYear() + 1;

  let baselineYears = [...Array(nextYear).keys()].slice(2016).reduce((acc, year) => {
    return { ...acc, [year.toString()]: { year: year, count: 0 } }
  }, {} as { [key: string]: { year: number, count: number } });

  const flattenedData = flattenDays(data);

  Object.entries(flattenedData).forEach(([browserName, versions]) => {
    Object.entries(versions).forEach(([version, { count }]) => {
      if (bbm[browserName] && bbm[browserName][version]) {
        const versionYear: string = bbm[browserName][version]?.year;
        const waCompatible: boolean = bbm[browserName][version]?.waCompatible;
        baselineYears[versionYear].count += count;
        waCompatibleWeights[waCompatible.toString()] += count;
      }
      else totalUnrecognisedImpressions += Object.values(versions).reduce((acc, { count }) => acc + count, 0);
    })
  });

  const totalRecognisedImpressions = Object.values(baselineYears).reduce((acc, { count }) => acc + count, 0);

  let output: ProcessedData = {
    baselineYears: baselineYears,
    waCompatibleWeights: waCompatibleWeights,
    totalRecognisedImpressions: totalRecognisedImpressions,
    totalUnrecognisedImpressions: totalUnrecognisedImpressions,
    debugUi: debugUi,
  };

  if (debugUseFakeData) {
    output = Object.assign(output, testData);
  }

  if (debugUi) {
    output = {
      ...output,
      debugData: data
    }
  }

  return output;
}

export const Analytics = () => {
  const trpcUtils = trpc.useUtils();
  const siteSettingsQuery = trpc.siteSettings.query.useQuery();
  const analyticsData = trpc.analytics.useQuery();
  const bbm = trpc.bbm.useQuery();
  const debugSettings = trpc.debugSettings.useQuery();
  const processedData: ProcessedData = processAnalyticsData(
    analyticsData.data ?? [],
    bbm.data ?? {},
    debugSettings.data?.debugUi ?? false,
    debugSettings.data?.debugUsefakedata ?? false
  );
  const setAnalyticsModeMutation =
    trpc.siteSettings.setAnalyticsMode.useMutation({
      onSuccess: async () => {
        await trpcUtils.siteSettings.query.invalidate();
      },
    });
  const [showAreYouSure, setShowAreYouSure] = React.useState(false);

  if (
    siteSettingsQuery.isLoading ||
    analyticsData.isLoading ||
    !analyticsData.data
  ) {
    return <CardLoader />;
  }

  const dateLabels = Array.from({ length: 7 }, (_, i) => {
    const utcDate = new Date();
    utcDate.setUTCDate(utcDate.getUTCDate() - i);
    return utcDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  });

  if (!siteSettingsQuery.data?.analyticsMode) {
    return (
      <Card>
        <CardTitle>Analytics are disabled</CardTitle>
        {/* BASELINE: some beautiful disabled state preview of the analytics */}
        <h3>Collect browser traffic analytics data</h3>
        <p>
          Collect analytics on browser traffic with an edge function and blobs.
        </p>
        <p className="tw-text-sm tw-mb-4">
          Data will only be collected while this setting is enabled, after the
          site is redeployed. It will not show historical data.
        </p>
        <Button
          onClick={() =>
            setAnalyticsModeMutation.mutateAsync({
              analyticsMode: true,
              redeploy: true,
            })
          }
        >
          Enable analytics and deploy site
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>Baseline Browser Analytics</CardTitle>
      <br />
      <h3>Traffic in the last 7 days</h3>
      <p className="tw-text-sm">
        Data from {dateLabels[6]} to {dateLabels[0]}. The data is in UTC.
        Current time is{" "}
        {new Date().toLocaleString("en-US", {
          timeZone: "UTC",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        })}
        .
      </p>
      <p className="tw-text-sm">Numbers are approximate.</p>
      <div style={{ display: 'flex', gap: '2em' }}>
        <div>
          <h3>Baseline yearly feature set support</h3>
          <p>
            This table shows the percentage of your users that can support
            all the features that were Baseline Newly available at the end of
            each calendar year back to 2016.
          </p>
          <div style={{ width: '200px', marginTop: '1em' }}>
            {
              Object.entries(processedData.baselineYears)
                // Only show a year if it represents greater than 0.05% of overall impressions
                .filter(([_, { count }]) => count > (processedData.totalRecognisedImpressions * 0.0005))
                .map(([year, { count }], index, array) => (
                  <div
                    key={year}
                    style={{
                      height: `${(count / processedData.totalRecognisedImpressions) * 500}px`,
                      backgroundColor: `rgba(51, 103, 214, ${(array.length - index) / array.length})`, // Baseline Newly blue with decreasing transparency
                      minHeight: '2.1em',
                      padding: '0.2em 0.5em',
                      borderBottom: `${index != array.length - 1 ? '1px solid darkgray' : 'none'}`,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'top',
                      justifyContent: 'left',
                      gap: '0.2em',
                    }}
                  >
                    <span>Baseline {year} </span>
                    <span>({Math.round(
                      array
                        .slice(index)
                        .reduce((acc, [_, { count }]) => acc + count, 0) /
                      processedData.totalRecognisedImpressions *
                      100
                    )}%)</span>
                  </div>
                ))}
          </div>
        </div>
        <div>
          <div>
            <h3>Baseline Widely available support</h3>
            <p>
              This table shows the percentage of impressions you delivered to a browser that supports the Baseline Widely available feature set.
            </p>
            <div style={{ width: '200px', height: '500px', marginTop: '1em' }}>
              <div style={{
                backgroundColor: 'rgba(9, 153, 73, 1)',
                height: `${processedData.waCompatibleWeights.true / processedData.totalRecognisedImpressions * 100}%`,
                minHeight: '3.5em',
                padding: '0.2em 0.5em',
                color: 'white',
                display: 'flex',
              }}
              >
                <span>Widely available supported ({Math.round(processedData.waCompatibleWeights.true / processedData.totalRecognisedImpressions * 100)}%)</span>
              </div>
              <div style={{
                backgroundColor: 'darkgrey',
                height: `${processedData.waCompatibleWeights.false / processedData.totalRecognisedImpressions * 100}%`,
                minHeight: '3.5em',
                padding: '0.2em 0.5em',
                color: 'white',
                display: 'flex',
              }}>
                <span>Widely available unsupported ({Math.round(processedData.waCompatibleWeights.false / (processedData.totalRecognisedImpressions) * 100)}%)</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div>
        <h3>Notes on data used for these tables</h3>
        <p className="tw-text-sm">
          This extension uses a Netlify edge function which is triggered by all the requests that your site receives that are not for image, video, audio, font, script, or style resources. The edge function uses <a href="https://uaparser.dev/">UAParser.js</a> to parse the user agent string and determine the browser and its version. The data is stored in a Netlify blob with a 7-day window. The browser names and versions are matched to Baseline years and Widely available support status using data from the W3C WebDX Community Group's <a href="https://npmjs.com/baseline-browser-mapping">baseline-browser-mapping</a> module.
        </p>
        <p className="tw-text-sm">
          {processedData.totalRecognisedImpressions} requests were made to your site in the last 7 days from browsers that this extension could categorise. {processedData.totalUnrecognisedImpressions} impressions were from browsers that this extension could not categorise.
        </p>
      </div>
      <p>{JSON.stringify(debugSettings.data)}</p>
      <pre hidden={!processedData.debugUi}>
        {JSON.stringify(processedData, null, 2)};
      </pre>

      {/* BASELINE: some beautiful chart and stuff using the data from analyticsData.data */}
      <Button
        variant="danger"
        className="tw-mt-4"
        onClick={() => setShowAreYouSure((prev) => !prev)}
      >
        Disable analytics and deploy site
      </Button>
      {
        showAreYouSure && (
          <div className="tw-mt-4 tw-ml-4">
            <h3>Are you sure?</h3>
            <div className="tw-mt-4 tw-flex tw-gap-4">
              <Button level="secondary" onClick={() => setShowAreYouSure(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  await setAnalyticsModeMutation.mutateAsync({
                    analyticsMode: false,
                    redeploy: true,
                  });
                  setShowAreYouSure(false);
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        )
      }
    </Card >
  );
};
