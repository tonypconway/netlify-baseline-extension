import { z } from "zod";

export const SiteSettings = z.object({
  analyticsMode: z.boolean().optional(),
});

export type SiteSettings = z.infer<typeof SiteSettings>;