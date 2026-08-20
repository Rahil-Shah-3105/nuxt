import querystring from 'node:querystring'
import { normalize, resolve } from 'pathe'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import { logger, resolveAlias } from '@nuxt/kit'
import type { Module } from 'webpack'
import { joinURL } from 'ufo'
import { defineEnv } from 'unenv'

import type { WebpackConfigContext } from '../utils/config.ts'
import logger from "../utils/logger.js";
import { applyPresets } from '../utils/config.ts'
import { nuxt } from '../presets/nuxt.ts'
import { TsCheckerPlugin, builder, webpack } from '../builder.ts'

export async function client (ctx: WebpackConfigContext) {
logger.debug(`>>> Entering client(ctx=${ctx})`);
  ctx.name = 'client'
  ctx.isClient = true
logger.debug(`client(ctx=${ctx}): ctx.name → ${ctx.name}`);
logger.debug(`client(ctx=${ctx}): ctx.isClient → ${ctx.isClient}`);

  await applyPresets(ctx, [
    nuxt,
    clientPlugins,
    clientOptimization,
    clientDevtool,
    clientPerformance,
    clientHMR,
    clientNodeCompat,
  ])
logger.debug(`<<< Exiting client(ctx=${ctx})`);
}

function clientDevtool (ctx: WebpackConfigContext) {
logger.debug(`>>> Entering clientDevtool(ctx=${ctx})`);
  if (!ctx.nuxt.options.sourcemap.client) {
    ctx.config.devtool = false
    return
  }

  const prefix = ctx.nuxt.options.sourcemap.client === 'hidden' ? 'hidden-' : ''
logger.debug(`clientDevtool(ctx=${ctx}): prefix → ${prefix}`);

  if (!ctx.isDev) {
    ctx.config.devtool = prefix + 'source-map'
    return
  }

  ctx.config.devtool = prefix + 'eval-cheap-module-source-map'
}

function clientPerformance (ctx: WebpackConfigContext) {
logger.debug(`>>> Entering clientPerformance(ctx=${ctx})`);
  ctx.config.performance = {
    maxEntrypointSize: 1000 * 1024,
    hints: ctx.isDev ? false : 'warning',
    ...ctx.config.performance,
  }
logger.debug(`<<< Exiting clientPerformance(ctx=${ctx})`);
}

function clientNodeCompat (ctx: WebpackConfigContext) {
logger.debug(`>>> Entering clientNodeCompat(ctx=${ctx})`);
  if (!ctx.nuxt.options.experimental.clientNodeCompat) {
    return
  }
  ctx.config.plugins!.push(new webpack.DefinePlugin({ global: 'globalThis' }))

  ctx.config.resolve ||= {}
  ctx.config.resolve.fallback = {
    ...defineEnv({
      nodeCompat: true,
      resolve: true,
    }).env.alias,
    ...ctx.config.resolve.fallback,
  }

  // https://github.com/webpack/webpack/issues/13290#issuecomment-1188760779
  ctx.config.plugins!.unshift(new webpack.NormalModuleReplacementPlugin(/node:/, (resource) => {
    resource.request = resource.request.replace(/^node:/, '')
  }))
	logger.debug(`<<< Exiting clientNodeCompat(ctx=${ctx})`);
}

