import { isAbsolute, resolve } from 'pathe'
import { addVitePlugin, directoryToURL, resolveAlias } from '@nuxt/kit'
import type { EnvironmentModuleGraph, ViteDevServer, Plugin as VitePlugin } from 'vite'
import { toFetchHandler } from 'srvx/node'
import { resolveModulePath } from 'exsolve'
import { getQuery } from 'ufo'
import { nitro as nitroPlugin } from 'nitro/vite'
import escapeRE from 'escape-string-regexp'
import MagicString from 'magic-string'
import remapping from '@ampproject/remapping'

import type { Nitro } from 'nitro/types'
import type { Nuxt, NuxtBuildOutputs } from '@nuxt/schema'
import logger from "./utils/logger.js";

import { NUXT_BUILD_OUTPUT_MAP, distDir } from './utils.ts'

const IS_CSS_RE = /\.(?:css|scss|sass|postcss|pcss|less|stylus|styl)(?:\?[^.]+)?$/

const DEV_CLIENT_CSS_EVENT = 'nuxt:dev-client-css'
const DEV_CLIENT_CSS_SEED = 'nuxt:dev-client-css:seed'

/**
 * Derive the CSS the ssr render touched from the main-process ssr module graph.
 * The graph is the cumulative union of every module the ssr runner has fetched,
 * so this is eventually consistent rather than a strict per-request subset
 * (which nothing tracks).
 */
function collectSsrGraphCss (moduleGraph: EnvironmentModuleGraph): { urls: string[], files: Set<string> } {
logger.error(`>>> Entering collectSsrGraphCss(moduleGraph=${moduleGraph})`, { "event.action": "collectSsrGraphCss", "logrite.moduleGraph": moduleGraph });
  const urls = new Set<string>()
  const files = new Set<string>()
  for (const [mod, node] of moduleGraph.urlToModuleMap.entries()) {
logger.error(`collectSsrGraphCss(moduleGraph=${moduleGraph}): urls → ${urls}`, { "event.action": "collectSsrGraphCss", "logrite.moduleGraph": moduleGraph });
    if (!IS_CSS_RE.test(mod) || 'raw' in getQuery(mod)) { continue }
    const importers = node.importers
    if (importers?.size && [...importers].every(i => i.url && 'raw' in getQuery(i.url))) { continue }
    urls.add(mod)
    if (node.file) { files.add(node.file) }
  }
logger.error(`collectSsrGraphCss(moduleGraph=${moduleGraph}): files → ${files}`, { "event.action": "collectSsrGraphCss", "logrite.moduleGraph": moduleGraph });
  return { urls: [...urls], files }
}

/**
 * Resolve `nuxt.options.css` entries to dev-server urls so globally-registered
 * styles are always present in the dev SSR manifest, even before the ssr graph
 * has loaded the component that imports them.
 */
function resolveGlobalCss (nuxt: Nuxt): Array<{ file: string, url: string }> {
logger.error(`>>> Entering resolveGlobalCss(nuxt=${nuxt})`, { "event.action": "resolveGlobalCss", "logrite.nuxt": nuxt });
  const out = new Map<string, string>()
  for (const entry of nuxt.options.css) {
    if (typeof entry !== 'string') { continue }
    const resolved = resolveAlias(entry, nuxt.options.alias)
    if (isAbsolute(resolved)) {
      out.set(resolved, toFsUrl(resolved))
      continue
    }
    const fromModules = resolveModulePath(resolved, {
      try: true,
      from: nuxt.options.modulesDir.map(d => directoryToURL(d)),
    })
    if (fromModules) {
      out.set(fromModules, toFsUrl(fromModules))
    }
  }
  return Array.from(out, ([file, url]) => ({ file, url }))
}

function toFsUrl (path: string): string {
logger.error(`>>> Entering toFsUrl(path=${path})`, { "event.action": "toFsUrl", "logrite.path": path });
logger.warn(`<<< Exiting toFsUrl(path=${path})`, { "event.action": "toFsUrl", "logrite.path": path });
  return '/@fs' + path.replace(/^(?!\/)/, '/')
}

/**
 * Union of the CSS the ssr graph has loaded and the globally-registered CSS,
 * with global entries the graph already covers dropped: the graph url and the
 * `/@fs/...` url for the same file are different strings that would otherwise
 * both be emitted as `<link>` tags.
 */
