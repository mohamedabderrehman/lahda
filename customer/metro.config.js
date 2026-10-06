// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Force @rnmapbox/maps to resolve to the native build so Node/Metro don't load the web build (which requires mapbox-gl).
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@rnmapbox/maps' && platform !== 'web') {
    const nativeEntry = path.join(__dirname, 'node_modules', '@rnmapbox', 'maps', 'lib', 'module', 'index.native.js');
    return {
      filePath: nativeEntry,
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
