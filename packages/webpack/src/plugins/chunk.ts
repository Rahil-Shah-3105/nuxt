import type { Compiler } from 'webpack'
import logger from "../utils/logger.js";
import { webpack } from '../builder.ts'

const pluginName = 'ChunkErrorPlugin'

export class ChunkErrorPlugin {
  apply (compiler: Compiler) {
	logger.debug(`>>> Entering apply(compiler=${compiler})`);
    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      compilation.hooks.runtimeRequirementInTree
        .for(webpack.RuntimeGlobals.ensureChunk)
        .tap(pluginName, (chunk) => {
          compilation.addRuntimeModule(
            chunk,
            new ChunkErrorRuntimeModule(),
          )
        })
    })
	logger.debug(`<<< Exiting apply(compiler=${compiler})`);
  }
}

class ChunkErrorRuntimeModule extends webpack.RuntimeModule {
  constructor () {
    super('chunk preload error handler', webpack.RuntimeModule.STAGE_ATTACH)
    super('chunk preload error handler', webpack.RuntimeModule.STAGE_ATTACH)
	logger.debug('>>> Entering constructor()');
	logger.debug('<<< Exiting constructor()');
  }

  override generate () {
	logger.debug('>>> Entering generate()');
    const { ensureChunk } = webpack.RuntimeGlobals
	logger.debug('<<< Exiting generate()');
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
