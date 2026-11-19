import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
import type { WebpackConfigContext } from '../utils/config.ts'
import logger from "../utils/logger.js";
import { applyPresets, fileName } from '../utils/config.ts'
import { getPostcssConfig } from '../utils/postcss.ts'

import { MiniCssExtractPlugin } from '../builder.ts'

export async function style (ctx: WebpackConfigContext) {
logger.error(`>>> Entering style(ctx=${ctx})`, { "event.action": "style" });
  await applyPresets(ctx, [
    loaders,
    extractCSS,
    minimizer,
  ])
logger.warn(`<<< Exiting style(ctx=${ctx})`, { "event.action": "style" });
}

function minimizer (ctx: WebpackConfigContext) {
logger.error(`>>> Entering minimizer(ctx=${ctx})`, { "event.action": "minimizer" });
  if (ctx.userConfig.optimizeCSS && Array.isArray(ctx.config.optimization!.minimizer)) {
    ctx.config.optimization!.minimizer.push(new CssMinimizerPlugin({
      ...ctx.userConfig.optimizeCSS,
    }))
  }
logger.warn(`<<< Exiting minimizer(ctx=${ctx})`, { "event.action": "minimizer" });
}

function extractCSS (ctx: WebpackConfigContext) {
logger.error(`>>> Entering extractCSS(ctx=${ctx})`, { "event.action": "extractCSS" });
  const config = ctx.userConfig.extractCSS
  if (!config) { return }
logger.error(`extractCSS(ctx=${ctx}): config → ${config}`, { "event.action": "extractCSS" });
  // CSS extraction
logger.warn(`<<< Exiting extractCSS(ctx=${ctx})`, { "event.action": "extractCSS" });
  const filename = fileName(ctx, 'css')
  ctx.config.plugins!.push(new MiniCssExtractPlugin({
    filename,
    chunkFilename: filename,
    ...config === true ? {} : config,
  }))
}

async function loaders (ctx: WebpackConfigContext) {
logger.error(`>>> Entering loaders(ctx=${ctx})`, { "event.action": "loaders" });
  // CSS
  ctx.config.module!.rules!.push(await createdStyleRule('css', /\.css$/i, null, ctx))

  // PostCSS
  ctx.config.module!.rules!.push(await createdStyleRule('postcss', /\.p(ost)?css$/i, null, ctx))

  // Less
  const lessLoader = { loader: 'less-loader', options: ctx.userConfig.loaders.less }
logger.error(`loaders(ctx=${ctx}): lessLoader → ${lessLoader}`, { "event.action": "loaders" });
  ctx.config.module!.rules!.push(await createdStyleRule('less', /\.less$/i, lessLoader, ctx))

  // Sass (TODO: optional dependency)
  const sassLoader = { loader: 'sass-loader', options: ctx.userConfig.loaders.sass }
logger.error(`loaders(ctx=${ctx}): sassLoader → ${sassLoader}`, { "event.action": "loaders" });
  ctx.config.module!.rules!.push(await createdStyleRule('sass', /\.sass$/i, sassLoader, ctx))

  const scssLoader = { loader: 'sass-loader', options: ctx.userConfig.loaders.scss }
logger.error(`loaders(ctx=${ctx}): scssLoader → ${scssLoader}`, { "event.action": "loaders" });
  ctx.config.module!.rules!.push(await createdStyleRule('scss', /\.scss$/i, scssLoader, ctx))

  // Stylus
  const stylusLoader = { loader: 'stylus-loader', options: ctx.userConfig.loaders.stylus }
  ctx.config.module!.rules!.push(await createdStyleRule('stylus', /\.styl(us)?$/i, stylusLoader, ctx))
logger.error(`loaders(ctx=${ctx}): stylusLoader → ${stylusLoader}`, { "event.action": "loaders" });
}