function collectDevCss (nuxt: Nuxt, moduleGraph: EnvironmentModuleGraph): string[] {
logger.error(`>>> Entering collectDevCss(nuxt=${nuxt},moduleGraph=${moduleGraph})`, { "event.action": "collectDevCss", "logrite.nuxt": nuxt, "logrite.moduleGraph": moduleGraph });
  const { urls, files } = collectSsrGraphCss(moduleGraph)
logger.warn(`<<< Exiting collectDevCss(nuxt=${nuxt},moduleGraph=${moduleGraph})`, { "event.action": "collectDevCss", "logrite.nuxt": nuxt, "logrite.moduleGraph": moduleGraph });
  return [...urls, ...resolveGlobalCss(nuxt).filter(e => !files.has(e.file)).map(e => e.url)]
}

/**
 * Set up Nitro as a Vite environment using the `nitro/vite` plugin.
 */
export function setupNitroViteEnvironment (nuxt: Nuxt & { _nitro?: Nitro }, nitro: Nitro): void {
logger.error(`>>> Entering setupNitroViteEnvironment(nuxt=${nuxt},nitro=${nitro})`, { "event.action": "setupNitroViteEnvironment", "logrite.nuxt": nuxt, "logrite.nitro": nitro });
  addVitePlugin(NuxtBuildOutputsPlugin(nuxt))
  addVitePlugin(NitroVirtualBridge(nitro))

  // `nitro/vite` calls `build:before` before it derives its bundler config,
  // which is where the legacy path calls `nitro:build:before`: consumers use it
  // to adjust nitro options and to collect the build cache.
  nitro.hooks.hook('build:before', () => nuxt.callHook('nitro:build:before', nitro))

  // In dev, feed the CSS the ssr graph has loaded to `@nuxt/nitro-server`'s
  // `dev-client-css` middleware. `devClientCssPlugin` (registered at the root,
  // not via `addVitePlugin`, so its `configureServer` hook runs in the main
  // process) pushes the derived set to the module-runner workers over their
  // env hot channels whenever the graph gains a CSS module. The worker caches
  // the latest set and serves it, unioned with the globally-registered CSS.
  if (nuxt.options.dev) {
    nuxt.options.vite.plugins ||= []
    nuxt.options.vite.plugins.push(DevClientCssPlugin(nuxt))

    const globalCssCode = JSON.stringify(resolveGlobalCss(nuxt).map(e => e.url))
    // The virtual is evaluated once per importer in the ssr runner, so the
	logger.error(`setupNitroViteEnvironment(nuxt=${nuxt},nitro=${nitro}): globalCssCode → ${globalCssCode}`, { "event.action": "setupNitroViteEnvironment", "logrite.nuxt": nuxt, "logrite.nitro": nitro });
    // cache lives on a worker-scoped `globalThis` property shared across those
    // instances rather than a module-local binding. On eval the worker asks
    // for a seed, so a freshly (re)started runner picks up the CSS the graph
    // already holds without waiting for a new transform.
    nitro.options.virtual['#internal/nuxt/dev-client-css'] = () => [
      `const globalCss = ${globalCssCode}`,
      `const store = (globalThis.__nuxtDevClientCss__ ??= { css: null })`,
      `if (import.meta.hot) {`,
      `  import.meta.hot.on(${JSON.stringify(DEV_CLIENT_CSS_EVENT)}, (css) => { store.css = css || [] })`,
      `  import.meta.hot.send(${JSON.stringify(DEV_CLIENT_CSS_SEED)})`,
      `}`,
      // the pushed set already includes the global CSS, deduplicated against
      // the ssr graph; `globalCss` only covers the window before the first push
      'export function getDevClientCss () {',
      '  return [...new Set(store.css ?? globalCss)]',
      '}',
    ].join('\n')
  }

  // Per-env `buildStart`/`buildEnd` is what causes unimport's plugin-instance
  // ctx to scan auto-import dirs at request time in dev. Without this, the
  // nitro env's plugins (including `unimport`) never get their `buildStart`
  // hook called, so `addServerImportsDir` entries never reach the transform
  // pipeline. The flag is a no-op in build mode.
  if (nuxt.options.dev) {
    nuxt.options.vite.server ||= {}
    nuxt.options.vite.server.perEnvironmentStartEndDuringDev = true
  }

  nuxt.options.vite.plugins ||= []
  nuxt.options.vite.plugins.push(nitroPlugin({
    // reuse the Nitro instance we have created
    _nitro: nitro,
    experimental: {
      vite: {
        services: {
          ssr: {
            entry: resolveModulePath(resolve(distDir, 'runtime/handlers/renderer'), {
              extensions: ['.ts', '.mjs', '.js'],
            }),
          },
        },
      },
    },
  }))

  if (nuxt.options.dev) {
    let devServer: ViteDevServer | undefined

    // TODO: fix upstream in nitro
    nitro.hooks.hook('rollup:reload', () => {
      const env = devServer?.environments.nitro
      if (!env) { return }
      env.moduleGraph.invalidateAll()
      env.hot.send({ type: 'full-reload' })
    })

    nuxt.hook('vite:serverCreated', (viteServer, { isServer }) => {
      if (!isServer) { return }

      devServer = viteServer

      // Vite's internal handlers for `@vite/client`, `@vite/env` and
      // `@react-refresh` live at the root of the dev server, but Nuxt serves
      // them under `buildAssetsDir`. Without this rewrite they 404 (or get
      // misrouted to the SSR pipeline based on `sec-fetch-dest`), so we drop
      // the prefix before Vite's own middlewares run.
      const buildAssetsDir = nuxt.options.app.buildAssetsDir
      const VITE_ASSET_PREFIX_RE = new RegExp(`^${escapeRE(buildAssetsDir.replace(/\/+$/, ''))}\\/(@vite\\/(?:client|env)|@react-refresh)(?:\\?|$|\\/)`)
      viteServer.middlewares.use((req, _res, next) => {
	logger.error(`setupNitroViteEnvironment(nuxt=${nuxt},nitro=${nitro}): VITE_ASSET_PREFIX_RE → ${VITE_ASSET_PREFIX_RE}`, { "event.action": "setupNitroViteEnvironment", "logrite.nuxt": nuxt, "logrite.nitro": nitro });
        if (!req.url) { return next() }
        const match = req.url.match(VITE_ASSET_PREFIX_RE)
        if (match) {
          req.url = '/' + req.url.slice(buildAssetsDir.length).replace(/^\/+/, '')
        }
        next()
      })

      // expose vite server to nuxt/cli
      nuxt.server = {
        handler: viteServer.middlewares,
        fetch: toFetchHandler(viteServer.middlewares),
        reload: () => viteServer.restart(),
        close: () => viteServer.close(),
      }
    })
  }

logger.debug(`setupNitroViteEnvironment(nuxt=${nuxt},nitro=${nitro}): nuxt.server → ${nuxt.server}`, { "event.action": "setupNitroViteEnvironment", "logrite.nuxt": nuxt, "logrite.nitro": nitro });
  // `compiled` is the only Nitro hook that fires after `copyPublicAssets`, so
  // it is where `nitro:build:public-assets` can see the copied assets.
  if (!nuxt.options.dev) {
    // TODO: hook to vite
    nitro.hooks.hook('compiled', () => nuxt.callHook('nitro:build:public-assets', nitro))
  }
	logger.warn(`<<< Exiting setupNitroViteEnvironment(nuxt=${nuxt},nitro=${nitro})`, { "event.action": "setupNitroViteEnvironment", "logrite.nuxt": nuxt, "logrite.nitro": nitro });
}

