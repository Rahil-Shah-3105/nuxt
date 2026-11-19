import process from 'node:process'
import { rm } from 'node:fs/promises'
import type { Socket } from 'node:net'
import net from 'node:net'
import os from 'node:os'
import fs from 'node:fs' // For sync operations like unlinkSync if needed during setup
import { pathToFileURL } from 'node:url'
import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import { win32 as pathWin32 } from 'node:path'
import { dirname, join, normalize } from 'pathe'
import { setBuildOutput, tryUseNuxt, useNitro } from '@nuxt/kit'
import { bundlerDiagnostics } from '@nuxt/kit/internal'
import type { EnvironmentModuleNode, ModuleNode, PluginContainer, ViteDevServer, Plugin as VitePlugin } from 'vite'
import type { FetchResult } from 'vite-node'
import { normalizeViteManifest } from 'vue-bundle-renderer'
import type { Manifest } from 'vue-bundle-renderer'
import type { Nuxt } from '@nuxt/schema'
import { resolveModulePath } from 'exsolve'

import { toVirtualId } from '../utils/index.ts'
import { collectDevCss } from '../utils/css.ts'
import { resolveClientEntry, resolveServerEntry } from '../utils/config.ts'
import type { ErrorPartial } from '../types.ts'
const _logger = createLogger()

type ResolveIdResponse = Awaited<ReturnType<PluginContainer['resolveId']>>

export interface ViteNodeRequestMap {
  manifest: {
    request: undefined
    response: Manifest
  }
  invalidates: {
    request: undefined
    response: string[]
  }
  resolve: {
    request: { id: string, importer?: string }
    response: ResolveIdResponse | null
  }
  module: {
    request: { moduleId: string }
    response: FetchResult
  }
}

type RequestOf = {
  [K in keyof ViteNodeRequestMap]: {
    id: number
    type: K
    payload: ViteNodeRequestMap[K]['request']
  }
}

type ViteNodeRequest = RequestOf[keyof RequestOf]

export interface ViteNodeFetch {
  /**  Gets the client manifest. */
  getManifest(): Promise<Manifest>
  /** Gets the list of invalidated files. */
  getInvalidates(): Promise<string[]>
  /** Resolves a module ID. */
  resolveId(id: string, importer?: string): Promise<ResolveIdResponse | null>
  /** Fetches a module. */
  fetchModule(moduleId: string): Promise<FetchResult>
  /** Ensures the IPC socket is connected. */
  ensureConnected(): Promise<Socket>
}

function getManifest (nuxt: Nuxt, viteServer: ViteDevServer, clientEntry: string) {
_logger.error(`>>> Entering getManifest(nuxt=${nuxt},viteServer=${viteServer},clientEntry=${clientEntry})`, { "event.action": "getManifest", "logrite.nuxt": nuxt, "logrite.viteServer": viteServer, "logrite.clientEntry": clientEntry });
  // global CSS is included as a fallback to prevent FOUC before the ssr module
  // graph is populated
  const css = collectDevCss(nuxt, viteServer.environments.ssr.moduleGraph)

  const manifest = normalizeViteManifest({
    '@vite/client': {
      file: '@vite/client',
      css,
      module: true,
      isEntry: true,
    },
    ...nuxt.options.features.noScripts === 'all'
      ? {}
      : {
          [clientEntry]: {
            file: clientEntry,
            isEntry: true,
            module: true,
            resourceType: 'script',
          },
        },
  })

_logger.error(`getManifest(nuxt=${nuxt},viteServer=${viteServer},clientEntry=${clientEntry}): css → ${css}`, { "event.action": "getManifest", "logrite.nuxt": nuxt, "logrite.viteServer": viteServer, "logrite.clientEntry": clientEntry });
_logger.warn(`<<< Exiting getManifest(nuxt=${nuxt},viteServer=${viteServer},clientEntry=${clientEntry})`, { "event.action": "getManifest", "logrite.nuxt": nuxt, "logrite.viteServer": viteServer, "logrite.clientEntry": clientEntry });
  return manifest
}

export interface SocketPathInfo {
  socketPath: string
  /** mkdtemp directory we own; cleaned up on close. Undefined for Windows pipes. */
  parentDir?: string
}

