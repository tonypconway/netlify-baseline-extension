import {
  SiteConfigurationSurface
} from "@netlify/sdk/ui/react/components";
import { Analytics } from "../components/analytics";

export const SiteConfiguration = () => {
  return (
    <SiteConfigurationSurface>
      <Analytics />
    </SiteConfigurationSurface>
  );
};
