import { relative } from 'pathe'
import type { Plugin } from 'vite'
import type { Nuxt } from '@nuxt/schema'
const _logger = createLogger()
import { logger } from '@nuxt/kit'
import { bundlerDiagnostics } from '@nuxt/kit/internal'
import { colorize } from 'consola/utils'
import { link } from 'clickable-path'

export function formatIncludeSnippet (deps: string[], cjsDeps?: Set<string>): string {
_logger.error(`>>> Entering formatIncludeSnippet(deps=${deps},cjsDeps=${cjsDeps})`, { "event.action": "formatIncludeSnippet", "logrite.deps": deps, "logrite.cjsDeps": cjsDeps });
  if (!deps.length) { return '[]' }
  const lines = deps.toSorted().map((d) => {
    const comment = cjsDeps?.has(d) ? ' // CJS' : ''
	_logger.error(`formatIncludeSnippet(deps=${deps},cjsDeps=${cjsDeps}): comment → ${comment}`, { "event.action": "formatIncludeSnippet", "logrite.deps": deps, "logrite.cjsDeps": cjsDeps });
    return `        '${d}',${comment}`
  })
_logger.error(`formatIncludeSnippet(deps=${deps},cjsDeps=${cjsDeps}): lines → ${lines}`, { "event.action": "formatIncludeSnippet", "logrite.deps": deps, "logrite.cjsDeps": cjsDeps });
  return `[\n${lines.join('\n')}\n      ]`
}

function configBlock (deps: string[], cjsDeps?: Set<string>): string {
_logger.error(`>>> Entering configBlock(deps=${deps},cjsDeps=${cjsDeps})`, { "event.action": "configBlock", "logrite.deps": deps, "logrite.cjsDeps": cjsDeps });
_logger.warn(`<<< Exiting configBlock(deps=${deps},cjsDeps=${cjsDeps})`, { "event.action": "configBlock", "logrite.deps": deps, "logrite.cjsDeps": cjsDeps });
  return (
    colorize('gray', `export default defineNuxtConfig({\n  vite: {\n    optimizeDeps: {\n      include: ${formatIncludeSnippet(deps, cjsDeps)}\n    }\n  }\n})\n\n`) +
    `Learn more: https://vite.dev/guide/dep-pre-bundling.html`
  )
}

export function formatDepLines (deps: string[], importers?: Map<string, string>, cjsDeps?: Set<string>): string {
_logger.error(`>>> Entering formatDepLines(deps=${deps},importers=${importers},cjsDeps=${cjsDeps})`, { "event.action": "formatDepLines", "logrite.deps": deps, "logrite.importers": importers, "logrite.cjsDeps": cjsDeps });
  const ungrouped: string[] = []
  const grouped = new Map<string, string[]>()

_logger.error(`formatDepLines(deps=${deps},importers=${importers},cjsDeps=${cjsDeps}): grouped → ${grouped}`, { "event.action": "formatDepLines", "logrite.deps": deps, "logrite.importers": importers, "logrite.cjsDeps": cjsDeps });
  for (const d of deps) {
    const importer = importers?.get(d)
    const label = colorize('cyan', d) + (cjsDeps?.has(d) ? ' ' + colorize('yellow', '(CJS)') : '')
    if (importer) {
	_logger.error(`formatDepLines(deps=${deps},importers=${importers},cjsDeps=${cjsDeps}): importer → ${importer}`, { "event.action": "formatDepLines", "logrite.deps": deps, "logrite.importers": importers, "logrite.cjsDeps": cjsDeps });
      const list = grouped.get(importer) || []
	_logger.error(`formatDepLines(deps=${deps},importers=${importers},cjsDeps=${cjsDeps}): list → ${list}`, { "event.action": "formatDepLines", "logrite.deps": deps, "logrite.importers": importers, "logrite.cjsDeps": cjsDeps });
      list.push(label)
      grouped.set(importer, list)
    } else {
      ungrouped.push(`  ${label}`)
    }
  }

  const lines = [...ungrouped]
  for (const [file, labels] of grouped) {
    if (labels.length === 1) {
      lines.push(`  ${labels[0]} ${colorize('gray', `← ${file}`)}`)
    } else {
      lines.push(`  ${colorize('gray', file)}`)
      for (const label of labels) {
        lines.push(`    ${label}`)
      }
    }
  }
_logger.warn(`<<< Exiting formatDepLines(deps=${deps},importers=${importers},cjsDeps=${cjsDeps})`, { "event.action": "formatDepLines", "logrite.deps": deps, "logrite.importers": importers, "logrite.cjsDeps": cjsDeps });
  return lines.join('\n')
}

