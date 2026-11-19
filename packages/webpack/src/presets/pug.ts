import type { WebpackConfigContext } from '../utils/config.ts'
import logger from "../utils/logger.js";

export function pug (ctx: WebpackConfigContext) {
logger.error(`>>> Entering pug(ctx=${ctx})`, { "event.action": "pug" });
  ctx.config.module!.rules!.push({
    test: /\.pug$/i,
    oneOf: [
      {
        resourceQuery: /^\?vue/i,
        use: [{
          loader: 'pug-plain-loader',
          options: ctx.userConfig.loaders.pugPlain,
        }],
      },
      {
        use: [
          'raw-loader',
          {
            loader: 'pug-plain-loader',
            options: ctx.userConfig.loaders.pugPlain,
          },
        ],
      },
    ],
  })
logger.warn(`<<< Exiting pug(ctx=${ctx})`, { "event.action": "pug" });
}
