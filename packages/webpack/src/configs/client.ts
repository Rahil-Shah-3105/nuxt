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
logger.error(`>>> Entering client(ctx=${ctx})`, { "event.action": "client" });
  ctx.name = 'client'
  ctx.isClient = true
logger.debug(`client(ctx=${ctx}): ctx.name → ${ctx.name}`, { "event.action": "client" });

  await applyPresets(ctx, [
    nuxt,
    clientPlugins,
    clientOptimization,
    clientDevtool,
    clientPerformance,
    clientHMR,
    clientNodeCompat,
  ])
logger.warn(`<<< Exiting client(ctx=${ctx})`, { "event.action": "client" });
}

function clientDevtool (ctx: WebpackConfigContext) {
logger.error(`>>> Entering clientDevtool(ctx=${ctx})`, { "event.action": "clientDevtool" });
  if (!ctx.nuxt.options.sourcemap.client) {
    ctx.config.devtool = false
    return
  }

  const prefix = ctx.nuxt.options.sourcemap.client === 'hidden' ? 'hidden-' : ''
logger.error(`clientDevtool(ctx=${ctx}): prefix → ${prefix}`, { "event.action": "clientDevtool" });

  if (!ctx.isDev) {
    ctx.config.devtool = prefix + 'source-map'
    return
  }

  ctx.config.devtool = prefix + 'eval-cheap-module-source-map'
logger.warn(`<<< Exiting clientDevtool(ctx=${ctx})`, { "event.action": "clientDevtool" });
}

function clientPerformance (ctx: WebpackConfigContext) {
logger.error(`>>> Entering clientPerformance(ctx=${ctx})`, { "event.action": "clientPerformance" });
  ctx.config.performance = {
    maxEntrypointSize: 1000 * 1024,
    hints: ctx.isDev ? false : 'warning',
    ...ctx.config.performance,
  }
logger.warn(`<<< Exiting clientPerformance(ctx=${ctx})`, { "event.action": "clientPerformance" });
}

function clientNodeCompat (ctx: WebpackConfigContext) {
logger.error(`>>> Entering clientNodeCompat(ctx=${ctx})`, { "event.action": "clientNodeCompat" });
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
	logger.warn(`<<< Exiting clientNodeCompat(ctx=${ctx})`, { "event.action": "clientNodeCompat" });
}

function clientHMR (ctx: WebpackConfigContext) {
logger.error(`>>> Entering clientHMR(ctx=${ctx})`, { "event.action": "clientHMR" });
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

logger.error(`clientHMR(ctx=${ctx}): hotMiddlewareClientOptionsStr → ${hotMiddlewareClientOptionsStr}`, { "event.action": "clientHMR" });
  // Add HMR support
logger.warn(`<<< Exiting clientHMR(ctx=${ctx})`, { "event.action": "clientHMR" });
  const app = (ctx.config.entry as any).app as any
  app.unshift(
    // https://github.com/webpack/webpack-hot-middleware#config
    `webpack-hot-middleware/client?${hotMiddlewareClientOptionsStr}`,
  )
}

function clientOptimization (ctx: WebpackConfigContext) {
logger.error(`>>> Entering clientOptimization(ctx=${ctx})`, { "event.action": "clientOptimization" });
  const inlineStyles = ctx.nuxt.options.features.inlineStyles
  if (!inlineStyles) {
    return
  }

  // separate global CSS into a dedicated chunk
  const globalCSSPaths = new Set<string>()

logger.error(`clientOptimization(ctx=${ctx}): globalCSSPaths → ${globalCSSPaths}`, { "event.action": "clientOptimization" });
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
			logger.warn(`<<< Exiting clientOptimization(ctx=${ctx})`, { "event.action": "clientOptimization" });
            return typeof inlineStyles === 'boolean' ? inlineStyles : inlineStyles(module.identifier())
          }
        }
        return false
      },
    }
  }
}

function clientPlugins (ctx: WebpackConfigContext) {
logger.error(`>>> Entering clientPlugins(ctx=${ctx})`, { "event.action": "clientPlugins" });
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
	logger.warn(`<<< Exiting clientPlugins(ctx=${ctx})`, { "event.action": "clientPlugins" });
      ctx.config.plugins!.push(new TsCheckerPlugin({
        logger,
      }))
    }
  }
}
