import {
  Button,
  Card,
  CardLoader,
  CardTitle,
} from "@netlify/sdk/ui/react/components";
import { trpc } from "../../trpc";
import * as React from "react";

const cellStyleTemplate = {
  textAlign: 'right' as const,
  backgroundRepeat: 'no-repeat',
  backgroundSize: '10000% 100%',
}

const tableStyles = {
  container: { maxWidth: '48rem' },
  table: {
    width: '100%',
    margin: '1.5rem 0',
    tableLayout: 'fixed' as const,
    borderCollapse: 'collapse' as const,
    color: 'white',
  },
  bottomSectionRow: {
    borderBottom: '2px solid white'
  },
  row: {
    borderBottom: '1px solid #374151'
  },
  cell: {
    padding: '0.8em 1em',
    textAlign: 'left' as const
  },
  yearCell: {
    ...cellStyleTemplate,
    backgroundImage: `linear-gradient(to left, rgb(51 103 214) 0%, rgb(156, 113, 28) 10%, rgb(100, 4, 4))`,
  },
  widelyCell: {
    ...cellStyleTemplate,
    backgroundImage: `linear-gradient(to left, rgba(9, 153, 73, 1) 0%, rgb(156, 113, 28) 10%, rgb(100, 4, 4))`,
  },
  newlyCell: {
    ...cellStyleTemplate,
    backgroundImage: `linear-gradient(to left, rgba(9, 153, 73, 1) 0%, rgb(156, 113, 28) 10%, rgb(100, 4, 4))`,
  }
}

type BrowserData = {
  [browserName: string]: {
    [version: string]: {
      count: number;
    };
  };
}

type BaselineYears = { [key: string]: { year: number | string; count: number; }; }

type ProcessedData = {
  baselineYears: BaselineYears;
  waCompatibleWeights: { [key: string]: number; };
  naCompatibleWeights: { [key: string]: number; };
  totalRecognisedImpressions: number;
  totalUnrecognisedImpressions: number;
  debugUi?: boolean;
  debugData?: any;
}