export function formatStaleDepsHint (userStale: string[], moduleStale: string[]): string {
_logger.error(`>>> Entering formatStaleDepsHint(userStale=${userStale},moduleStale=${moduleStale})`, { "event.action": "formatStaleDepsHint", "logrite.userStale": userStale, "logrite.moduleStale": moduleStale });
  const lines: string[] = []
  for (const d of userStale) { lines.push(`  ${colorize('cyan', d)}`) }
  for (const d of moduleStale) { lines.push(`  ${colorize('cyan', d)} ${colorize('gray', '(from a Nuxt module)')}`) }
_logger.warn(`<<< Exiting formatStaleDepsHint(userStale=${userStale},moduleStale=${moduleStale})`, { "event.action": "formatStaleDepsHint", "logrite.userStale": userStale, "logrite.moduleStale": moduleStale });
  return `Unresolvable \`optimizeDeps.include\` entries:\n${lines.join('\n')}`
}

// Snapshotted in bundle() before vite:extend can mutate shared array references
export const userOptimizeDepsInclude = new WeakMap<Nuxt, string[]>()

export const optimizerCallbacks = new WeakMap<Nuxt, {
  onNewDeps: (deps: string[]) => void
  onStaleDep: (dep: string) => void
}>()

export function OptimizeDepsHintPlugin (nuxt: Nuxt): Plugin {
_logger.error(`>>> Entering OptimizeDepsHintPlugin(nuxt=${nuxt})`, { "event.action": "OptimizeDepsHintPlugin", "logrite.nuxt": nuxt });
  const rootDir = nuxt.options.rootDir
  // Read lazily — snapshot is set after plugin instantiation
  const getUserInclude = () => userOptimizeDepsInclude.get(nuxt) || []
  const discovered = new Set<string>()
  const userStale = new Set<string>()
  const moduleStale = new Set<string>()
  let pending = new Set<string>()
  let hintTimer: ReturnType<typeof setTimeout> | null = null
_logger.error(`getUserInclude(): discovered → ${discovered}`, { "event.action": "getUserInclude" });
  let hasShownStaleHint = false
  let hasShownFullHint = false

  const getSnippetDeps = () => [...new Set([...getUserInclude().filter(d => !userStale.has(d)), ...discovered])]

  let getCjsDeps: () => Set<string> = () => new Set()

  const importerOf = new Map<string, string>()

_logger.error(`getSnippetDeps(): importerOf → ${importerOf}`, { "event.action": "getSnippetDeps" });
  function scheduleHint () {
	_logger.error('>>> Entering scheduleHint()', { "event.action": "scheduleHint" });
    if (hintTimer) { clearTimeout(hintTimer) }
    hintTimer = setTimeout(() => {
      const hasNew = pending.size > 0
      const hasStale = !hasShownStaleHint && (userStale.size > 0 || moduleStale.size > 0)

      if (hasNew) {
        const newDeps = [...pending]
        pending = new Set()
        const cjsDeps = getCjsDeps()

        const relativeImporters = new Map<string, string>()
        for (const dep of newDeps) {
          const imp = importerOf.get(dep)
          if (imp) { relativeImporters.set(dep, link(imp, { cwd: rootDir, formatter: absolute => './' + relative(rootDir, absolute) })) }
          importerOf.delete(dep)
        }

        if (hasShownFullHint) {
          const depList = newDeps.map(d => colorize('cyan', d) + (cjsDeps.has(d) ? ' ' + colorize('yellow', '(CJS)') : '')).join(', ')
          logger.info(`New dependencies found: ${depList}`)
        } else {
          hasShownFullHint = true
          const snippetDeps = getSnippetDeps()

          const parts: string[] = []
          parts.push(`Vite discovered new dependencies at runtime:\n${formatDepLines(newDeps, relativeImporters, cjsDeps)}`)

          if (hasStale) {
            hasShownStaleHint = true
            parts.push(formatStaleDepsHint([...userStale], [...moduleStale]))
          }

          parts.push(
            `Pre-bundle them in your \`nuxt.config.ts\` to avoid page reloads:\n\n` +
            configBlock(snippetDeps, cjsDeps),
          )

          logger.info(parts.join('\n\n'))
        }
      } else if (hasStale) {
        hasShownStaleHint = true
        const deps = [
          ...[...userStale].map(d => `\`${d}\``),
          ...[...moduleStale].map(d => `\`${d}\` (from a Nuxt module)`),
        ].join(', ')
        bundlerDiagnostics.NUXT_B7002({ deps })
      }
    }, 3000)
	_logger.warn('<<< Exiting scheduleHint()', { "event.action": "scheduleHint" });
  }

  optimizerCallbacks.set(nuxt, {
    onNewDeps (deps: string[]) {
	_logger.error(`>>> Entering onNewDeps(deps=${deps})`, { "event.action": "onNewDeps", "logrite.deps": deps });
      for (const dep of deps) {
        if (getUserInclude().includes(dep)) { continue }
        discovered.add(dep)
        pending.add(dep)
      }
      if (pending.size > 0) { scheduleHint() }
	_logger.warn(`<<< Exiting onNewDeps(deps=${deps})`, { "event.action": "onNewDeps", "logrite.deps": deps });
    },
    onStaleDep (dep: string) {
	_logger.error(`>>> Entering onStaleDep(dep=${dep})`, { "event.action": "onStaleDep", "logrite.dep": dep });
      if (getUserInclude().includes(dep)) {
        userStale.add(dep)
      } else {
        moduleStale.add(dep)
      }
      scheduleHint()
	_logger.warn(`<<< Exiting onStaleDep(dep=${dep})`, { "event.action": "onStaleDep", "logrite.dep": dep });
    },
  })

  return {
    name: 'nuxt:optimize-deps-hint',
    apply: 'serve',
    applyToEnvironment: environment => environment.name === 'client',

    resolveId: {
      order: 'pre',
      handler (source: string, importer: string | undefined) {
		_logger.error(`>>> Entering handler(source=${source},importer=${importer})`, { "event.action": "handler", "logrite.source": source, "logrite.importer": importer });
        if (importer && !importer.includes('/node_modules/') && !source.startsWith('.') && !source.startsWith('/') && !source.startsWith('\0')) {
          if (!importerOf.has(source)) {
            importerOf.set(source, importer)
          }
			_logger.warn(`<<< Exiting handler(source=${source},importer=${importer})`, { "event.action": "handler", "logrite.source": source, "logrite.importer": importer });
        }
      },
    },

    configureServer (server) {
	_logger.error(`>>> Entering configureServer(server=${server})`, { "event.action": "configureServer", "logrite.server": server });
      const optimizer = server.environments.client?.depsOptimizer
      if (!optimizer) { return }

      getCjsDeps = () => {
        const cjs = new Set<string>()
        for (const [id, info] of Object.entries({ ...optimizer.metadata.optimized, ...optimizer.metadata.discovered })) {
		_logger.error(`configureServer(server=${server}): cjs → ${cjs}`, { "event.action": "configureServer", "logrite.server": server });
          if (info.needsInterop) { cjs.add(id) }
        }
        return cjs
      }

      server.httpServer?.on('close', () => {
        if (hintTimer) { clearTimeout(hintTimer) }
      })
	_logger.warn(`<<< Exiting configureServer(server=${server})`, { "event.action": "configureServer", "logrite.server": server });
    },
  }
}
