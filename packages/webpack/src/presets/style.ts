import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
import type { WebpackConfigContext } from '../utils/config.ts'
import logger from "../utils/logger.js";
import { applyPresets, fileName } from '../utils/config.ts'
import { getPostcssConfig } from '../utils/postcss.ts'

import { MiniCssExtractPlugin } from '../builder.ts'

export async function style (ctx: WebpackConfigContext) {
logger.debug(`>>> Entering style(ctx=${ctx})`);
  await applyPresets(ctx, [
    loaders,
    extractCSS,
    minimizer,
  ])
logger.debug(`<<< Exiting style(ctx=${ctx})`);
}

function minimizer (ctx: WebpackConfigContext) {
logger.debug(`>>> Entering minimizer(ctx=${ctx})`);
  if (ctx.userConfig.optimizeCSS && Array.isArray(ctx.config.optimization!.minimizer)) {
    ctx.config.optimization!.minimizer.push(new CssMinimizerPlugin({
      ...ctx.userConfig.optimizeCSS,
    }))
  }
logger.debug(`<<< Exiting minimizer(ctx=${ctx})`);
}

function extractCSS (ctx: WebpackConfigContext) {
logger.debug(`>>> Entering extractCSS(ctx=${ctx})`);
  const config = ctx.userConfig.extractCSS
  if (!config) { return }
logger.debug(`extractCSS(ctx=${ctx}): config → ${config}`);
  // CSS extraction
logger.debug(`<<< Exiting extractCSS(ctx=${ctx})`);
  const filename = fileName(ctx, 'css')
  ctx.config.plugins!.push(new MiniCssExtractPlugin({
    filename,
    chunkFilename: filename,
    ...config === true ? {} : config,
  }))
}

async function loaders (ctx: WebpackConfigContext) {
logger.debug(`>>> Entering loaders(ctx=${ctx})`);
  // CSS
  ctx.config.module!.rules!.push(await createdStyleRule('css', /\.css$/i, null, ctx))

  // PostCSS
  ctx.config.module!.rules!.push(await createdStyleRule('postcss', /\.p(ost)?css$/i, null, ctx))

  // Less
  const lessLoader = { loader: 'less-loader', options: ctx.userConfig.loaders.less }
logger.debug(`loaders(ctx=${ctx}): lessLoader → ${lessLoader}`);
  ctx.config.module!.rules!.push(await createdStyleRule('less', /\.less$/i, lessLoader, ctx))

  // Sass (TODO: optional dependency)
  const sassLoader = { loader: 'sass-loader', options: ctx.userConfig.loaders.sass }
logger.debug(`loaders(ctx=${ctx}): sassLoader → ${sassLoader}`);
  ctx.config.module!.rules!.push(await createdStyleRule('sass', /\.sass$/i, sassLoader, ctx))

  const scssLoader = { loader: 'sass-loader', options: ctx.userConfig.loaders.scss }
logger.debug(`loaders(ctx=${ctx}): scssLoader → ${scssLoader}`);
  ctx.config.module!.rules!.push(await createdStyleRule('scss', /\.scss$/i, scssLoader, ctx))

  // Stylus
  const stylusLoader = { loader: 'stylus-loader', options: ctx.userConfig.loaders.stylus }
  ctx.config.module!.rules!.push(await createdStyleRule('stylus', /\.styl(us)?$/i, stylusLoader, ctx))
logger.debug(`loaders(ctx=${ctx}): stylusLoader → ${stylusLoader}`);
logger.debug(`>>> Entering createdStyleRule(lang=${lang},test=${test},processorLoader=${processorLoader},ctx=${ctx})`);
logger.debug(`<<< Exiting createdStyleRule(lang=${lang},test=${test},processorLoader=${processorLoader},ctx=${ctx})`);
}

async function createdStyleRule (lang: string, test: RegExp, processorLoader: any, ctx: WebpackConfigContext) {
  const styleLoaders = [
    await createPostcssLoadersRule(ctx),
    processorLoader,
  ].filter(Boolean)

  ctx.userConfig.loaders.css.importLoaders =
    ctx.userConfig.loaders.cssModules.importLoaders =
      styleLoaders.length

  const cssLoaders = createCssLoadersRule(ctx, ctx.userConfig.loaders.css)
  const cssModuleLoaders = createCssLoadersRule(ctx, ctx.userConfig.loaders.cssModules)

logger.debug(`createdStyleRule(lang=${lang},test=${test},processorLoader=${processorLoader},ctx=${ctx}): cssLoaders → ${cssLoaders}`);
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
}

function createCssLoadersRule (ctx: WebpackConfigContext, cssLoaderOptions: any) {
logger.debug(`>>> Entering createCssLoadersRule(ctx=${ctx},cssLoaderOptions=${cssLoaderOptions})`);
  const cssLoader = { loader: 'css-loader', options: cssLoaderOptions }

logger.debug(`createCssLoadersRule(ctx=${ctx},cssLoaderOptions=${cssLoaderOptions}): cssLoader → ${cssLoader}`);
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
logger.debug(`<<< Exiting createCssLoadersRule(ctx=${ctx},cssLoaderOptions=${cssLoaderOptions})`);
}

async function createPostcssLoadersRule (ctx: WebpackConfigContext) {
logger.debug(`>>> Entering createPostcssLoadersRule(ctx=${ctx})`);
  if (!ctx.options.postcss) { return }

  const config = await getPostcssConfig(ctx.nuxt)

logger.debug(`createPostcssLoadersRule(ctx=${ctx}): config → ${config}`);
  if (!config) {
    return
  }

  return {
    loader: 'postcss-loader',
    options: config,
  }
logger.debug(`<<< Exiting createPostcssLoadersRule(ctx=${ctx})`);
}
