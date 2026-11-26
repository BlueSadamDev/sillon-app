// Configuration de Metro (l'outil qui assemble le code JavaScript de l'app).
// Lot 7.0 : Yjs (par sa bibliothèque lib0) demande « isomorphic-webcrypto » pour tirer des
// nombres au hasard sous React Native. Ce module n'est pas installé : on le remplace par une
// petite cale qui tire au sort avec libsodium (déjà dans l'app), sans dépendance de plus.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const WEBCRYPTO_SHIM = path.resolve(__dirname, 'src/sync/essai/webcryptoShim.ts');
const upstream = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'isomorphic-webcrypto/src/react-native') {
    return { type: 'sourceFile', filePath: WEBCRYPTO_SHIM };
  }
  return (upstream ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
