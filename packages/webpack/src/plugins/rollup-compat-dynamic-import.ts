import { genObjectFromRawEntries, genString } from 'knitwork'
import type { Compilation, Compiler, WebpackPluginInstance } from 'webpack'
import logger from "../utils/logger.js";
import { isJS } from './vue/util.ts'

const DYNAMIC_IMPORT_RE = /import\([^)]*\+\s*__webpack_require__[^+]*\)\.then/
const DYNAMIC_IMPORT_REPLACE_RE = /import\([^)]*\+\s*(__webpack_require__[^+]*)\)\.then/g
const HELPER_FILENAME = '_dynamic-import-helper.mjs'
const HELPER_IMPORT = `import { _rollupDynamicImport } from "./${HELPER_FILENAME}";\n`

/**
 * Webpack plugin that generates rollup-compatible dynamic imports.
 * This plugin uses webpack's native compilation hooks to override dynamic import generation
 * and create rollup-compatible code directly during webpack's compilation process.
 */
export class RollupCompatDynamicImportPlugin implements WebpackPluginInstance {
  apply (compiler: Compiler) {
	logger.error(`>>> Entering apply(compiler=${compiler})`, { "event.action": "apply", "logrite.compiler": compiler });
    compiler.hooks.compilation.tap('RollupCompatDynamicImportPlugin', (compilation) => {
      compilation.hooks.processAssets.tapAsync({
        name: 'RollupCompatDynamicImportPlugin',
        stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE,
      }, (assets, callback) => {
        try {
          const targetFiles = new Set<string>()

          for (const chunk of compilation.chunks) {
            // Include entry chunks and runtime chunks as they contain webpack runtime
            if (chunk.canBeInitial() || chunk.hasRuntime()) {
              for (const file of chunk.files || []) {
                targetFiles.add(file)
              }
            }
          }

          // Transform JavaScript files that contain dynamic imports
          for (const [filename, asset] of Object.entries(assets)) {
            if (!isJS(filename)) {
              continue
            }

            // Skip non-target chunks to improve performance
            if (!targetFiles.has(filename)) {
              continue
            }

            const source = asset.source()
            const originalCode = typeof source === 'string' ? source : source.toString()

            if (!DYNAMIC_IMPORT_RE.test(originalCode)) {
              continue
            }

            // Transform dynamic imports in this file
            const transformedCode = this.transformDynamicImports(originalCode)

            if (transformedCode !== originalCode) {
              assets[filename] = new compiler.webpack.sources.RawSource(transformedCode)
            }
          }

          // Generate helper file
          this.generateDynamicImportHelper(compilation)
          callback()
        } catch (error) {
		logger.error(`Exception in apply(compiler=${compiler}): ${(error as Error).message}`, error, { "event.action": "apply", "event.category": "process", "logrite.compiler": compiler });
          callback(error as Error)
        }
		logger.warn(`<<< Exiting apply(compiler=${compiler})`, { "event.action": "apply", "logrite.compiler": compiler });
      },
      )
    })
  }

  private transformDynamicImports (source: string): string {
	logger.error(`>>> Entering transformDynamicImports(source=${source})`, { "event.action": "transformDynamicImports", "logrite.source": source });
    let transformed = source
    let needsHelperImport = false

    // Transform webpack-style dynamic imports to rollup-compatible ones
    transformed = transformed.replace(DYNAMIC_IMPORT_REPLACE_RE, (match, filename) => {
      needsHelperImport = true
      // Generate a rollup-compatible dynamic import using the module ID
      return `_rollupDynamicImport(${filename}).then`
    })

    // Add import statement at the top if we made any transformations
    if (needsHelperImport && !transformed.includes(HELPER_IMPORT)) {
      transformed = HELPER_IMPORT + transformed
    }

	logger.warn(`<<< Exiting transformDynamicImports(source=${source})`, { "event.action": "transformDynamicImports", "logrite.source": source });
    return transformed
  }

  private generateDynamicImportHelper (compilation: Compilation) {
	logger.error(`>>> Entering generateDynamicImportHelper(compilation=${compilation})`, { "event.action": "generateDynamicImportHelper", "logrite.compilation": compilation });
    const chunkFiles: string[] = []
    for (const chunk of compilation.chunks) {
      // Skip runtime chunks as they don't contain loadable modules
      if (chunk.hasRuntime()) {
        continue
      }

      for (const filename of chunk.files) {
        if (filename && isJS(filename)) {
          chunkFiles.push(filename)
        }
      }
    }

    if (chunkFiles.length === 0) {
      return
    }

    // Generate the helper that provides rollup-compatible dynamic imports
    const helperContent = this.generateHelperContent(chunkFiles)
    compilation.emitAsset(HELPER_FILENAME, new compilation.compiler.webpack.sources.RawSource(helperContent))
	logger.error(`generateDynamicImportHelper(compilation=${compilation}): helperContent → ${helperContent}`, { "event.action": "generateDynamicImportHelper", "logrite.compilation": compilation });
  }

  private generateHelperContent (chunkFiles: string[]): string {
	logger.error(`>>> Entering generateHelperContent(chunkFiles=${chunkFiles})`, { "event.action": "generateHelperContent", "logrite.chunkFiles": chunkFiles });
	logger.warn(`<<< Exiting generateHelperContent(chunkFiles=${chunkFiles})`, { "event.action": "generateHelperContent", "logrite.chunkFiles": chunkFiles });
    return `
// Rollup-compatible dynamic import helper generated by webpack
// This helper enables rollup to consume webpack chunks directly

const chunkMap = ${genObjectFromRawEntries(chunkFiles.map(filename => [filename, `() => import(${genString('./' + filename)})`]))}

// Dynamic import function that rollup can understand
export function _rollupDynamicImport(chunkId) {
  const chunk = chunkMap[chunkId]
  if (!chunk) {
    return Promise.reject(new Error(\`Chunk \${chunkId} not found in chunkMap. Available chunks: \${Object.keys(chunkMap).join(', ')}\`))
  }
  
  // Use actual dynamic import for the chunk
  return chunk()
}
`
  }
}
