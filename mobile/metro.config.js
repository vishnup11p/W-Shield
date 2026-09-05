const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  buffer: require.resolve('buffer/'),
};

// Ignore temporary/hidden npm artifacts from Windows watcher
config.resolver.blockList = [
  /.*node_modules[/\\]@istanbuljs[/\\]\.load-nyc-config-.*/,
  /.*\.git\/.*/,
];

module.exports = config;
