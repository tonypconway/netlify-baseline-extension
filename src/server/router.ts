import { TRPCError } from "@trpc/server";
import { procedure, router } from "./trpc.js";
import { SiteSettings } from "../schema/site-configuration.js";
import { z } from "zod";

type BrowserData = {
  [browserName: string]: {
    [version: string]: {
      count: number;
    };
  };
}

const getEnvVariable = (env: any, id: string) => {
  const variableData = env.find((variable: any) => variable.key === id);
  if (variableData) {
    const values = variableData.values;
    return ['true', 'TRUE'].includes(values[0].value) ? true : false
  } else return false
}

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
      if (!siteConfig || !siteConfig === null) {
        console.log("No site config found");
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
      // .mutation(async ({ ctx: { teamId, siteId, client }, input }) => {
      .mutation(async (opts) => {
        const { ctx, input } = opts;
        const { teamId, siteId, client } = ctx;

        console.log("setAnalyticsMode", input);
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
              debugUi: false,
            } satisfies SiteSettings);
          await client.upsertSiteConfiguration(teamId, siteId, {
            ...currentConfig,
            ...input,
          });

          if (input.analyticsMode) {
            console.log("Attempting to set analytics mode");
            await client.createOrUpdateVariable({
              accountId: teamId,
              siteId,
              key: "BASELINE_ANALYTICS",
              value: "1",
              scopes: ["builds"],
            });
            await client.createOrUpdateVariable({
              accountId: teamId,
              siteId,
              key: "BASELINE_ANALYTICS_DEBUG_EDGE_FUNCTION",
              value: "false",
              scopes: ["builds"],
            });
          } else {
            console.log("Attempting to delete analytics mode");
            await client.deleteEnvironmentVariables({
              accountId: teamId,
              siteId,
              variables: [
                "BASELINE_ANALYTICS",
                "BASELINE_ANALYTICS_DEBUG_USEFAKEDATA",
                "BASELINE_ANALYTICS_DEBUG_EDGE_FUNCTION"
              ],
            });
          }

          if (input.redeploy) {
            console.log("Attempting to redeploy site");
            await client.redeploySite({ siteId });
          }
        } catch (e: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to save team configuration",
            cause: e,
          });

        }
      }),
  },

  bbm: procedure.query(async () => {
    const response = await fetch("https://web-platform-dx.github.io/baseline-browser-mapping/with_downstream/all_versions_object_with_supports.json");
    const bbm = await response.json();
    return bbm;
  }),

  debugSettings: {
    query: procedure.query(async ({ ctx: { teamId, siteId, client } }) => {
      if (!teamId || !siteId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "teamId and siteId are required",
        });
      }
      const envVariables = await client.getEnvironmentVariables({
        accountId: teamId,
        siteId,
      });

      let currentConfig: any =
        (await client.getSiteConfiguration(teamId, siteId))?.config ??
        ({
          debugUi: false,
        } satisfies SiteSettings);

      let debug = {
        debugUi: currentConfig.debugUi ?? false,
        logEdgeFunction: getEnvVariable(envVariables, "BASELINE_ANALYTICS_DEBUG_EDGE_FUNCTION"),
        useFakeData: getEnvVariable(envVariables, "BASELINE_ANALYTICS_DEBUG_USEFAKEDATA"),
      };
      return debug;
    }),

    setDebugSettings: procedure
      .input(
        z.object({
          debugUi: z.boolean().optional(),
          logEdgeFunction: z.boolean().optional(),
          redeploy: z.boolean().optional(),
        })
      )
      // .mutation(async ({ ctx: { teamId, siteId, client }, input }) => {
      .mutation(async (opts) => {
        const { ctx, input } = opts;
        const { teamId, siteId, client } = ctx;

        console.log("setDebugSettings", input);
        if (!teamId || !siteId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "teamId and siteId are required",
          });
        }
        try {
          if (input.debugUi != undefined) {
            let currentConfig: any =
              (await client.getSiteConfiguration(teamId, siteId))?.config ??
              ({
                debugUi: false,
              } satisfies SiteSettings);
            await client.upsertSiteConfiguration(teamId, siteId, {
              ...currentConfig,
              ...input,
            });
          }
          if (input.logEdgeFunction != undefined) {
            await client.createOrUpdateVariable({
              accountId: teamId,
              siteId,
              key: "BASELINE_ANALYTICS_DEBUG_EDGE_FUNCTION",
              value: `${input.logEdgeFunction}`,
              scopes: ["builds"],
            });
          }
          if (input.redeploy) {
            console.log("Attempting to redeploy site");
            await client.redeploySite({ siteId });
          }
        }
        catch (e: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to save team configuration",
            cause: e,
          });
        }
      }),

    deleteAllData: procedure
      .input(z.object({
        deleteAllData: z.boolean().optional(),
      }))
      .mutation(async (opts) => {
        const { ctx, input } = opts;
        const { teamId, siteId, client } = ctx;
        if (!siteId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "siteId is required",
          });
        }
        const store = client.getBlobStore(siteId, "netlify-baseline");
        const datesBlobs = await store.list();
        datesBlobs.blobs.forEach(({ key }) => {
          store.delete(key);
        });
      })
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
              async ({ key }) => {
                return ((await store.get(key, { type: "json" })) ?? {}) as BrowserData
              }
            )
          )
        ).reduce((acc: BrowserData, data: BrowserData) => {
          // START: Baseline code
          Object.entries(data).forEach(([browserName, browsers]) => {
            if (!acc[browserName]) {
              acc[browserName] = {};
            }
            Object.entries(browsers).forEach(([version, versionData]) => {
              if (!acc[browserName][version]) {
                acc[browserName][version] = { count: 0 };
              }
              acc[browserName][version].count += versionData.count;
            });
          })
          // END: Baseline code
          return acc;
        }, {} as BrowserData);
      })
    );
    return analyticsData;
  }),
});

export type AppRouter = typeof appRouter;
