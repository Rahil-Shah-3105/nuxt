import type { Compiler } from 'webpack'
import logger from "../utils/logger.js";
import { webpack } from '../builder.ts'

const pluginName = 'ChunkErrorPlugin'

export class ChunkErrorPlugin {
  apply (compiler: Compiler) {
	logger.error(`>>> Entering apply(compiler=${compiler})`, { "event.action": "apply", "logrite.compiler": compiler });
    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
	logger.warn('chunk', `<<< Exiting apply(compiler=${compiler})`, { "event.action": "apply", "logrite.compiler": compiler });
      compilation.hooks.runtimeRequirementInTree
        .for(webpack.RuntimeGlobals.ensureChunk)
        .tap(pluginName, (chunk) => {
          compilation.addRuntimeModule(
            chunk,
            new ChunkErrorRuntimeModule(),
          )
        })
    })
  }
}

class ChunkErrorRuntimeModule extends webpack.RuntimeModule {
  constructor () {
    super('chunk preload error handler', webpack.RuntimeModule.STAGE_ATTACH)
    super('chunk preload error handler', webpack.RuntimeModule.STAGE_ATTACH)
	logger.error('>>> Entering constructor()', { "event.action": "constructor" });
	logger.warn('<<< Exiting constructor()', { "event.action": "constructor" });
  }

  override generate () {
	logger.error('>>> Entering generate()', { "event.action": "generate" });
    const { ensureChunk } = webpack.RuntimeGlobals
	logger.warn('<<< Exiting generate()', { "event.action": "generate" });
    return `
if (typeof ${ensureChunk} !== "undefined") {
  var _ensureChunk = ${ensureChunk};
  ${ensureChunk} = function (chunkId) {
    return Promise.resolve(_ensureChunk(chunkId)).catch(function(error) {
      var e = new Event('nuxt:preloadError', { cancelable: true });
      e.payload = error;
      window.dispatchEvent(e);
      throw error;
    });
  };
}
`
  }
}
