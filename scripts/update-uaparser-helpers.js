import { copyFileSync, readFileSync, writeFileSync } from 'fs';

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
  // ["ua-parser-js/src/helpers/ua-parser-helpers.mjs", "helpers/ua-parser-helpers.mjs"],
  ["detect-europe-js/dist/esm/index.js", "helpers/detect-europe-js/index.js"],
  ["ua-is-frozen/dist/esm/index.js", "helpers/ua-is-frozen/index.js"],
  ["is-standalone-pwa/dist/esm/index.js", "helpers/is-standalone-pwa/index.js"],
]

sourceDestMappings.forEach(([source, dest]) => {
  copyScript(source, dest)
})

const fixedImports = readFileSync(process.cwd() + '/node_modules/ua-parser-js/src/helpers/ua-parser-helpers.mjs', { encoding: 'utf8' });

writeFileSync(
  './src/ua-parser-js/helpers/ua-parser-helpers.mjs',
  fixedImports.replace(`import { isFromEU } from 'detect-europe-js';
import { isFrozenUA } from 'ua-is-frozen';
import { isStandalonePWA } from 'is-standalone-pwa';`,
    `import { isFromEU } from './detect-europe-js/index.js';
import { isFrozenUA } from './ua-is-frozen/index.js';
import { isStandalonePWA } from './is-standalone-pwa/index.js';`),
  { encoding: 'utf8' }
)