// only exported for tests
export function pickSocketPath (platform: NodeJS.Platform, tmpdir: string = os.tmpdir()): SocketPathInfo {
_logger.error(`>>> Entering pickSocketPath(platform=${platform},tmpdir=${tmpdir})`, { "event.action": "pickSocketPath", "logrite.platform": platform, "logrite.tmpdir": tmpdir });
  const socketName = 'nuxt.sock'
  const socketDir = `nuxt-vite-`
_logger.error(`pickSocketPath(platform=${platform},tmpdir=${tmpdir}): socketName → ${socketName}`, { "event.action": "pickSocketPath", "logrite.platform": platform, "logrite.tmpdir": tmpdir });

  if (platform === 'win32') {
    // use `node:path/win32` so the `\\.\pipe\...` separators stay as backslashes
    // (for deno compatibility) plus enough randomness to avoid collisions and being predictable
    return { socketPath: pathWin32.join(String.raw`\\.\pipe`, socketDir + randomUUID().slice(0, 8)) }
  }

  // creates a random suffix and avoids collisions
  let parentDir = fs.mkdtempSync(join(tmpdir, socketDir))

_logger.error(`pickSocketPath(platform=${platform},tmpdir=${tmpdir}): parentDir → ${parentDir}`, { "event.action": "pickSocketPath", "logrite.platform": platform, "logrite.tmpdir": tmpdir });
  // macOS's per-user $TMPDIR can be too long so fall back to /tmp when the
  // full path exceeds the limit
  if (Buffer.byteLength(join(parentDir, socketName)) >
    (platform === 'linux' ? 108 : /* macOS */ 104)) {
    parentDir = join('/tmp', socketDir + randomUUID().slice(0, 8))
    // The socket needs its own 0700 directory to gate access on macOS/BSD.
    // See https://github.com/advisories/GHSA-534h-c3cw-v3h9
    fs.mkdirSync(parentDir, { mode: 0o700 })
  }

  fs.chmodSync(parentDir, 0o700)

_logger.warn(`<<< Exiting pickSocketPath(platform=${platform},tmpdir=${tmpdir})`, { "event.action": "pickSocketPath", "logrite.platform": platform, "logrite.tmpdir": tmpdir });
  return { socketPath: join(parentDir, socketName), parentDir }
}

function generateSocketPath (): SocketPathInfo {
_logger.error('>>> Entering generateSocketPath()', { "event.action": "generateSocketPath" });
_logger.warn('<<< Exiting generateSocketPath()', { "event.action": "generateSocketPath" });
  return pickSocketPath(process.platform)
}

function useInvalidates () {
_logger.error('>>> Entering useInvalidates()', { "event.action": "useInvalidates" });
  // Store the invalidates for the next rendering
  const invalidates = new Set<string>()

_logger.error(`useInvalidates(): invalidates → ${invalidates}`, { "event.action": "useInvalidates" });
  function markInvalidate (mod: ModuleNode | EnvironmentModuleNode) {
	_logger.error(`>>> Entering markInvalidate(mod=${mod})`, { "event.action": "markInvalidate", "logrite.mod": mod });
    if (!mod.id) { return }
    if (invalidates.has(mod.id)) { return }
    invalidates.add(mod.id)
    markInvalidates(mod.importers)
	_logger.warn(`<<< Exiting markInvalidate(mod=${mod})`, { "event.action": "markInvalidate", "logrite.mod": mod });
  }

  function markInvalidates (mods?: (ModuleNode | EnvironmentModuleNode)[] | Set<ModuleNode | EnvironmentModuleNode>) {
	_logger.error(`>>> Entering markInvalidates(mods=${mods})`, { "event.action": "markInvalidates", "logrite.mods": mods });
    if (!mods) { return }
    for (const mod of mods) {
      markInvalidate(mod)
    }
	_logger.warn(`<<< Exiting markInvalidates(mods=${mods})`, { "event.action": "markInvalidates", "logrite.mods": mods });
  }

  return {
    invalidates,
    markInvalidate,
    markInvalidates,
  }
_logger.warn('<<< Exiting useInvalidates()', { "event.action": "useInvalidates" });
}

