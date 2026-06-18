// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @anthropic-ai/sdk pulls in Node built-ins (node:fs, node:path, …) via its
// credential-chain code. The React Native runtime has no Node standard library,
// so Metro fails to bundle for iOS/Android. That code path is never exercised
// here — generatePlan.ts always passes an explicit apiKey and never reads a
// credentials file — so we resolve `node:*` imports to empty modules on native.
// Web keeps its existing (known-working) resolution untouched.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== 'web' && moduleName.startsWith('node:')) {
    return { type: 'empty' };
  }
  const resolve = defaultResolveRequest ?? context.resolveRequest;
  return resolve(context, moduleName, platform);
};

module.exports = config;
