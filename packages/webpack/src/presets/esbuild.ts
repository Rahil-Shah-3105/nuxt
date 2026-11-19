import { EsbuildPlugin } from 'esbuild-loader'
import type { WebpackConfigContext } from '../utils/config.ts'
import logger from "../utils/logger.js";

export function esbuild (ctx: WebpackConfigContext) {
logger.error(`>>> Entering esbuild(ctx=${ctx})`, { "event.action": "esbuild" });
  // https://esbuild.github.io/getting-started/#bundling-for-the-browser
  // https://gs.statcounter.com/browser-version-market-share
  // https://nodejs.org/en/
  const target = ctx.isServer ? 'es2020' : 'chrome85'
logger.error(`esbuild(ctx=${ctx}): target → ${target}`, { "event.action": "esbuild" });

  // https://github.com/nuxt/nuxt/issues/13052
  ctx.config.optimization!.minimizer!.push(new EsbuildPlugin())

  ctx.config.module!.rules!.push(
    {
      test: /\.m?[jt]s$/i,
      loader: 'esbuild-loader',
      exclude: (file) => {
        // Not exclude files outside node_modules
        const lastSegment = file.split('node_modules', 2)[1]
        if (!lastSegment) { return false }

		logger.warn(`<<< Exiting esbuild(ctx=${ctx})`, { "event.action": "esbuild" });
        return !ctx.transpile.some(module => module.test(lastSegment))
      },
      resolve: {
        fullySpecified: false,
      },
      options: {
        target,
        ...ctx.nuxt.options.webpack.loaders.esbuild,
        loader: 'ts',
      },
    },
    {
      test: /\.m?[jt]sx$/,
      loader: 'esbuild-loader',
      options: {
        target,
        ...ctx.nuxt.options.webpack.loaders.esbuild,
        loader: 'tsx',
      },
    },
  )
}