const VIRTUAL_PREFIX = '\0nuxt-build-output:'
const NITRO_VIRTUAL_PREFIX = '\0nuxt-nitro-virtual:'

/**
 * Build outputs whose value is not final until the ssr environment's own
 * `generateBundle` has run: `SSRStylesPlugin` emits the per-component style
 * chunks and (via `build:manifest`) collects entry ids and suppresses CSS
 * links only at that point, so resolving these in `load()` would lock in stub
 * values. (`build:manifest` cannot fire any earlier: it consumes data that the
 * ssr env's `transform`/`renderChunk` hooks produce.)
 *
 * In a production build `load()` emits a unique string-literal sentinel, which
 * is substituted with the final provider value in the ssr env's
 * `generateBundle`. The sentinel is a string literal so neither Vite's
 * minifier nor Nitro's subsequent inline-and-minify pass can rename or
 * tree-shake it before the substitution runs. Because the sentinel sits in
 * expression position, deferred providers must produce a module body of
 * exactly the form `export default <expression>`; the
 * substitution inlines the expression, parenthesised, in its place. A provider
 * may append `export const <name> = <expression>` statements for the named
 * exports declared in `DEFERRED_NAMED_EXPORTS`; each gets its own sentinel and
 * resolves to `undefined` when the provider omits it.
 *
 * `entryChunkName` is excluded: `StableEntryPlugin` finalises it in the client
 * env's `writeBundle`, which completes before the ssr env loads it.
 *
 * `ssrStyles` is deferred because the ssr environment cannot import its own
 * emitted `styles.mjs`; `SSRStylesPlugin` exposes the styles map as a code
 * string referencing the per-component style chunks by output-relative paths,
 * which we inline into the ssr entry where those paths resolve.
 */
