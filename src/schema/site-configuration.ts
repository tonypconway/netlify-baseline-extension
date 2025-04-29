import { z } from "zod";

export const SiteSettings = z.object({
  analyticsMode: z.boolean().optional(),
  debugUi: z.boolean().optional(),
  logEdgeFunction: z.boolean().optional(),
});

export type SiteSettings = z.infer<typeof SiteSettings>;