import { copyFileSync } from 'fs';

const copyScript = (source, dest) => {
  copyFileSync(
    process.cwd() + '/node_modules/' + source,
    './src/ua-parser-js/' + dest
  )
}

const sourceDestMappings = [
  ["ua-parser-js/src/main/ua-parser.d.ts", "main/ua-parser.d.ts"],
  ["ua-parser-js/src/main/ua-parser.mjs", "main/ua-parser.mjs"],
  ["ua-parser-js/src/enums/ua-parser-enums.mjs", "enums/ua-parser-enums.mjs"],
  ["ua-parser-js/src/extensions/ua-parser-extensions.mjs", "extensions/ua-parser-extensions.mjs"],
  ["ua-parser-js/src/helpers/ua-parser-helpers.mjs", "helpers/ua-parser-helpers.mjs"],
  ["detect-europe-js/dist/esm/index.js", "helpers/detect-europe-js/index.js"],
  ["ua-is-frozen/dist/esm/index.js", "helpers/ua-is-frozen/index.js"],
  ["is-standalone-pwa/dist/esm/index.js", "helpers/is-standalone-pwa/index.js"],
]

sourceDestMappings.forEach(([source, dest]) => {
  copyScript(source, dest)
})