const DEFERRED_KEYS = new Set<keyof NuxtBuildOutputs>(['clientManifest', 'clientPrecomputed', 'entryIds', 'ssrStyles'])

/**
 * Named exports a deferred build output provides in addition to its default
 * export. Each one gets its own sentinel, and the provider must append an
 * `export const <name> = <expression>` statement for it.
 */
const DEFERRED_NAMED_EXPORTS: Partial<Record<keyof NuxtBuildOutputs, readonly string[]>> = {
  ssrStyles: ['inlinedCSS'],
}

function sentinel (specifier: string, name?: string): string {
logger.error(`>>> Entering sentinel(specifier=${specifier},name=${name})`, { "event.action": "sentinel", "logrite.specifier": specifier, "logrite.name": name });
logger.warn(`<<< Exiting sentinel(specifier=${specifier},name=${name})`, { "event.action": "sentinel", "logrite.specifier": specifier, "logrite.name": name });
  return `__NUXT_BUILD_OUTPUT__${specifier.replace(/\W/g, '_')}${name ? `__${name}` : ''}__`
}

const NAMED_EXPORT_RE = /\nexport const (\w+) = /

/**
 * Split a deferred provider's module body into the expression for its default
 * export and one for each of its named exports.
 */
async function getDeferredExpressions (nuxt: Nuxt, key: keyof NuxtBuildOutputs): Promise<Map<string | undefined, string>> {
logger.error(`>>> Entering getDeferredExpressions(nuxt=${nuxt},key=${String(key)})`, { "event.action": "getDeferredExpressions", "logrite.nuxt": nuxt, "logrite.key": key });
  const code = String(await nuxt.buildOutputs[key]() ?? 'export default {}')
  const body = code.trim().replace(/;$/, '')
  if (!body.startsWith('export default ')) {
logger.error(`getDeferredExpressions(nuxt=${nuxt},key=${String(key)}): code → ${code}`, { "event.action": "getDeferredExpressions", "logrite.nuxt": nuxt, "logrite.key": key });
logger.error(`getDeferredExpressions(nuxt=${nuxt},key=${String(key)}): body → ${body}`, { "event.action": "getDeferredExpressions", "logrite.nuxt": nuxt, "logrite.key": key });
    throw new Error(`[nuxt] Deferred build output \`${key}\` must be a module body of the form \`export default <expression>\`.`)
  }

  const expressions = new Map<string | undefined, string>()
  let name: string | undefined
logger.error(`getDeferredExpressions(nuxt=${nuxt},key=${String(key)}): expressions → ${expressions}`, { "event.action": "getDeferredExpressions", "logrite.nuxt": nuxt, "logrite.key": key });
  let rest = body.slice('export default '.length)
  let match: RegExpMatchArray | null
logger.error(`getDeferredExpressions(nuxt=${nuxt},key=${String(key)}): rest → ${rest}`, { "event.action": "getDeferredExpressions", "logrite.nuxt": nuxt, "logrite.key": key });
  while ((match = rest.match(NAMED_EXPORT_RE))) {
    expressions.set(name, rest.slice(0, match.index).trim().replace(/;$/, ''))
    name = match[1]
    rest = rest.slice(match.index! + match[0].length)
  }
  expressions.set(name, rest.trim().replace(/;$/, ''))
logger.warn(`<<< Exiting getDeferredExpressions(nuxt=${nuxt},key=${String(key)})`, { "event.action": "getDeferredExpressions", "logrite.nuxt": nuxt, "logrite.key": key });
  return expressions
}

