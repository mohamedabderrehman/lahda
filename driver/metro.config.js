const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname)];

// Force @rnmapbox/maps to resolve to native build so Metro doesn't load the web build (which requires mapbox-gl).
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@rnmapbox/maps' && platform !== 'web') {
    const nativeEntry = path.join(__dirname, 'node_modules', '@rnmapbox', 'maps', 'lib', 'module', 'index.native.js');
    return { filePath: nativeEntry, type: 'sourceFile' };
  }
  return defaultResolveRequest ? defaultResolveRequest(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
