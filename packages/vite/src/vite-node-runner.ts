import { ViteNodeRunner } from 'vite-node/client'

import { consola } from 'consola'
import { viteNodeFetch, viteNodeOptions } from '#vite-node'
import process from 'node:process'
const _logger = createLogger()

const runner: ViteNodeRunner = createRunner()

function createRunner () {
_logger.debug('>>> Entering createRunner()');
  return new ViteNodeRunner({
    root: viteNodeOptions.root, // Equals to Nuxt `srcDir`
    base: viteNodeOptions.base,
    resolveId (id, importer) {
	_logger.debug(`>>> Entering resolveId(id=${id},importer=${importer})`);
	_logger.debug(`<<< Exiting resolveId(id=${id},importer=${importer})`);
      return viteNodeFetch.resolveId(id, importer)
    },
    fetchModule (id) {
	_logger.debug(`>>> Entering fetchModule(id=${id})`);
      id = id.replace(/\/\//g, '/') // TODO: fix in vite-node
	_logger.debug(`<<< Exiting fetchModule(id=${id})`);
      return viteNodeFetch.fetchModule(id).catch((err) => {
        const errorData = err?.data
		_logger.error(`Exception in fetchModule(id=${id}): ${(buildErr as Error).message}`, buildErr);
        if (!errorData) {
          throw err
        }
        let built: Error
        try {
          built = buildViteError(errorData, id)
        } catch (buildErr) {
          consola.warn('Internal nuxt error while formatting vite-node error. Please report this!', buildErr)
          const message = `[vite-node] [TransformError] ${errorData?.message || '-'}`
		_logger.debug(`fetchModule(id=${id}): message → ${message}`);
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
  const loc = (errorData.id || id || '').replace(process.cwd(), '.')

_logger.debug(`buildViteError(errorData=${errorData},id=${id}): loc → ${loc}`);
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
_logger.debug(`buildViteError(errorData=${errorData},id=${id}): reason → ${reason}`);
_logger.debug(`buildViteError(errorData=${errorData},id=${id}): messageFrame → ${messageFrame}`);

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

_logger.debug(`buildViteError(errorData=${errorData},id=${id}): message → ${message}`);
  // Prefer the server-side stack so Youch's stack viewer points at the real
  // origin (compiler-sfc → plugin-vue → Vite) rather than this runner.
  if (errorData.stack) {
	_logger.debug(`>>> Entering buildViteError(errorData=${errorData},id=${id})`);
	_logger.debug(`<<< Exiting buildViteError(errorData=${errorData},id=${id})`);
    error.stack = errorData.stack
  }

  return error
}

export default runner
