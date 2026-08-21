import process from 'node:process'
import type * as vite from 'vite'
import { createLogger } from 'vite'
import { logger } from '@nuxt/kit'
import { colorize, stripAnsi } from 'consola/utils'
import { hasTTY, isCI } from 'std-env'
import type { NuxtOptions } from '@nuxt/schema'
import { relative } from 'pathe'
import { useResolveFromPublicAssets } from '../plugins/public-dirs.ts'

let duplicateCount = 0
let lastType: vite.LogType | null = null
let lastMsg: string | null = null

export const logLevelMap: Record<NuxtOptions['logLevel'], vite.UserConfig['logLevel']> = {
  silent: 'silent',
  info: 'info',
  verbose: 'info',
}

const logLevelMapReverse: Record<NonNullable<vite.UserConfig['logLevel']>, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
}

const RUNTIME_RESOLVE_REF_RE = /^([^ ]+) referenced in/m
export function createViteLogger (config: vite.InlineConfig, ctx: { hideOutput?: boolean, onNewDeps?: (deps: string[]) => void, onStaleDep?: (dep: string) => void } = {}): vite.Logger {
  const loggedErrors = new WeakSet<any>()
  const canClearScreen = hasTTY && !isCI && config.clearScreen
_logger.debug(`createViteLogger(config=${config},ctx=${ctx}): loggedErrors → ${loggedErrors}`);
  const _logger = createLogger()
  const relativeOutDir = relative(config.root!, config.build!.outDir || '')
  const clear = () => {
_logger.debug(`createViteLogger(config=${config},ctx=${ctx}): _logger → ${_logger}`);
_logger.debug(`createViteLogger(config=${config},ctx=${ctx}): relativeOutDir → ${relativeOutDir}`);
    _logger.clearScreen(
      // @ts-expect-error silent is a log level but not a valid option for clearScreens
      'silent',
    )
	_logger.debug('<<< Exiting clear()');
  }
  const clearScreen = canClearScreen ? clear : () => {}

  const { resolveFromPublicAssets } = useResolveFromPublicAssets()

  function output (type: vite.LogType, msg: string, options: vite.LogErrorOptions = {}) {
	_logger.debug(`>>> Entering output(type=${type},msg=${msg},options=${options})`);
    if (typeof msg === 'string' && !process.env.DEBUG) {
      // TODO: resolve upstream in Vite
      // Hide sourcemap warnings related to node_modules
      if (msg.startsWith('Sourcemap') && msg.includes('node_modules')) { return }
      // Hide warnings about externals produced by https://github.com/vitejs/vite/blob/v5.2.11/packages/vite/src/node/plugins/css.ts#L350-L355
      if (msg.includes('didn\'t resolve at build time, it will remain unchanged to be resolved at runtime')) {
        const id = msg.trim().match(RUNTIME_RESOLVE_REF_RE)?.[1]
		_logger.debug(`output(type=${type},msg=${msg},options=${options}): id → ${id}`);
        if (id && resolveFromPublicAssets(id)) { return }
      }
      if (type === 'info' && ctx.hideOutput && msg.includes(relativeOutDir)) { return }

      // Intercept Vite optimizer messages → OptimizeDepsHintPlugin. Fails gracefully (Vite's default messages pass through).
      // Source: https://github.com/vitejs/vite/blob/v7.3.1/packages/vite/src/node/optimizer/optimizer.ts
      // Ideally Vite exposes hooks for these in the future
      if (ctx.onStaleDep && type === 'warn' && (msg.includes('Failed to resolve dependency') || msg.includes('Cannot optimize dependency'))) {
        const match = stripAnsi(msg).match(/(?:Failed to resolve|Cannot optimize) dependency:\s*([^,]+)/)
        if (match) {
          ctx.onStaleDep(match[1]!.trim())
          return
        }
      }
      if (ctx.onNewDeps && type === 'info' && msg.includes('new dependencies optimized:')) {
        const match = stripAnsi(msg).match(/new dependencies optimized:\s*(.+)/)
        if (match) {
		_logger.debug(`output(type=${type},msg=${msg},options=${options}): match → ${match}`);
          ctx.onNewDeps(match[1]!.split(',').map(d => d.trim()).filter(Boolean))
          return
        }
      }
      if (ctx.onNewDeps && type === 'info' && (msg.includes('optimized dependencies changed. reloading') || msg.includes('add these dependencies to optimizeDeps.include'))) {
        return
      }
    }

    const sameAsLast = lastType === type && lastMsg === msg
    if (sameAsLast) {
      duplicateCount += 1
      clearScreen()
    } else {
      duplicateCount = 0
      lastType = type
      lastMsg = msg

      if (options.clear) {
        clearScreen()
      }
    }

    if (options.error) {
      loggedErrors.add(options.error)
    }

    const prevLevel = logger.level
    logger.level = logLevelMapReverse[config.logLevel || 'info']
	_logger.debug(`output(type=${type},msg=${msg},options=${options}): logger.level → ${logger.level}`);
    logger[type](msg + (sameAsLast ? colorize('dim', ` (x${duplicateCount + 1})`) : ''))
    logger.level = prevLevel
	_logger.debug(`<<< Exiting output(type=${type},msg=${msg},options=${options})`);
  }

  const warnedMessages = new Set<string>()

  const viteLogger: vite.Logger = {
    hasWarned: false,
    info (msg, opts) {
	_logger.debug(`>>> Entering info(msg=${msg},opts=${opts})`);
      output('info', msg, opts)
	_logger.debug(`<<< Exiting info(msg=${msg},opts=${opts})`);
    },
    warn (msg, opts) {
	_logger.debug(`>>> Entering warn(msg=${msg},opts=${opts})`);
      viteLogger.hasWarned = true
      output('warn', msg, opts)
	_logger.debug(`<<< Exiting warn(msg=${msg},opts=${opts})`);
    },
    warnOnce (msg, opts) {
	_logger.debug(`>>> Entering warnOnce(msg=${msg},opts=${opts})`);
      if (warnedMessages.has(msg)) { return }
      viteLogger.hasWarned = true
      output('warn', msg, opts)
      warnedMessages.add(msg)
	_logger.debug(`<<< Exiting warnOnce(msg=${msg},opts=${opts})`);
    },
    error (msg, opts) {
	_logger.debug(`>>> Entering error(msg=${msg},opts=${opts})`);
      viteLogger.hasWarned = true
      output('error', msg, opts)
	_logger.debug(`<<< Exiting error(msg=${msg},opts=${opts})`);
    },
    clearScreen () {
	_logger.debug('>>> Entering clearScreen()');
      clear()
	_logger.debug('<<< Exiting clearScreen()');
    },
    hasErrorLogged (error) {
	_logger.debug(`>>> Entering hasErrorLogged(error=${error})`);
	_logger.debug(`<<< Exiting hasErrorLogged(error=${error})`);
      return loggedErrors.has(error)
    },
  }

  return viteLogger
}