const baselineYearsTest: BaselineYears = {
  "pre_baseline": { "year": "pre_baseline", "count": 200 },
  "2015": { "year": 2016, "count": 0 },
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
  totalRecognisedImpressions: Object.entries(baselineYearsTest).reduce((acc, [_, { count, year }]) => {
    return year != 'pre_baseline' ? acc + count : acc
  }, 0),
  totalUnrecognisedImpressions: 1000,
  waCompatibleWeights: {
    true: 66950,
    false: 4120
  },
  naCompatibleWeights: {
    true: 36950,
    false: 34120
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
  useFakeData: boolean
): ProcessedData => {
  let totalUnrecognisedImpressions: number = 0;
  const waCompatibleWeights: { [key: string]: number } = {
    true: 0,
    false: 0
  };
  const naCompatibleWeights: { [key: string]: number } = {
    true: 0,
    false: 0
  };
  let thisYear = new Date().getFullYear();

  let baselineYears = [...Array(thisYear).keys()].slice(2016).reduce((acc, year) => {
    return { ...acc, [year.toString()]: { year: year, count: 0 } }
  }, {} as { [key: string]: { year: number, count: number } });

  const flattenedData = flattenDays(data);

  Object.entries(flattenedData).forEach(([browserName, versions]) => {
    Object.entries(versions).forEach(([version, { count }]) => {
      if (bbm[browserName] && bbm[browserName][version]) {
        const versionYear: string = bbm[browserName][version]?.year;
        const waCompatible: boolean = ['widely', 'newly'].includes(bbm[browserName][version]?.supports);
        const naCompatible: boolean = bbm[browserName][version]?.supports === 'newly';
        baselineYears[versionYear].count += count;
        waCompatibleWeights[waCompatible.toString()] += count;
        naCompatibleWeights[naCompatible.toString()] += count;
      }
      else totalUnrecognisedImpressions += Object.values(versions).reduce((acc, { count }) => acc + count, 0);
    })
  });

  const totalRecognisedImpressions = Object.values(baselineYears).reduce((acc, { count }) => acc + count, 0);

  let output: ProcessedData = {
    baselineYears: baselineYears,
    waCompatibleWeights: waCompatibleWeights,
    naCompatibleWeights: naCompatibleWeights,
    totalRecognisedImpressions: totalRecognisedImpressions,
    totalUnrecognisedImpressions: totalUnrecognisedImpressions,
    debugUi: debugUi,
  };

  if (useFakeData) {
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
  const debugSettings = trpc.debugSettings.query.useQuery();
  const setAnalyticsModeMutation =
    trpc.siteSettings.setAnalyticsMode.useMutation({
      onSuccess: async () => {
        await trpcUtils.siteSettings.query.invalidate();
      },
    });
  const setDebugOptionsMutation =
    trpc.debugSettings.setDebugSettings.useMutation({
      onSuccess: async () => {
        await trpcUtils.debugSettings.query.invalidate();
      },
    });
  const deleteAllDataMutation =
    trpc.debugSettings.deleteAllData.useMutation({
      onSuccess: async () => {
        await trpcUtils.analytics.invalidate();
      },
    });
  const [showAreYouSure, setShowAreYouSure] = React.useState(false);
  const [showAreYouSureDelete, setShowAreYouSureDelete] = React.useState(false);
  const [showDebugOptions, setShowDebugOptions] = React.useState(false);

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

  const processedData: ProcessedData = processAnalyticsData(
    analyticsData.data ?? [],
    bbm.data ?? {},
    debugSettings.data?.debugUi ?? false,
    debugSettings.data?.useFakeData ?? false
  );

  return (
    <Card>
      <CardTitle>Baseline feature support</CardTitle>

      <p>
        This table shows the percentage of your users that can support
        all the features that were Baseline Newly available at the end of
        each calendar year back to 2015, as well as the percentage of users that can use all current Widely available and Newly available features.
      </p>


      <div style={tableStyles.container}>
        <table style={tableStyles.table}>
          <tbody>
            <tr style={tableStyles.bottomSectionRow}>
              <th style={tableStyles.cell}>Baseline</th>
              <th style={{ ...tableStyles.cell, textAlign: 'right' }}>Supported users</th>
            </tr>
            {
              Object.entries(processedData.baselineYears)
                // Only show a year if it represents greater than 0.05% of overall impressions
                .filter(([_, { year }]) => year != 'pre_baseline')
                .map(([year], index, array) => (
                  <tr
                    style={index == array.length - 1 ? tableStyles.bottomSectionRow : tableStyles.row}
                    key={year}>
                    <td style={tableStyles.cell}>Baseline {year} </td>
                    <td
                      style={{
                        ...tableStyles.cell,
                        ...tableStyles.yearCell,
                        backgroundPositionX: `${Math.round(
                          array
                            .slice(index)
                            .reduce((acc, [_, { count }]) => acc + count, 0) /
                          processedData.totalRecognisedImpressions *
                          100)}%`,
                      }}
                    >{(
                      array
                        .slice(index)
                        .reduce((acc, [_, { count }]) => acc + count, 0) /
                      processedData.totalRecognisedImpressions *
                      100
                    ).toFixed(1)}%</td>
                  </tr>
                ))}
            <tr style={tableStyles.row}>
              <td style={tableStyles.cell}>Baseline Widely available</td>
              <td style={{
                ...tableStyles.cell,
                ...tableStyles.widelyCell,
                backgroundPositionX: `${Math.round(processedData.waCompatibleWeights.true / processedData.totalRecognisedImpressions * 100)}%`,
              }}>{(processedData.waCompatibleWeights.true / processedData.totalRecognisedImpressions * 100).toFixed(1)}%</td>
            </tr>
            <tr style={tableStyles.bottomSectionRow}>
              <td style={tableStyles.cell}>Baseline Newly available</td>
              <td style={{
                ...tableStyles.cell,
                ...tableStyles.widelyCell,
                backgroundPositionX: `${Math.round(processedData.naCompatibleWeights.true / processedData.totalRecognisedImpressions * 100)}%`,
              }}>{(processedData.naCompatibleWeights.true / processedData.totalRecognisedImpressions * 100).toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>


      <div>
        <h3>Notes on data used for these tables</h3>
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
        <p className="tw-text-sm" style={{ marginBottom: '1em' }}>Numbers are approximate.</p>
        <p className="tw-text-sm">
          This extension uses a Netlify edge function which is triggered by all the requests that your site receives that are not for image, video, audio, font, script, or style resources. The edge function uses <a href="https://uaparser.dev/">UAParser.js</a> to parse the user agent string and determine the browser and its version. The data is stored in a Netlify blob with a 7-day window. The browser names and versions are matched to Baseline years and Widely available support status using data from the W3C WebDX Community Group's <a href="https://npmjs.com/baseline-browser-mapping">baseline-browser-mapping</a> module.
        </p>
        <p className="tw-text-sm">
          {processedData.totalRecognisedImpressions} requests were made to your site in the last 7 days from browsers that this extension could categorise. {processedData.totalUnrecognisedImpressions} impressions were from browsers that this extension could not categorise.</p>
        <p>
          Requests from crawlers and bots should be filtered out.  If you are seeing impressions in your debug data from a crawler, please make a pull request to add it to the <a href="https://github.com/tonypconway/netlify-baseline-extension/blob/6881588be412970abf96143519391025ebf4e339/src/edge-functions/ef.ts#L128-L164">filter list</a> in the extension code.  Be aware that crawlers and unidentifiable browsers are not used to calculate the figures in the charts above.
        </p>
      </div>

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
      <p>
        <Button
          variant="standard"
          className="tw-mt-4 tw-mb-4"
          onClick={() => setShowDebugOptions((prev) => !prev)}>{!showDebugOptions ? 'Show' : 'Hide'} debug options</Button>
      </p>
      {
        showDebugOptions &&
        <div>

          <Button
            className="tw-mr-4 tw-mb-4 sm:tw-mb-0"
            onClick={async () => {
              await setDebugOptionsMutation.mutateAsync({
                debugUi: !debugSettings.data?.debugUi
              });
            }}>{debugSettings.data?.debugUi ? 'Hide' : 'Show'} debug data</Button>

          <Button
            className="tw-mr-4 tw-mb-4 sm:tw-mb-0"
            onClick={async () => {
              await setDebugOptionsMutation.mutateAsync({
                logEdgeFunction: !debugSettings.data?.logEdgeFunction
              });
            }}>{debugSettings.data?.logEdgeFunction ? 'Disable' : 'Enable'} Edge function logging</Button>

          <Button
            className="tw-mr-4 tw-mb-4 sm:tw-mb-0"
            onClick={() => setShowAreYouSureDelete((prev) => !prev)}
          >Delete all captured data permanently</Button>
          {
            showAreYouSureDelete && (
              <div className="tw-mt-4 tw-ml-4">
                <h3>Are you sure you want to delete all the data you have captured with this extension?</h3>
                <p>This action cannot be reversed.</p>
                <div className="tw-mt-4 tw-flex tw-gap-4">
                  <Button level="secondary" onClick={() => setShowAreYouSureDelete(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={async () => {
                      await deleteAllDataMutation.mutateAsync({
                        deleteAllData: true
                      })
                    }}
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            )
          }

          <pre hidden={!processedData.debugUi}>
            {JSON.stringify(processedData, null, 2)};
          </pre>
        </div>
      }
    </Card >
  );
};