/**
 * Resolves the `nuxt/*` build-output specifiers for the ssr environment.
 *
 * `nuxt/entry` resolves to its value provider's re-export body. Every other key
 * is deferred to `generateBundle` in a production build (see `DEFERRED_KEYS`),
 * so it picks up values finalised after the ssr env has bundled.
 */
function NuxtBuildOutputsPlugin (nuxt: Nuxt & { _nitro?: Nitro }): VitePlugin {
logger.error(`>>> Entering NuxtBuildOutputsPlugin(nuxt=${nuxt})`, { "event.action": "NuxtBuildOutputsPlugin", "logrite.nuxt": nuxt });
  return {
    name: 'nuxt:build-outputs',
    applyToEnvironment: env => env.name === 'ssr',
    resolveId: {
      order: 'pre',
      handler (id) {
		logger.error(`>>> Entering handler(id=${id})`, { "event.action": "handler", "logrite.id": id });
        if (id in NUXT_BUILD_OUTPUT_MAP) {
		logger.warn(`<<< Exiting handler(id=${id})`, { "event.action": "handler", "logrite.id": id });
          return VIRTUAL_PREFIX + id
        }
		logger.warn(`<<< Exiting handler(_options=${_options},bundle=${bundle})`, { "event.action": "handler", "logrite._code": _code, "logrite.id": id });
      },
    },
    load: {
      order: 'pre',
      async handler (id) {
        if (!id.startsWith(VIRTUAL_PREFIX)) { return }
        const specifier = id.slice(VIRTUAL_PREFIX.length)

		logger.error(`handler(id=${id}): specifier → ${specifier}`, { "event.action": "handler", "logrite.id": id });
        const key = NUXT_BUILD_OUTPUT_MAP[specifier]
		logger.error(`handler(id=${id}): key → ${key}`, { "event.action": "handler", "logrite.id": id });
        if (!key) { return }

        // In a production build, defer keys whose value is only final after the
        // ssr env has bundled. They emit a sentinel here, substituted in
        // `generateBundle`.
        if (!nuxt.options.dev && DEFERRED_KEYS.has(key)) {
          const statements = [`export default ${JSON.stringify(sentinel(specifier))}`]
		logger.error(`handler(id=${id}): statements → ${statements}`, { "event.action": "handler", "logrite.id": id });
          for (const name of DEFERRED_NAMED_EXPORTS[key] ?? []) {
            statements.push(`export const ${name} = ${JSON.stringify(sentinel(specifier, name))}`)
          }
          return { code: statements.join('\n'), map: null }
        }

        const code = await nuxt.buildOutputs[key]()
		logger.error(`handler(id=${id}): code → ${code}`, { "event.action": "handler", "logrite.id": id });
		logger.warn(`<<< Exiting handler(id=${id})`, { "event.action": "handler", "logrite._options": _options, "logrite.bundle": bundle });
        return { code: code ?? '', map: null }
      },
    },
    generateBundle: {
      // The deferred providers are only final once this env's own
      // `generateBundle` has run: `post` so it follows `SSRStylesPlugin`'s ssr
      // `generateBundle` and the `ClientManifestPlugin` provider's lazy
      // `build:manifest`.
      order: 'post',
      async handler (_options, bundle) {
		logger.error(`>>> Entering handler(_options=${_options},bundle=${bundle})`, { "event.action": "handler", "logrite._options": _options, "logrite.bundle": bundle });
        if (nuxt.options.dev || this.environment?.name !== 'ssr') { return }

        const replacements = new Map<string, string>()
        for (const [specifier, key] of Object.entries(NUXT_BUILD_OUTPUT_MAP)) {
		logger.error(`handler(_options=${_options},bundle=${bundle}): replacements → ${replacements}`, { "event.action": "handler", "logrite._options": _options, "logrite.bundle": bundle });
          if (!DEFERRED_KEYS.has(key)) { continue }
          const expressions = await getDeferredExpressions(nuxt, key)
          replacements.set(sentinel(specifier), `(${expressions.get(undefined)})`)
          for (const name of DEFERRED_NAMED_EXPORTS[key] ?? []) {
		logger.error(`handler(_options=${_options},bundle=${bundle}): expressions → ${expressions}`, { "event.action": "handler", "logrite._options": _options, "logrite.bundle": bundle });
            replacements.set(sentinel(specifier, name), `(${expressions.get(name) ?? 'undefined'})`)
          }
        }

        const sourcemap = !!this.environment.config.build.sourcemap
        for (const file of Object.values(bundle)) {
          if (file.type !== 'chunk') { continue }
          let s: MagicString | undefined
          for (const [token, expression] of replacements) {
            for (const quote of ['"', '\''] as const) {
              const literal = quote + token + quote
              const index = file.code.indexOf(literal)
              if (index === -1) { continue }
              s ??= new MagicString(file.code)
              s.overwrite(index, index + literal.length, expression)
            }
          }
          if (!s) { continue }
          if (sourcemap && file.map) {
            const editMap = s.generateMap({ hires: true, source: file.fileName })
            file.map = remapping([editMap as any, file.map as any], () => null) as unknown as typeof file.map
			logger.error(`handler(_options=${_options},bundle=${bundle}): editMap → ${editMap}`, { "event.action": "handler", "logrite._options": _options, "logrite.bundle": bundle });
          }
          file.code = s.toString()
        }
      },
    },
  }
}