async function createdStyleRule (lang: string, test: RegExp, processorLoader: any, ctx: WebpackConfigContext) {
logger.error(`>>> Entering createdStyleRule(lang=${lang},test=${test},processorLoader=${processorLoader},ctx=${ctx})`, { "event.action": "createdStyleRule", "logrite.lang": lang, "logrite.test": test, "logrite.processorLoader": processorLoader });
  const styleLoaders = [
    await createPostcssLoadersRule(ctx),
    processorLoader,
  ].filter(Boolean)

  ctx.userConfig.loaders.css.importLoaders =
    ctx.userConfig.loaders.cssModules.importLoaders =
      styleLoaders.length

  const cssLoaders = createCssLoadersRule(ctx, ctx.userConfig.loaders.css)
  const cssModuleLoaders = createCssLoadersRule(ctx, ctx.userConfig.loaders.cssModules)

logger.error(`createdStyleRule(lang=${lang},test=${test},processorLoader=${processorLoader},ctx=${ctx}): cssLoaders → ${cssLoaders}`, { "event.action": "createdStyleRule", "logrite.lang": lang, "logrite.test": test, "logrite.processorLoader": processorLoader });
  return {
    test,
    oneOf: [
      // This matches <style module>
      {
        resourceQuery: /module/,
        use: cssModuleLoaders.concat(styleLoaders),
      },
      // This matches plain <style> or <style scoped>
      {
        use: cssLoaders.concat(styleLoaders),
      },
    ],
  }
logger.warn(`<<< Exiting createdStyleRule(lang=${lang},test=${test},processorLoader=${processorLoader},ctx=${ctx})`, { "event.action": "createdStyleRule", "logrite.lang": lang, "logrite.test": test, "logrite.processorLoader": processorLoader });
}

function createCssLoadersRule (ctx: WebpackConfigContext, cssLoaderOptions: any) {
logger.error(`>>> Entering createCssLoadersRule(ctx=${ctx},cssLoaderOptions=${cssLoaderOptions})`, { "event.action": "createCssLoadersRule", "logrite.cssLoaderOptions": cssLoaderOptions });
  const cssLoader = { loader: 'css-loader', options: cssLoaderOptions }

logger.error(`createCssLoadersRule(ctx=${ctx},cssLoaderOptions=${cssLoaderOptions}): cssLoader → ${cssLoader}`, { "event.action": "createCssLoadersRule", "logrite.cssLoaderOptions": cssLoaderOptions });
  if (ctx.userConfig.extractCSS) {
    if (ctx.isServer) {
      // https://webpack.js.org/loaders/css-loader/#exportonlylocals
      if (cssLoader.options.modules) {
        cssLoader.options.modules.exportOnlyLocals ??= true
      }
      return [cssLoader]
    }

    return [
      {
        loader: MiniCssExtractPlugin.loader,
      },
      cssLoader,
    ]
  }

  return [
    // https://github.com/vuejs/vue-style-loader/issues/56
    // {
    //   loader: 'vue-style-loader',
    //   options: options.webpack.loaders.vueStyle
    // },
    cssLoader,
  ]
logger.warn(`<<< Exiting createCssLoadersRule(ctx=${ctx},cssLoaderOptions=${cssLoaderOptions})`, { "event.action": "createCssLoadersRule", "logrite.cssLoaderOptions": cssLoaderOptions });
}

async function createPostcssLoadersRule (ctx: WebpackConfigContext) {
logger.error(`>>> Entering createPostcssLoadersRule(ctx=${ctx})`, { "event.action": "createPostcssLoadersRule" });
  if (!ctx.options.postcss) { return }

  const config = await getPostcssConfig(ctx.nuxt)

logger.error(`createPostcssLoadersRule(ctx=${ctx}): config → ${config}`, { "event.action": "createPostcssLoadersRule" });
  if (!config) {
    return
  }

  return {
    loader: 'postcss-loader',
    options: config,
  }
logger.warn(`<<< Exiting createPostcssLoadersRule(ctx=${ctx})`, { "event.action": "createPostcssLoadersRule" });
}