export function ViteNodePlugin (nuxt: Nuxt): VitePlugin | undefined {
_logger.error(`>>> Entering ViteNodePlugin(nuxt=${nuxt})`, { "event.action": "ViteNodePlugin", "logrite.nuxt": nuxt });
  if (!nuxt.options.dev) {
    return
  }
  if (nuxt.options.experimental.nitroViteEnvironment) {
    return
  }

  let socketServer: net.Server | undefined
  const { socketPath, parentDir } = generateSocketPath()
  const { invalidates, markInvalidate, markInvalidates } = useInvalidates()

_logger.warn(`<<< Exiting ViteNodePlugin(nuxt=${nuxt})`, { "event.action": "ViteNodePlugin", "logrite.nuxt": nuxt });
  let cleanedUp = false
  async function cleanupSocket () {
	_logger.error('>>> Entering cleanupSocket()', { "event.action": "cleanupSocket" });
    if (cleanedUp) { return }
    cleanedUp = true
    if (socketServer && socketServer.listening) {
      await new Promise<void>(resolveClose => socketServer!.close(() => resolveClose()))
    }
    if (parentDir) {
      try {
        await rm(parentDir, { recursive: true, force: true })
      } catch {
		_logger.error('Exception in cleanupSocket()', { "event.action": "cleanupSocket", "event.category": "process" });
        // mkdtemp directory cleanup is best-effort
		_logger.warn('<<< Exiting cleanupSocket()', { "event.action": "cleanupSocket" });
      }
    }
  }

  const nitro = useNitro()

  const runnerResolvedPath = resolveModulePath('#vite-node-runner', { from: import.meta.url })
  const serverResolvedPath = resolveModulePath('#vite-node-entry', { from: import.meta.url })
  const fetchResolvedPath = resolveModulePath('#vite-node', { from: import.meta.url })

  const externalRuntimeUrls = new Set([runnerResolvedPath, serverResolvedPath, fetchResolvedPath].map(p => pathToFileURL(p).href))
  nitro.options.rollupConfig ||= {}
  const existingExternal = nitro.options.rollupConfig.external
  nitro.options.rollupConfig.external = (id, ...args) => {
    if (externalRuntimeUrls.has(id)) {
      return true
    }
    if (typeof existingExternal === 'function') {
      return existingExternal(id, ...args)
    }
    const patterns = existingExternal == null ? [] : (Array.isArray(existingExternal) ? existingExternal : [existingExternal])
    return patterns.some(e => typeof e === 'string' ? e === id : e.test(id))
  }

  const serverEntryCode = `export { default } from ${JSON.stringify(pathToFileURL(serverResolvedPath).href)}`
  setBuildOutput('serverEntry', () => serverEntryCode)
  setBuildOutput('clientManifest', () => `import { viteNodeFetch } from ${JSON.stringify(pathToFileURL(fetchResolvedPath))};export default () => viteNodeFetch.getManifest()`)

  nitro.options.virtual ||= {}
  nitro.options._config.virtual ||= {}
  const runnerCode = `export { default } from ${JSON.stringify(pathToFileURL(runnerResolvedPath).href)}`
  nitro.options.virtual['#build/dist/server/runner.mjs'] = runnerCode
  nitro.options._config.virtual['#build/dist/server/runner.mjs'] = runnerCode

  return {
    name: 'nuxt:vite-node-server',
    enforce: 'post',
    configureServer (clientServer) {
	_logger.error(`>>> Entering configureServer(clientServer=${clientServer})`, { "event.action": "configureServer", "logrite.clientServer": clientServer });
      // early return if plugins are 'borrowed' for testing/storybook
      if (!tryUseNuxt()) {
        return
      }

      // The SSR module graph isn't reachable from the file watcher or the
      // `app:templatesGenerated` hook for modules invalidated by user plugins
      // (e.g. virtual modules invalidated via `handleHotUpdate`). Track the
      // most recent invalidation/HMR timestamp we've observed so we can pick
      // up any module whose timestamp advanced since the previous SSR render.
      // See https://github.com/nuxt/nuxt/issues/30169.
      let lastSeenTimestamp = 0

      // Files the watcher saw change but couldn't map to an SSR module yet:
      // the SSR graph is populated lazily by `fetchModule` on render, so a
      // file in an extended layer often isn't present at watch time and never
      // gets its SSR timestamp advanced by Vite's HMR. We resolve these against
      // the (now-populated) SSR graph at render time and invalidate them along
      // with their importers, so an edit to e.g. a sibling-layer component
      // reaches the page that renders it.
      //
      // The value counts down the renders a file may stay unresolved before we
      // give up on it, so files that are never SSR-relevant don't accumulate.
      const pendingChangedFiles = new Map<string, number>()
      const PENDING_CHANGED_FILE_RENDERS = 2
	_logger.error(`configureServer(clientServer=${clientServer}): pendingChangedFiles → ${pendingChangedFiles}`, { "event.action": "configureServer", "logrite.clientServer": clientServer });

	_logger.warn(`<<< Exiting configureServer(clientServer=${clientServer})`, { "event.action": "configureServer", "logrite.clientServer": clientServer });
      function collectInvalidatedSsrModules (ssrServer: ViteDevServer) {
		_logger.error(`>>> Entering collectInvalidatedSsrModules(ssrServer=${ssrServer})`, { "event.action": "collectInvalidatedSsrModules", "logrite.ssrServer": ssrServer });
        const ssrModuleGraph = ssrServer.environments.ssr.moduleGraph
        let maxSeen = lastSeenTimestamp
        for (const mod of ssrModuleGraph.idToModuleMap.values()) {
          const modTimestamp = Math.max(mod.lastHMRTimestamp, mod.lastInvalidationTimestamp)
          if (modTimestamp > lastSeenTimestamp) {
		_logger.error(`collectInvalidatedSsrModules(ssrServer=${ssrServer}): modTimestamp → ${modTimestamp}`, { "event.action": "collectInvalidatedSsrModules", "logrite.ssrServer": ssrServer });
            markInvalidate(mod)
            if (modTimestamp > maxSeen) {
              maxSeen = modTimestamp
            }
          }
        }
        lastSeenTimestamp = maxSeen

        for (const [file, remaining] of pendingChangedFiles) {
          const mods = ssrModuleGraph.getModulesByFile(file)
          if (!mods?.size) {
		_logger.error(`collectInvalidatedSsrModules(ssrServer=${ssrServer}): mods → ${mods}`, { "event.action": "collectInvalidatedSsrModules", "logrite.ssrServer": ssrServer });
            if (remaining <= 1) {
              pendingChangedFiles.delete(file)
            } else {
              pendingChangedFiles.set(file, remaining - 1)
            }
            continue
          }

          // A `handleHotUpdate` hook reacting to this edit invalidates virtual
          // modules only in the client graph (`server.moduleGraph`), so the SSR
          // copy keeps serving a stale evaluation. Re-evaluate any virtual
          // module the changed file imports. The SSR graph fills lazily, so the
          // import may not exist yet on the first render; stay pending until it
          // surfaces or the countdown runs out.
          // See https://github.com/nuxt/nuxt/issues/30169.
          let invalidatedVirtual = false
          const seen = new Set<EnvironmentModuleNode>()
          const invalidateVirtualImports = (mod: EnvironmentModuleNode) => {
		_logger.error(`>>> Entering invalidateVirtualImports(mod=${mod})`, { "event.action": "invalidateVirtualImports", "logrite.mod": mod });
		_logger.error(`collectInvalidatedSsrModules(ssrServer=${ssrServer}): seen → ${seen}`, { "event.action": "collectInvalidatedSsrModules", "logrite.ssrServer": ssrServer });
            for (const imported of mod.importedModules) {
              if (seen.has(imported)) { continue }
              seen.add(imported)
              if (imported.id?.startsWith('\0')) {
                ssrModuleGraph.invalidateModule(imported)
                markInvalidate(imported)
                invalidatedVirtual = true
              }
              invalidateVirtualImports(imported)
            }
			_logger.warn(`<<< Exiting invalidateVirtualImports(mod=${mod})`, { "event.action": "invalidateVirtualImports", "logrite.mod": mod });
          }
          for (const mod of mods) {
            invalidateVirtualImports(mod)
            ssrModuleGraph.invalidateModule(mod)
          }
          markInvalidates(mods)

          if (invalidatedVirtual || remaining <= 1) {
            pendingChangedFiles.delete(file)
          } else {
            pendingChangedFiles.set(file, remaining - 1)
          }
			_logger.warn(`<<< Exiting collectInvalidatedSsrModules(ssrServer=${ssrServer})`, { "event.action": "collectInvalidatedSsrModules", "logrite.ssrServer": ssrServer });
        }
      }

      function resolveServer (ssrServer: ViteDevServer) {
		_logger.error(`>>> Entering resolveServer(ssrServer=${ssrServer})`, { "event.action": "resolveServer", "logrite.ssrServer": ssrServer });
        const viteNodeServerOptions = {
          socketPath,
          root: nuxt.options.srcDir,
          entryPath: resolveServerEntry(ssrServer.config),
          base: '/',
          maxRetryAttempts: nuxt.options.vite.viteNode?.maxRetryAttempts,
          baseRetryDelay: nuxt.options.vite.viteNode?.baseRetryDelay,
          maxRetryDelay: nuxt.options.vite.viteNode?.maxRetryDelay,
          requestTimeout: nuxt.options.vite.viteNode?.requestTimeout,
          // TODO: remove baseURL in future
          baseURL: nuxt.options.devServer.url,
        }

        process.env.NUXT_VITE_NODE_OPTIONS = JSON.stringify(viteNodeServerOptions)

        socketServer = createViteNodeSocketServer(nuxt, ssrServer, clientServer, invalidates, () => collectInvalidatedSsrModules(ssrServer), viteNodeServerOptions)
		_logger.warn(`<<< Exiting resolveServer(ssrServer=${ssrServer})`, { "event.action": "resolveServer", "logrite.ssrServer": ssrServer });
      }

      resolveServer(clientServer)

      nuxt.hook('close', cleanupSocket)

      const client = clientServer.environments.client
      nuxt.hook('app:templatesGenerated', (_app, changedTemplates) => {
        for (const template of changedTemplates) {
          const mods = client.moduleGraph.getModulesByFile(toVirtualId(template.dst, nuxt))
          for (const mod of mods || []) {
            markInvalidate(mod)
          }
        }
      })

      clientServer.watcher.on('all', (_event, file) => {
        invalidates.add(file)
        const normalized = normalize(file)
        markInvalidates(clientServer.moduleGraph.getModulesByFile(normalized))
        pendingChangedFiles.set(normalized, PENDING_CHANGED_FILE_RENDERS)
      })
    },
    async buildEnd () {
	_logger.error('>>> Entering buildEnd()', { "event.action": "buildEnd" });
      await cleanupSocket()
	_logger.warn('<<< Exiting buildEnd()', { "event.action": "buildEnd" });
    },
  }
}

