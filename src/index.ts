import { NetlifyExtension } from "@netlify/sdk";

const extension = new NetlifyExtension();

extension.addEdgeFunctions("./src/edge-functions", {
  prefix: "baseline",
  shouldInjectFunction: ({ name }) => {
    if (name === "ef" && process.env["BASELINE_ANALYTICS"]) {
      return true;
    }
    return false;
  },
});

export { extension };
