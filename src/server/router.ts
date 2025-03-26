import { TRPCError } from "@trpc/server";
import { procedure, router } from "./trpc.js";
import { SiteSettings } from "../schema/site-configuration.js";
import { z } from "zod";

export const appRouter = router({
  siteSettings: {
    query: procedure.query(async ({ ctx: { teamId, siteId, client } }) => {
      if (!teamId || !siteId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "teamId and siteId are required",
        });
      }
      const siteConfig = await client.getSiteConfiguration(teamId, siteId);
      if (!siteConfig) {
        return;
      }
      const result = SiteSettings.safeParse({
        analyticsMode: false,
        ...(siteConfig.config as any),
      });
      if (!result.success) {
        console.warn(
          "Failed to parse site settings",
          JSON.stringify(result.error, null, 2)
        );
      }
      return result.data;
    }),

    setAnalyticsMode: procedure
      .input(
        z.object({
          analyticsMode: z.boolean(),
          redeploy: z.boolean(),
        })
      )
      .mutation(async ({ ctx: { teamId, siteId, client }, input }) => {
        if (!teamId || !siteId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "teamId and siteId are required",
          });
        }
        try {
          let currentConfig: any =
            (await client.getSiteConfiguration(teamId, siteId))?.config ??
            ({
              analyticsMode: false,
            } satisfies SiteSettings);
          await client.upsertSiteConfiguration(teamId, siteId, {
            ...currentConfig,
            ...input,
          });

          if (input.analyticsMode) {
            await client.createOrUpdateVariable({
              accountId: teamId,
              siteId,
              key: "BASELINE_ANALYTICS",
              value: "1",
            });
          } else {
            await client.deleteEnvironmentVariables({
              accountId: teamId,
              siteId,
              variables: ["BASELINE_ANALYTICS"],
            });
          }

          if (input.redeploy) {
            await client.redeploySite({ siteId });
          }
        } catch (e) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to save team configuration",
            cause: e,
          });
        }
      }),
  },

  analytics: procedure.query(async ({ ctx: { teamId, siteId, client } }) => {
    if (!teamId || !siteId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "teamId and siteId are required",
      });
    }

    const store = client.getBlobStore(siteId, "netlify-baseline");
    const analyticsData = await Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split("T")[0];
      }).map(async (date) => {
        const prefix = `counts/${date}/`;
        const { blobs } = await store.list({ prefix });
        return (
          await Promise.all(
            blobs.map(
              async ({ key }) =>
                ((await store.get(key, { type: "json" })) ?? {}) as Record<
                  string,
                  number
                > // PUT SOME VALID TYPE HERE FOR THE JSON, OR TYPESCRIPT COMPLAINS
            )
          )
        ).reduce((acc, data) => {
          // START: Baseline code
          void data; // this is your JSON, do with it what you want
          void acc; // update the acc;
          // END: Baseline code
          return acc;
        }, {} as Record<string, { chrome: number; firefox: number }>); // PUT WHATEVER TYPE YOU TO RETURN HERE
      })
    );
    return analyticsData;
  }),
});

export type AppRouter = typeof appRouter;
