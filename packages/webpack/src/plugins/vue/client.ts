/**
 * This file is based on Vue.js (MIT) webpack plugins
 * https://github.com/vuejs/vue/blob/dev/src/server/webpack-plugin/client.js
 */

import { mkdir, writeFile } from 'node:fs/promises'

import { normalizeWebpackManifest, precomputeDependencies } from 'vue-bundle-renderer'
import { join, normalize, relative, resolve } from 'pathe'
import { hash } from 'ohash'
import { serialize } from 'seroval'

import type { Nuxt } from '@nuxt/schema'
import type { Compilation, Compiler } from 'webpack'
import logger from "../../utils/logger.js";

import { isCSS, isHotUpdate, isJS } from './util.ts'

interface PluginOptions {
  nuxt: Nuxt
}

export default class VueSSRClientPlugin {
  serverDist: string
  nuxt: Nuxt
  precomputedCode = 'export default undefined'
  manifestCode?: string

  constructor (options: PluginOptions) {
	logger.debug(`>>> Entering constructor(options=${options})`);
    this.serverDist = resolve(options.nuxt.options.buildDir, 'dist/server')
    this.nuxt = options.nuxt

    // Assigned directly (not via `setBuildOutput`) because the plugin is
    // constructed during webpack config assembly, outside an active Nuxt context.
    this.nuxt.buildOutputs.clientManifest = () => this.manifestCode || 'export default {}'
    this.nuxt.buildOutputs.clientPrecomputed = () => this.precomputedCode
	logger.debug(`constructor(options=${options}): this.nuxt → ${this.nuxt}`);
	logger.debug(`<<< Exiting constructor(options=${options})`);
  }