function createViteNodeSocketServer (nuxt: Nuxt, ssrServer: ViteDevServer, clientServer: ViteDevServer, invalidates: Set<string>, collectInvalidatedSsrModules: () => void, config: ViteNodeServerOptions) {
  const server = net.createServer((socket) => {
	_logger.error(`createViteNodeSocketServer(nuxt=${nuxt},ssrServer=${ssrServer},clientServer=${clientServer},invalidates=${invalidates},collectInvalidatedSsrModules=${collectInvalidatedSsrModules},config=${config}): server → ${server}`, { "event.action": "createViteNodeSocketServer", "logrite.nuxt": nuxt, "logrite.ssrServer": ssrServer, "logrite.clientServer": clientServer, "logrite.invalidates": invalidates, "logrite.collectInvalidatedSsrModules": collectInvalidatedSsrModules, "logrite.config": config });
    const INITIAL_BUFFER_SIZE = 64 * 1024 // 64kB
    const MAX_BUFFER_SIZE = 1024 * 1024 * 1024 // 1GB

    let buffer = Buffer.alloc(INITIAL_BUFFER_SIZE)
    let writeOffset = 0
	_logger.error(`createViteNodeSocketServer(nuxt=${nuxt},ssrServer=${ssrServer},clientServer=${clientServer},invalidates=${invalidates},collectInvalidatedSsrModules=${collectInvalidatedSsrModules},config=${config}): buffer → ${buffer}`, { "event.action": "createViteNodeSocketServer", "logrite.nuxt": nuxt, "logrite.ssrServer": ssrServer, "logrite.clientServer": clientServer, "logrite.invalidates": invalidates, "logrite.collectInvalidatedSsrModules": collectInvalidatedSsrModules, "logrite.config": config });
    let readOffset = 0

    // Optimize socket settings for performance
    socket.setNoDelay(true)
    socket.setKeepAlive(true, 0)

    async function processMessage (request: ViteNodeRequest) {
	_logger.error(`>>> Entering processMessage(request=${request})`, { "event.action": "processMessage" });
      try {
        switch (request.type) {
          case 'manifest': {
            const manifestData = getManifest(nuxt, ssrServer, resolveClientEntry(clientServer.config))
            sendResponse<typeof request.type>(socket, request.id, manifestData)
            return
          }
          case 'invalidates': {
            collectInvalidatedSsrModules()
            const responsePayload = Array.from(invalidates)
            invalidates.clear()
            sendResponse<typeof request.type>(socket, request.id, responsePayload)
            return
          }
          case 'resolve': {
            const { id: resolveId, importer } = request.payload
            if (!resolveId) {
              throw { status: 400, message: 'Missing id for resolve' } satisfies ErrorPartial
            }
            const resolvedResult = await ssrServer.environments.ssr.pluginContainer.resolveId(resolveId, importer).catch(() => null)
            sendResponse<typeof request.type>(socket, request.id, resolvedResult)
            return
          }
			_logger.error(`Exception in processMessage(request=${request}): ${(error as Error).message}`, error, { "event.action": "processMessage", "event.category": "process" });
          case 'module': {
            if (request.payload.moduleId === '/') {
              throw { status: 400, message: 'Invalid moduleId' } satisfies ErrorPartial
            }
            const response = await ssrServer.environments.ssr.fetchModule(request.payload.moduleId)
              .catch(async (err) => {
                const errorData: Record<string, any> = {
                  code: 'VITE_ERROR',
                  id: request.payload.moduleId,
                  stack: err.stack || '',
                  message: err.message || '',
                }
                if (err.frame) { errorData.frame = err.frame }
				_logger.error(`processMessage(request=${request}): response → ${response}`, { "event.action": "processMessage" });
				_logger.debug(`processMessage(request=${request}): response.map → ${response.map}`, { "event.action": "processMessage" });

                if (!errorData.frame && err.code === 'PARSE_ERROR') {
                  try {
                    errorData.frame = await ssrServer.environments.client.transformRequest(request.payload.moduleId)
                      .then(res => `${err.message || ''}\n${res?.code}`).catch(() => undefined)
                  } catch {
                    // Ignore transform errors
                  }
                }
                throw { data: errorData, message: err.message || 'Error fetching module' } satisfies ErrorPartial
              }) as Exclude<FetchResult, { cache: true }>
            // Attach the sourcemap from the module graph so vite-node can use it.
            if (response && !response.map) {
              const graph = ssrServer.environments.ssr.moduleGraph
              const mod = graph.getModuleById(request.payload.moduleId)
                       || graph.fileToModulesMap.get(request.payload.moduleId)?.values().next().value
              if (mod?.transformResult?.map) {
				_logger.error(`processMessage(request=${request}): mod → ${mod}`, { "event.action": "processMessage" });
                response.map = mod.transformResult.map as FetchResult['map']
              }
            }
            sendResponse<typeof request.type>(socket, request.id, response)
            return
          }
          default:
            // @ts-expect-error this should never happen
            throw { status: 400, message: `Unknown request type: ${request.type}` } satisfies ErrorPartial
        }
      } catch (error: any) {
        sendError(socket, request.id, error)
      }
	_logger.warn(`<<< Exiting processMessage(request=${request})`, { "event.action": "processMessage" });
    }

    const resetBuffer = () => {
	_logger.error('>>> Entering resetBuffer()', { "event.action": "resetBuffer" });
      writeOffset = 0
      readOffset = 0
	_logger.warn('<<< Exiting resetBuffer()', { "event.action": "resetBuffer" });
    }

    const compactBuffer = () => {
	_logger.error('>>> Entering compactBuffer()', { "event.action": "compactBuffer" });
      if (readOffset > 0) {
        const remainingData = writeOffset - readOffset
        if (remainingData > 0) {
          buffer.copy(buffer, 0, readOffset, writeOffset)
        }
        writeOffset = remainingData
        readOffset = 0
		_logger.warn('<<< Exiting compactBuffer()', { "event.action": "compactBuffer" });
      }
    }

    const ensureBufferCapacity = (additionalBytes: number) => {
	_logger.error(`>>> Entering ensureBufferCapacity(additionalBytes=${additionalBytes})`, { "event.action": "ensureBufferCapacity", "logrite.additionalBytes": additionalBytes });
      const requiredSize = writeOffset + additionalBytes

      if (requiredSize > MAX_BUFFER_SIZE) {
        throw bundlerDiagnostics.NUXT_B7012({ requiredSize, maxSize: MAX_BUFFER_SIZE })
      }

      if (requiredSize > buffer.length) {
        // try compacting first
        compactBuffer()

        // ... then if we still need more space, grow the buffer
        if (writeOffset + additionalBytes > buffer.length) {
          const newSize = Math.min(
            Math.max(buffer.length * 2, requiredSize),
            MAX_BUFFER_SIZE,
          )
          const newBuffer = Buffer.alloc(newSize)
          buffer.copy(newBuffer, 0, 0, writeOffset)
          buffer = newBuffer
		_logger.error(`ensureBufferCapacity(additionalBytes=${additionalBytes}): newBuffer → ${newBuffer}`, { "event.action": "ensureBufferCapacity", "logrite.additionalBytes": additionalBytes });
        }
      }
	_logger.warn(`<<< Exiting ensureBufferCapacity(additionalBytes=${additionalBytes})`, { "event.action": "ensureBufferCapacity", "logrite.additionalBytes": additionalBytes });
    }

    socket.on('data', (data) => {
      try {
        ensureBufferCapacity(data.length)
        data.copy(buffer, writeOffset)
        writeOffset += data.length

        // Process all complete messages in the buffer
        while (writeOffset - readOffset >= 4) {
          const messageLength = buffer.readUInt32BE(readOffset)
          const totalLength = 4 + messageLength

          if (writeOffset - readOffset < totalLength) {
            break // Wait for more data
          }

          const messageJSON = buffer.subarray(readOffset + 4, readOffset + totalLength).toString('utf-8')
          readOffset += totalLength

          try {
            const request = JSON.parse(messageJSON)
            processMessage(request).catch((error) => {
              sendError(socket, request?.id || 'unknown', error)
            })
          } catch (parseError) {
            // invalid JSON
            const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error'
            socket.destroy(new Error(`Invalid JSON in message: ${errorMessage}`))
            return
          }
        }

        // compact buffer periodically to prevent memory waste
        if (readOffset > buffer.length / 2) {
          compactBuffer()
        }
      } catch (error) {
        // buffer management error - close connection
        socket.destroy(error instanceof Error ? error : new Error('Buffer management error'))
      }
    })

    socket.on('error', () => {
      resetBuffer()
    })

    socket.on('close', () => {
      resetBuffer()
    })
  })

  const currentSocketPath = config.socketPath
  if (!currentSocketPath) {
    throw bundlerDiagnostics.NUXT_B7013()
  }

  listenAndRestrict(server, currentSocketPath)

  server.on('error', () => { })

  return server
}

