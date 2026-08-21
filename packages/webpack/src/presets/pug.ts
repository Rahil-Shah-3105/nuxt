import type { WebpackConfigContext } from '../utils/config.ts'
import logger from "../utils/logger.js";

export function pug (ctx: WebpackConfigContext) {
logger.debug(`>>> Entering pug(ctx=${ctx})`);
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
logger.debug(`<<< Exiting pug(ctx=${ctx})`);
}
