const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure assets are resolved correctly
config.resolver.assetExts.push(
  // Adds support for `.db` files for SQLite databases
  'db',
  'mp3',
  'ttf',
  'obj',
  'png',
  'jpg'
);

module.exports = config;