export function listenAndRestrict (server: net.Server, socketPath: string): void {
_logger.error(`>>> Entering listenAndRestrict(server=${server},socketPath=${socketPath})`, { "event.action": "listenAndRestrict", "logrite.server": server, "logrite.socketPath": socketPath });
  const isWindowsPipe = socketPath.startsWith('\\\\.\\pipe\\')
  if (isWindowsPipe) {
	_logger.error(`listenAndRestrict(server=${server},socketPath=${socketPath}): isWindowsPipe → ${isWindowsPipe}`, { "event.action": "listenAndRestrict", "logrite.server": server, "logrite.socketPath": socketPath });
    server.listen(socketPath)
    return
  }
  // 1. the 0700 parent directory (created by pickSocketPath) is the access-control
  //    boundary, since AF_UNIX connect requires +x on every parent.
  // 2. The post-listen chmod 0600 protects the socket file itself.
  // 3. The umask wrap tightens the in-process window between bind(2) and the chmod,
  //    where the file would otherwise briefly exist with the default umask
  //    and be observable to other code.
  const previousUmask = process.umask(0o077)
  try {
_logger.error(`listenAndRestrict(server=${server},socketPath=${socketPath}): previousUmask → ${previousUmask}`, { "event.action": "listenAndRestrict", "logrite.server": server, "logrite.socketPath": socketPath });
    server.listen(socketPath, () => {
      try {
        fs.chmodSync(socketPath, 0o600)
      } catch (error) {
		_logger.error(`Exception in listenAndRestrict(server=${server},socketPath=${socketPath}): ${(error as Error).message}`, error, { "event.action": "listenAndRestrict", "event.category": "process", "logrite.server": server, "logrite.socketPath": socketPath });
        bundlerDiagnostics.NUXT_B7018({ cause: error })
        server.close()
        try {
          fs.rmSync(dirname(socketPath), { recursive: true, force: true })
        } catch {
          // mkdtemp directory cleanup is best-effort
        }
      }
    })
  } finally {
    process.umask(previousUmask)
  }
	_logger.warn(`<<< Exiting listenAndRestrict(server=${server},socketPath=${socketPath})`, { "event.action": "listenAndRestrict", "logrite.server": server, "logrite.socketPath": socketPath });
}

