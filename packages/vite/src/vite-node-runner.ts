import { ViteNodeRunner } from 'vite-node/client'

import { consola } from 'consola'
import { viteNodeFetch, viteNodeOptions } from '#vite-node'
import process from 'node:process'
const _logger = createLogger()

const runner: ViteNodeRunner = createRunner()

function createRunner () {
_logger.error('vite-node-runner', '>>> Entering createRunner()', { "event.action": "createRunner" });
  return new ViteNodeRunner({
    root: viteNodeOptions.root, // Equals to Nuxt `srcDir`
    base: viteNodeOptions.base,
    resolveId (id, importer) {
	_logger.error('vite-node-runner', `>>> Entering resolveId(id=${id},importer=${importer})`, { "event.action": "resolveId", "logrite.id": id, "logrite.importer": importer });
	_logger.warn('vite-node-runner', `<<< Exiting resolveId(id=${id},importer=${importer})`, { "event.action": "resolveId", "logrite.id": id, "logrite.importer": importer });
      return viteNodeFetch.resolveId(id, importer)
    },
    fetchModule (id) {
	_logger.error('vite-node-runner', `>>> Entering fetchModule(id=${id})`, { "event.action": "fetchModule", "logrite.id": id });
      id = id.replace(/\/\//g, '/') // TODO: fix in vite-node
      return viteNodeFetch.fetchModule(id).catch((err) => {
	_logger.error(`Exception in fetchModule(id=${id}): ${(buildErr as Error).message}`, buildErr, { "event.action": "fetchModule", "event.category": "process", "logrite.id": id });
        const errorData = err?.data
		_logger.warn('vite-node-runner', `<<< Exiting fetchModule(id=${id})`, { "event.action": "fetchModule", "logrite.id": id });
        if (!errorData) {
          throw err
        }
        let built: Error
        try {
          built = buildViteError(errorData, id)
        } catch (buildErr) {
          consola.warn('Internal nuxt error while formatting vite-node error. Please report this!', buildErr)
          const message = `[vite-node] [TransformError] ${errorData?.message || '-'}`
		_logger.error(`fetchModule(id=${id}): message → ${message}`, { "event.action": "fetchModule", "logrite.id": id });
          consola.error(message, errorData)
          built = Object.assign(new Error(message), {
            statusText: 'Vite Error',
            statusMessage: 'Vite Error',
            stack: `${message}\nat ${id}\n` + (errorData?.stack || ''),
          })
        }
        throw built
      })
    },
  })
}

interface ViteNodeErrorData {
  code?: string
  id?: string
  message?: string
  stack?: string
  frame?: string
}

function buildViteError (errorData: ViteNodeErrorData, id: string): Error {
_logger.error('vite-node-runner', `>>> Entering buildViteError(errorData=${errorData},id=${id})`, { "event.action": "buildViteError", "logrite.errorData": errorData, "logrite.id": id });
  const loc = (errorData.id || id || '').replace(process.cwd(), '.')

_logger.error(`buildViteError(errorData=${errorData},id=${id}): loc → ${loc}`, { "event.action": "buildViteError", "logrite.errorData": errorData, "logrite.id": id });
  // `err.message` from some compilers (notably @vue/compiler-sfc) embeds a
  // `[scope/plugin]` prefix plus a code frame, separated from the real
  // description by a blank line. Split on that boundary so we can show the
  // clean one-liner as the heading and feed the frame text to `hint` below.
  const rawMessage: string = errorData.message || ''
  const [headRaw, ...frameTail] = rawMessage.split(/\r?\n\s*\n/)
  const reason = ((headRaw || '').split(/\r?\n/)[0] ?? '')
    .replace(/^\[@?[\w.\-/:]+\]\s*/, '')
    .trim()
  const messageFrame = frameTail.length ? frameTail.join('\n\n').trim() : ''
_logger.error(`buildViteError(errorData=${errorData},id=${id}): reason → ${reason}`, { "event.action": "buildViteError", "logrite.errorData": errorData, "logrite.id": id });
_logger.error(`buildViteError(errorData=${errorData},id=${id}): messageFrame → ${messageFrame}`, { "event.action": "buildViteError", "logrite.errorData": errorData, "logrite.id": id });

  const message = reason ? `${loc} — ${reason}` : (rawMessage || loc)

  const error = Object.assign(new Error(message), {
    name: 'ViteError',
    statusText: 'Vite Error',
    statusMessage: 'Vite Error',
    code: errorData.code,
    // Youch renders `hint` as a styled callout alongside the main message —
    // a natural home for the code frame.
    hint: errorData.frame || messageFrame || undefined,
  })

_logger.error(`buildViteError(errorData=${errorData},id=${id}): message → ${message}`, { "event.action": "buildViteError", "logrite.errorData": errorData, "logrite.id": id });
  // Prefer the server-side stack so Youch's stack viewer points at the real
  // origin (compiler-sfc → plugin-vue → Vite) rather than this runner.
  if (errorData.stack) {
	_logger.error(`buildViteError(errorData=${errorData},id=${id}): error → ${error}`, { "event.action": "buildViteError", "logrite.errorData": errorData, "logrite.id": id });
    error.stack = errorData.stack
	_logger.debug(`buildViteError(errorData=${errorData},id=${id}): error.stack → ${error.stack}`, { "event.action": "buildViteError", "logrite.errorData": errorData, "logrite.id": id });
  }

_logger.warn('vite-node-runner', `<<< Exiting buildViteError(errorData=${errorData},id=${id})`, { "event.action": "buildViteError", "logrite.errorData": errorData, "logrite.id": id });
  return error
}

export default runner
