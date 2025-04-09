import {
  Button,
  Card,
  CardLoader,
  CardTitle,
} from "@netlify/sdk/ui/react/components";
import { trpc } from "../../trpc";
import * as React from "react";

export const Analytics = () => {
  const trpcUtils = trpc.useUtils();
  const siteSettingsQuery = trpc.siteSettings.query.useQuery();
  const analyticsData = trpc.analytics.useQuery();
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
      <CardTitle>Browser traffic analytics</CardTitle>
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

      {/* BASELINE: some beautiful chart and stuff using the data from analyticsData.data */}
      <Button
        variant="danger"
        className="tw-mt-4"
        onClick={() => setShowAreYouSure((prev) => !prev)}
      >
        Disable analytics and deploy site
      </Button>
      {showAreYouSure && (
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
      )}
    </Card>
  );
};