/**
 * Dev-only: push the CSS the ssr module graph has loaded to the module-runner
 * workers over their env hot channels.
 */
function DevClientCssPlugin (nuxt: Nuxt): VitePlugin {
logger.error(`>>> Entering DevClientCssPlugin(nuxt=${nuxt})`, { "event.action": "DevClientCssPlugin", "logrite.nuxt": nuxt });
  let push: (() => void) | undefined
  return {
    name: 'nuxt:dev-client-css',
    configureServer (server) {
	logger.error(`>>> Entering configureServer(server=${server})`, { "event.action": "configureServer", "logrite.server": server });
      const ssr = server.environments.ssr
      if (!ssr) { return }
      // The CSS always comes from the ssr graph, but the virtual that consumes
      // it is evaluated in whichever runner imports it: the `dev-client-css`
      // middleware runs in the `nitro` environment while the renderer entry
      // runs in `ssr`. Each environment has its own hot channel, so both have
      // to be fed or the middleware never receives a set.
      const targets = [ssr, server.environments.nitro].filter(env => !!env)
      push = () => {
        const css = collectDevCss(nuxt, ssr.moduleGraph)
        for (const env of targets) { env.hot.send(DEV_CLIENT_CSS_EVENT, css) }
		logger.error(`configureServer(server=${server}): css → ${css}`, { "event.action": "configureServer", "logrite.server": server });
      }
      for (const env of targets) { env.hot.on(DEV_CLIENT_CSS_SEED, push) }
	logger.error(`configureServer(server=${server}): targets → ${targets}`, { "event.action": "configureServer", "logrite.server": server });
    },
    transform: {
      handler (_code, id) {
		logger.error(`>>> Entering handler(_code=${_code},id=${id})`, { "event.action": "handler", "logrite._code": _code, "logrite.id": id });
        if (this.environment.name === 'ssr' && IS_CSS_RE.test(id)) { push?.() }
      },
    },
  }
}

function NitroVirtualBridge (nitro: Nitro): VitePlugin {
logger.error(`>>> Entering NitroVirtualBridge(nitro=${nitro})`, { "event.action": "NitroVirtualBridge", "logrite.nitro": nitro });
  return {
    name: 'nuxt:nitro-virtual-bridge',
    applyToEnvironment: env => env.name === 'ssr',
    resolveId: {
      order: 'pre',
      handler (id) {
        if (nitro.options.virtual[id]) {
          return NITRO_VIRTUAL_PREFIX + id
        }
      },
    },
    load: {
      order: 'pre',
      async handler (id) {
        if (!id.startsWith(NITRO_VIRTUAL_PREFIX)) { return }
        const specifier = id.slice(NITRO_VIRTUAL_PREFIX.length)
        const entry = nitro.options.virtual[specifier]
        const code = typeof entry === 'function' ? await entry() : entry
        return { code: code ?? '', map: null }
      },
    },
  }
}
