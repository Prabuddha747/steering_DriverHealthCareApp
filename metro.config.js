// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude macOS resource fork files (._*) from bundling - they are binary metadata, not source.
config.resolver.blockList = [
  ...(config.resolver.blockList ?? []),
  /[\/\\]\.[_]+.*/,  // macOS resource forks: ._file or .__file (e.g. ._explore.tsx, .__layout.tsx)
];

module.exports = config;
