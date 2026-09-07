const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
// biome-ignore lint/correctness/noGlobalDirnameFilename: this file is CommonJS — Metro `require`s it, so `import.meta` is not available here.
const config = getDefaultConfig(__dirname);

module.exports = config;
