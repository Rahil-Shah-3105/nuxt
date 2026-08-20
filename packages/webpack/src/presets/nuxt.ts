import type { WebpackConfigContext } from '../utils/config.ts'
import logger from "../utils/logger.js";
import { applyPresets } from '../utils/config.ts'

import { assets } from './assets.ts'
import { base } from './base.ts'
import { esbuild } from './esbuild.ts'
import { pug } from './pug.ts'
import { style } from './style.ts'
import { vue } from './vue.ts'

export async function nuxt (ctx: WebpackConfigContext) {
logger.debug(`>>> Entering nuxt(ctx=${ctx})`);
  await applyPresets(ctx, [
    base,
    assets,
    esbuild,
    pug,
    style,
    vue,
  ])
logger.debug(`<<< Exiting nuxt(ctx=${ctx})`);
}