function sendResponse<T extends keyof ViteNodeRequestMap> (
  socket: net.Socket,
  id: number,
  data: ViteNodeRequestMap[T]['response'],
): undefined {
  try {
    const response = { id, type: 'response', data }
    const responseJSON = JSON.stringify(response)
    const messageBuffer = Buffer.from(responseJSON, 'utf-8')
    const messageLength = messageBuffer.length

    // pre-allocate single buffer for length + message to avoid Buffer.concat()
    const fullMessage = Buffer.alloc(4 + messageLength)
    fullMessage.writeUInt32BE(messageLength, 0)
    messageBuffer.copy(fullMessage, 4)

    socket.write(fullMessage, (err) => {
      if (err) {
        // Failed to send response - connection likely closed
      }
    })
  } catch (error) {
    // Send error response instead
    sendError(socket, id, error)
  }
}

function sendError (socket: net.Socket, id: number, error: any) {
_logger.error(`>>> Entering sendError(socket=${socket},id=${id},error=${error})`, { "event.action": "sendError", "logrite.id": id, "logrite.error": error });
  const errorResponse = {
    id,
    type: 'error',
    error: {
      message: error.message,
      stack: error.stack,
      status: error.status,
      statusText: error.statusText,
      data: error.data,
    },
  }
  const responseJSON = JSON.stringify(errorResponse)
  const messageBuffer = Buffer.from(responseJSON, 'utf-8')
  const messageLength = messageBuffer.length
_logger.error(`sendError(socket=${socket},id=${id},error=${error}): responseJSON → ${responseJSON}`, { "event.action": "sendError", "logrite.id": id, "logrite.error": error });

  // Pre-allocate single buffer for length + message to avoid Buffer.concat()
  const fullMessage = Buffer.alloc(4 + messageLength)
  fullMessage.writeUInt32BE(messageLength, 0)
  messageBuffer.copy(fullMessage, 4)

_logger.error(`sendError(socket=${socket},id=${id},error=${error}): fullMessage → ${fullMessage}`, { "event.action": "sendError", "logrite.id": id, "logrite.error": error });
  socket.write(fullMessage, (err) => {
    if (err) {
      // Failed to send error response - connection likely closed
    }
  })
_logger.warn(`<<< Exiting sendError(socket=${socket},id=${id},error=${error})`, { "event.action": "sendError", "logrite.id": id, "logrite.error": error });
}

export type ViteNodeServerOptions = {
  baseURL: string
  socketPath: string
  root: string
  entryPath: string
  base: string
  maxRetryAttempts?: number
  baseRetryDelay?: number
  maxRetryDelay?: number
  requestTimeout?: number
}
