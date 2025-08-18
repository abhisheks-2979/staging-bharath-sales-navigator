module.exports = {
  globDirectory: 'dist/',
  globPatterns: [
    '**/*.{html,js,mjs,css,woff,woff2,ttf,eot,ico,png,jpg,jpeg,svg,gif,webp,json,txt}',
  ],
  globIgnores: [
    '**/node_modules/**/*',
    '**/*.map',
    '**/lovable-uploads/**/*', // User uploads don't need to be precached
  ],
  swSrc: 'public/sw.js',
  swDest: 'dist/sw.js',
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
  cleanupOutdatedCaches: true,
  // Ensure all routes fallback to index.html for SPA navigation
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
};