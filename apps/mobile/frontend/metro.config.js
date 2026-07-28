// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// socket.io-client → engine.io-client publica un build ESM cuyo package.json
// "exports" no declara sus subpaths internos (./contrib/parseuri.js), lo que
// rompe la resolución de Metro cuando usa el campo "exports". Se desactiva
// para que caiga de vuelta a la resolución clásica por "main" (build CJS).
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