  private getRelativeModuleId (identifier: string, context: string): string {
	logger.debug(`>>> Entering getRelativeModuleId(identifier=${identifier},context=${context})`);
    const id = identifier.replace(/\s\w+$/, '') // remove appended hash
	logger.debug(`getRelativeModuleId(identifier=${identifier},context=${context}): id → ${id}`);
    // Module identifier format: /path/loaders!resource?query
    const resourceMatch = id.match(/([^!]*\.vue)(?:\?|$)/)
    // Extract relative resource path
	logger.debug(`getRelativeModuleId(identifier=${identifier},context=${context}): resourceMatch → ${resourceMatch}`);
    return resourceMatch && resourceMatch[1]
      ? normalize(relative(context, resourceMatch[1])).replace(/^\.\//, '').replace(/\\/g, '/')
      : id
	logger.debug(`<<< Exiting getRelativeModuleId(identifier=${identifier},context=${context})`);
  }

  apply (compiler: Compiler) {
	logger.debug(`>>> Entering apply(compiler=${compiler})`);
    compiler.hooks.afterEmit.tap('VueSSRClientPlugin', async (compilation: Compilation) => {
      const stats = compilation.getStats().toJson({
        modules: true,
        assets: true,
        chunks: true,
        chunkGroups: true,
        entrypoints: true,
      })
      const context = this.nuxt.options.srcDir
	logger.debug(`apply(compiler=${compiler}): stats → ${stats}`);

      const initialFiles = new Set<string>()
      for (const { assets } of Object.values(stats.entrypoints!)) {
	logger.debug(`apply(compiler=${compiler}): initialFiles → ${initialFiles}`);
        if (!assets) { continue }

        for (const asset of assets) {
          const file = asset.name
          if ((isJS(file) || isCSS(file)) && !isHotUpdate(file)) {
            initialFiles.add(file)
          }
        }
      }

      const allFiles = new Set<string>()
      const asyncFiles = new Set<string>()
      const assetsMapping: Record<string, string[]> = {}
	logger.debug(`apply(compiler=${compiler}): allFiles → ${allFiles}`);
	logger.debug(`apply(compiler=${compiler}): asyncFiles → ${asyncFiles}`);

      for (const { name: file, chunkNames = [] } of stats.assets!) {
        if (isHotUpdate(file)) { continue }
        allFiles.add(file)
        const isFileJS = isJS(file)
        if (!initialFiles.has(file) && (isFileJS || isCSS(file))) {
		logger.debug(`apply(compiler=${compiler}): isFileJS → ${isFileJS}`);
          asyncFiles.add(file)
        }
        if (isFileJS) {
          const componentHash = hash(chunkNames.join('|'))
          const map = assetsMapping[componentHash] ||= []
          map.push(file)
        }
      }

      const webpackManifest = {
        publicPath: stats.publicPath,
        all: [...allFiles],
        initial: [...initialFiles],
        async: [...asyncFiles],
        modules: { /* [identifier: string]: Array<index: number> */ } as Record<string, number[]>,
        assetsMapping,
      }

      const { entrypoints = {}, namedChunkGroups = {} } = stats
      const fileToIndex = (file: string | number) => webpackManifest.all.indexOf(String(file))
      for (const m of stats.modules!) {
        // Ignore modules duplicated in multiple chunks
        if (m.chunks?.length !== 1) { continue }

        const [cid] = m.chunks
        const chunk = stats.chunks!.find(c => c.id === cid)
        if (!chunk || !chunk.files || cid == null) {
		logger.debug(`fileToIndex(file=${file}): chunk → ${chunk}`);
          continue
        }
        const relativeId = this.getRelativeModuleId(m.identifier!, context)

        const filesSet = new Set<number>()
        for (const file of chunk.files) {
		logger.debug(`fileToIndex(file=${file}): filesSet → ${filesSet}`);
          const index = fileToIndex(file)
          if (index !== -1) {
            filesSet.add(index)
          }
        }

        for (const chunkName of chunk.names!) {
          if (!entrypoints[chunkName]) {
            const chunkGroup = namedChunkGroups[chunkName]
            if (chunkGroup) {
              for (const asset of chunkGroup.assets!) {
                filesSet.add(fileToIndex(asset.name))
              }
            }
          }
        }

        const files = Array.from(filesSet)
        webpackManifest.modules[relativeId] = files
		logger.debug(`fileToIndex(file=${file}): files → ${files}`);

        // In production mode, modules may be concatenated by scope hoisting
        // Include ConcatenatedModule for not losing module-component mapping
        if (Array.isArray(m.modules)) {
          for (const concatenatedModule of m.modules) {
            const relativeId = this.getRelativeModuleId(concatenatedModule.identifier!, context)
            webpackManifest.modules[relativeId] ||= files
			logger.debug(`fileToIndex(file=${file}): relativeId → ${relativeId}`);
          }
        }

        // Find all asset modules associated with the same chunk
        if (stats.modules) {
          for (const m of stats.modules) {
            if (m.assets?.length && m.chunks?.includes(cid)) {
              files.push(...m.assets.map(fileToIndex))
            }
          }
        }
      }

      const manifest = normalizeWebpackManifest(webpackManifest as any)
      await this.nuxt.callHook('build:manifest', manifest)
      this.precomputedCode = 'export default ' + serialize(precomputeDependencies(manifest))
      this.manifestCode = 'export default ' + serialize(manifest)

	logger.debug(`apply(compiler=${compiler}): manifest → ${manifest}`);
      if (!this.nuxt.options.dev && this.nuxt.options.experimental.buildCache) {
        await mkdir(this.serverDist, { recursive: true })
        await writeFile(join(this.serverDist, 'client.manifest.mjs'), this.manifestCode, 'utf8')
        await writeFile(join(this.serverDist, 'client.precomputed.mjs'), this.precomputedCode, 'utf8')
      }

	logger.debug(`<<< Exiting apply(compiler=${compiler})`);
      // assets[this.options.filename] = {
      //   source: () => src,
      //   size: () => src.length
      // }
    })
  }
}
