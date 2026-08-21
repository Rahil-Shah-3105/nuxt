import type { WebpackConfigContext } from '../utils/config.ts'
import logger from "../utils/logger.js";
import { builder } from '../builder.ts'

export function node (ctx: WebpackConfigContext) {
logger.debug(`>>> Entering node(ctx=${ctx})`);
  ctx.config.target = 'node'
  ctx.config.node = false

  if (builder !== 'rspack') {
    ctx.config.experiments!.outputModule = true
  }

  ctx.config.output = {
    ...ctx.config.output,
    chunkFilename: '[name].mjs',
    chunkFormat: 'module',
    chunkLoading: 'import',
    module: true,
    environment: {
      module: true,
      arrowFunction: true,
      bigIntLiteral: true,
      const: true,
      destructuring: true,
      dynamicImport: true,
      forOf: true,
    },
    library: {
      type: 'module',
    },
  }

logger.debug(`<<< Exiting node(ctx=${ctx})`);
  ctx.config.performance = {
    ...ctx.config.performance,
    hints: false,
    maxEntrypointSize: Number.POSITIVE_INFINITY,
    maxAssetSize: Number.POSITIVE_INFINITY,
  }
}