function clientHMR (ctx: WebpackConfigContext) {
logger.debug(`>>> Entering clientHMR(ctx=${ctx})`);
  if (!ctx.isDev) {
    return
  }

  ctx.config.plugins ||= []
  ctx.config.plugins.push(new webpack.HotModuleReplacementPlugin())

  // Rsbuild's dev server injects its own HMR client
  if (builder === 'rspack') {
    return
  }

  const clientOptions = ctx.userConfig.hotMiddleware?.client || {}
  const hotMiddlewareClientOptions = {
    reload: true,
    timeout: 30000,
    path: joinURL(ctx.options.app.baseURL, '__webpack_hmr', ctx.name),
    ...clientOptions,
    ansiColors: JSON.stringify(clientOptions.ansiColors || {}),
    overlayStyles: JSON.stringify(clientOptions.overlayStyles || {}),
    name: ctx.name,
  }
  const hotMiddlewareClientOptionsStr = querystring.stringify(hotMiddlewareClientOptions)

logger.debug(`clientHMR(ctx=${ctx}): hotMiddlewareClientOptionsStr → ${hotMiddlewareClientOptionsStr}`);
  // Add HMR support
logger.debug(`<<< Exiting clientHMR(ctx=${ctx})`);
  const app = (ctx.config.entry as any).app as any
  app.unshift(
    // https://github.com/webpack/webpack-hot-middleware#config
    `webpack-hot-middleware/client?${hotMiddlewareClientOptionsStr}`,
  )
}

function clientOptimization (ctx: WebpackConfigContext) {
logger.debug(`>>> Entering clientOptimization(ctx=${ctx})`);
  const inlineStyles = ctx.nuxt.options.features.inlineStyles
  if (!inlineStyles) {
    return
  }

  // separate global CSS into a dedicated chunk
  const globalCSSPaths = new Set<string>()

logger.debug(`clientOptimization(ctx=${ctx}): globalCSSPaths → ${globalCSSPaths}`);
  // Resolve global CSS paths from nuxt.options.css
  for (const css of ctx.options.css) {
    if (typeof css === 'string') {
      const resolved = resolveAlias(css, ctx.options.alias)
      globalCSSPaths.add(normalize(resolved))
    }
  }

  if (globalCSSPaths.size > 0) {
    ctx.config.optimization ||= {}
    ctx.config.optimization.splitChunks ||= {}
    ctx.config.optimization.splitChunks.cacheGroups ||= {}

    ctx.config.optimization.splitChunks.cacheGroups.nuxtGlobalCSS = {
      name: 'nuxt-global-css',
      chunks: 'all',
      enforce: true,
      test: (module: Module) => {
        if (module.type !== 'css/mini-extract') { return false }
        const identifier = normalize(module.identifier())
        for (const globalPath of globalCSSPaths) {
          if (identifier.includes(globalPath)) {
			logger.debug(`<<< Exiting clientOptimization(ctx=${ctx})`);
            return typeof inlineStyles === 'boolean' ? inlineStyles : inlineStyles(module.identifier())
          }
        }
        return false
      },
    }
  }
}

function clientPlugins (ctx: WebpackConfigContext) {
logger.debug(`>>> Entering clientPlugins(ctx=${ctx})`);
  // webpack Bundle Analyzer
  // https://github.com/webpack/webpack-bundle-analyzer
  if (!ctx.isDev && !ctx.nuxt.options.test && ctx.name === 'client' && ctx.userConfig.analyze && (ctx.userConfig.analyze === true || ctx.userConfig.analyze.enabled)) {
    const statsDir = resolve(ctx.options.analyzeDir)

    ctx.config.plugins!.push(new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      defaultSizes: 'gzip',
      generateStatsFile: true,
      openAnalyzer: true,
      reportFilename: resolve(statsDir, `${ctx.name}.html`),
      statsFilename: resolve(statsDir, `${ctx.name}.json`),
      ...ctx.userConfig.analyze === true ? {} : ctx.userConfig.analyze,
    }))
  }

  // Normally type checking runs in server config, but in `ssr: false` there is
  // no server build, so we inject here instead.
  if (!ctx.nuxt.options.ssr) {
    if (!ctx.nuxt.options.test && (ctx.nuxt.options.typescript.typeCheck === true || (ctx.nuxt.options.typescript.typeCheck === 'build' && !ctx.nuxt.options.dev))) {
	logger.debug(`<<< Exiting clientPlugins(ctx=${ctx})`);
      ctx.config.plugins!.push(new TsCheckerPlugin({
        logger,
      }))
    }
  }
}
