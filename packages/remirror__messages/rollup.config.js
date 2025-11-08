import { defineConfig } from 'rollup';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const packageJson = require('./package.json');

const dependencies = Object.keys({
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
  ...packageJson.peerDependencies,
});

export default defineConfig({
  external: dependencies,
  // Remove unneeded imports
  treeshake: { moduleSideEffects: false },
});
