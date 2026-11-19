import type { WebpackConfigContext } from '../utils/config.ts'
import logger from "../utils/logger.js";
import { fileName } from '../utils/config.ts'

export function assets (ctx: WebpackConfigContext) {
logger.error(`>>> Entering assets(ctx=${ctx})`, { "event.action": "assets" });
  ctx.config.module!.rules!.push(
    {
      test: /\.(png|jpe?g|gif|svg|webp)$/i,
      use: [{
        loader: 'url-loader',
        options: {
          ...ctx.userConfig.loaders.imgUrl,
          name: fileName(ctx, 'img'),
        },
      }],
    },
    {
      test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/i,
      use: [{
        loader: 'url-loader',
        options: {
          ...ctx.userConfig.loaders.fontUrl,
          name: fileName(ctx, 'font'),
        },
      }],
    },
    {
      test: /\.(webm|mp4|ogv)$/i,
      use: [{
        loader: 'file-loader',
        options: {
          ...ctx.userConfig.loaders.file,
          name: fileName(ctx, 'video'),
        },
      }],
    },
  )
logger.warn(`<<< Exiting assets(ctx=${ctx})`, { "event.action": "assets" });
}
