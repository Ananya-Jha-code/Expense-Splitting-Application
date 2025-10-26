/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   experimental: {
//     turbo: true, // enable Turbopack
//   },
//   transpilePackages: ["convex/react-clerk"], // ensure this package is transpiled safely
//   webpack: (config) => {
//     // Forcing this package to use Node platform for bundling
//     config.experiments = config.experiments || {};
//     if (!config.resolve) config.resolve = {};
//     if (!config.resolve.fallback) config.resolve.fallback = {};
    
//     // Node-only modules used by convex/react-clerk
//     config.resolve.fallback.fs = false;
//     config.resolve.fallback.stream = false;
//     config.resolve.fallback.zlib = false;

//     return config;
//   },
// };

// export default nextConfig;