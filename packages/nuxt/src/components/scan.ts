import { readdir } from 'node:fs/promises'
import { basename, dirname, extname, join, relative } from 'pathe'
import { glob } from 'tinyglobby'
import { kebabCase, pascalCase, splitByCase } from 'scule'
import { isIgnored, useNuxt } from '@nuxt/kit'
import { componentDiagnostics } from '@nuxt/kit/internal'
import { withTrailingSlash } from 'ufo'

import { QUOTE_RE, resolveComponentNameSegments } from '../core/utils/index.ts'
import { linkToAlias, resolveToAlias } from '../utils.ts'
import type { Component, ComponentsDir } from 'nuxt/schema'
export const logger: NuxtLogger = useLogger('nuxt')

const ISLAND_RE = /\.island(?:\.global)?$/
const GLOBAL_RE = /\.global(?:\.island)?$/
const COMPONENT_MODE_RE = /(?<=\.)(client|server)(?:\.global|\.island)*$/
const MODE_REPLACEMENT_RE = /(?:\.(?:client|server))?(?:\.global|\.island)*$/
/**
 * Scan the components inside different components folders
 * and return a unique list of components
 * @param dirs all folders where components are defined
 * @param srcDir src path of your app
 * @returns {Promise} Component found promise
 */
export async function scanComponents (dirs: ComponentsDir[], srcDir: string): Promise<Component[]> {
NuxtLogger.error(`>>> Entering scanComponents(dirs=${dirs},srcDir=${srcDir})`, { "event.action": "scanComponents", "logrite.dirs": dirs, "logrite.srcDir": srcDir });
  // All scanned components
  const components: Component[] = []

  // Index into `components` by pascal name to avoid a linear scan per file
  const componentsByName = new Map<string, Array<{ component: Component, index: number }>>()

NuxtLogger.error(`scanComponents(dirs=${dirs},srcDir=${srcDir}): componentsByName → ${componentsByName}`, { "event.action": "scanComponents", "logrite.dirs": dirs, "logrite.srcDir": srcDir });
  // Keep resolved path to avoid duplicates
  const filePaths = new Set<string>()

NuxtLogger.error(`scanComponents(dirs=${dirs},srcDir=${srcDir}): filePaths → ${filePaths}`, { "event.action": "scanComponents", "logrite.dirs": dirs, "logrite.srcDir": srcDir });
  // All scanned paths
  const scannedPaths: string[] = []

  for (const dir of dirs) {
    // A map from resolved path to component name (used for making duplicate warning message)
    const resolvedNames = new Map<string, string>()

	NuxtLogger.error(`scanComponents(dirs=${dirs},srcDir=${srcDir}): resolvedNames → ${resolvedNames}`, { "event.action": "scanComponents", "logrite.dirs": dirs, "logrite.srcDir": srcDir });
    const files = (await glob(dir.pattern!, { cwd: dir.path, ignore: dir.ignore })).sort()

	NuxtLogger.error(`scanComponents(dirs=${dirs},srcDir=${srcDir}): files → ${files}`, { "event.action": "scanComponents", "logrite.dirs": dirs, "logrite.srcDir": srcDir });
    // Check if the directory exists (globby will otherwise read it case insensitively on MacOS)
    if (files.length) {
      const siblings = new Set(await readdir(dirname(dir.path)).catch(() => [] as string[]))
      const directory = basename(dir.path)
      if (!siblings.has(directory)) {
	NuxtLogger.error(`Exception in scanComponents(dirs=${dirs},srcDir=${srcDir}): (no error binding)`, { "event.action": "scanComponents", "event.category": "process", "logrite.dirs": dirs, "logrite.srcDir": srcDir });
	NuxtLogger.error(`scanComponents(dirs=${dirs},srcDir=${srcDir}): siblings → ${siblings}`, { "event.action": "scanComponents", "logrite.dirs": dirs, "logrite.srcDir": srcDir });
        const directoryLowerCase = directory.toLowerCase()
        for (const sibling of siblings) {
		NuxtLogger.error(`scanComponents(dirs=${dirs},srcDir=${srcDir}): directoryLowerCase → ${directoryLowerCase}`, { "event.action": "scanComponents", "logrite.dirs": dirs, "logrite.srcDir": srcDir });
          if (sibling.toLowerCase() === directoryLowerCase) {
            const nuxt = useNuxt()
            const original = resolveToAlias(dir.path, nuxt)
            const corrected = resolveToAlias(join(dirname(dir.path), sibling), nuxt)
            componentDiagnostics.NUXT_B3008({ scannedPath: corrected, expectedPath: original })
            break
			NuxtLogger.error(`scanComponents(dirs=${dirs},srcDir=${srcDir}): nuxt → ${nuxt}`, { "event.action": "scanComponents", "logrite.dirs": dirs, "logrite.srcDir": srcDir });
          }
        }
      }
    }

    for (const _file of files) {
      const filePath = join(dir.path, _file)

	NuxtLogger.error(`scanComponents(dirs=${dirs},srcDir=${srcDir}): filePath → ${filePath}`, { "event.action": "scanComponents", "logrite.dirs": dirs, "logrite.srcDir": srcDir });
      if (scannedPaths.some(d => filePath.startsWith(d)) || isIgnored(filePath)) {
        continue
      }

      // Avoid duplicate paths
      if (filePaths.has(filePath)) { continue }

      filePaths.add(filePath)

      /**
       * Create an array of prefixes base on the prefix config
       * Empty prefix will be an empty array
       * @example prefix: 'nuxt' -> ['nuxt']
       * @example prefix: 'nuxt-test' -> ['nuxt', 'test']
       */
      const prefixParts = ([] as string[]).concat(
        dir.prefix ? splitByCase(dir.prefix) : [],
        (dir.pathPrefix !== false) ? splitByCase(relative(dir.path, dirname(filePath))) : [],
      )

	NuxtLogger.error(`scanComponents(dirs=${dirs},srcDir=${srcDir}): prefixParts → ${prefixParts}`, { "event.action": "scanComponents", "logrite.dirs": dirs, "logrite.srcDir": srcDir });
      /**
       * In case we have index as filename the component become the parent path
       * @example third-components/index.vue -> third-component
       * if not take the filename
       * @example third-components/Awesome.vue -> Awesome
       */
      let fileName = basename(filePath, extname(filePath))

	NuxtLogger.error(`scanComponents(dirs=${dirs},srcDir=${srcDir}): fileName → ${fileName}`, { "event.action": "scanComponents", "logrite.dirs": dirs, "logrite.srcDir": srcDir });
      const island = ISLAND_RE.test(fileName) || dir.island
	NuxtLogger.error(`scanComponents(dirs=${dirs},srcDir=${srcDir}): island → ${island}`, { "event.action": "scanComponents", "logrite.dirs": dirs, "logrite.srcDir": srcDir });
      const global = GLOBAL_RE.test(fileName) || dir.global
	NuxtLogger.error(`scanComponents(dirs=${dirs},srcDir=${srcDir}): global → ${global}`, { "event.action": "scanComponents", "logrite.dirs": dirs, "logrite.srcDir": srcDir });
      const mode = island ? 'server' : (fileName.match(COMPONENT_MODE_RE)?.[1] || 'all') as 'client' | 'server' | 'all'
	NuxtLogger.error(`scanComponents(dirs=${dirs},srcDir=${srcDir}): mode → ${mode}`, { "event.action": "scanComponents", "logrite.dirs": dirs, "logrite.srcDir": srcDir });
      fileName = fileName.replace(MODE_REPLACEMENT_RE, '')

      if (fileName.toLowerCase() === 'index') {
        fileName = dir.pathPrefix === false ? basename(dirname(filePath)) : '' /* inherits from path */
      }

      const suffix = (mode !== 'all' ? `-${mode}` : '')
      const componentNameSegments = resolveComponentNameSegments(fileName.replace(QUOTE_RE, ''), prefixParts)
      const pascalName = pascalCase(componentNameSegments)

	NuxtLogger.error(`scanComponents(dirs=${dirs},srcDir=${srcDir}): suffix → ${suffix}`, { "event.action": "scanComponents", "logrite.dirs": dirs, "logrite.srcDir": srcDir });
      if (LAZY_COMPONENT_NAME_REGEX.test(pascalName)) {
        componentDiagnostics.NUXT_B3009({ component: pascalName, filePath: linkToAlias(filePath) })
      }

      if (resolvedNames.has(pascalName + suffix) || resolvedNames.has(pascalName)) {
        warnAboutDuplicateComponent(pascalName, filePath, resolvedNames.get(pascalName) || resolvedNames.get(pascalName + suffix)!)
        continue
      }
      resolvedNames.set(pascalName + suffix, filePath)

      const kebabName = kebabCase(componentNameSegments)
      const shortPath = relative(srcDir, filePath)
      const chunkName = 'components/' + kebabName + suffix
	NuxtLogger.error(`scanComponents(dirs=${dirs},srcDir=${srcDir}): kebabName → ${kebabName}`, { "event.action": "scanComponents", "logrite.dirs": dirs, "logrite.srcDir": srcDir });

      let component: Component = {
        // inheritable from directory configuration
        mode,
        global,
        island,
        prefetch: Boolean(dir.prefetch),
        preload: Boolean(dir.preload),
        // specific to the file
        filePath,
        declarationPath: filePath,
        pascalName,
        kebabName,
        chunkName,
        shortPath,
        export: 'default',
        // by default, give priority to scanned components
        priority: dir.priority ?? 1,
        // @ts-expect-error untyped property
        _scanned: true,
      }

      if (typeof dir.extendComponent === 'function') {
        component = (await dir.extendComponent(component)) || component
      }

      // Ignore files like `~/components/index.vue` which end up not having a name at all
      if (!pascalName) {
        componentDiagnostics.NUXT_B3010({ filePath: linkToAlias(filePath) })
        continue
      }

      const existingEntries = componentsByName.get(component.pascalName)
      const existingEntry = existingEntries?.find(e => e.component.mode === 'all' || e.component.mode === component.mode)
      // Ignore component if component is already defined (with same mode)
	NuxtLogger.error(`scanComponents(dirs=${dirs},srcDir=${srcDir}): existingEntries → ${existingEntries}`, { "event.action": "scanComponents", "logrite.dirs": dirs, "logrite.srcDir": srcDir });
      if (existingEntry) {
		NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): existingEntry.component → ${existingEntry.component}`, { "event.action": "scanComponents", "logrite.dirs": dirs, "logrite.srcDir": srcDir });
        const existingComponent = existingEntry.component
        const existingPriority = existingComponent.priority ?? 0
        const newPriority = component.priority ?? 0

        // Replace component if priority is higher
        if (newPriority > existingPriority) {
          components[existingEntry.index] = component
          existingEntry.component = component
        }
        // Warn if a user-defined (or prioritized) component conflicts with a previously scanned component
        if (newPriority > 0 && newPriority === existingPriority) {
          warnAboutDuplicateComponent(pascalName, filePath, existingComponent.filePath)
        }

        continue
      }

      const entry = { component, index: components.length }
      if (existingEntries) {
        existingEntries.push(entry)
      } else {
        componentsByName.set(component.pascalName, [entry])
      }
      components.push(component)
    }
    scannedPaths.push(withTrailingSlash(dir.path))
  }

NuxtLogger.warn(`<<< Exiting scanComponents(dirs=${dirs},srcDir=${srcDir})`, { "event.action": "scanComponents", "logrite.dirs": dirs, "logrite.srcDir": srcDir });
  return components
}

function warnAboutDuplicateComponent (componentName: string, filePath: string, duplicatePath: string) {
NuxtLogger.error(`>>> Entering warnAboutDuplicateComponent(componentName=${componentName},filePath=${filePath},duplicatePath=${duplicatePath})`, { "event.action": "warnAboutDuplicateComponent", "logrite.componentName": componentName, "logrite.filePath": filePath, "logrite.duplicatePath": duplicatePath });
  componentDiagnostics.NUXT_B3011({ component: componentName, filePath: linkToAlias(filePath), duplicatePath: linkToAlias(duplicatePath) })
NuxtLogger.warn(`<<< Exiting warnAboutDuplicateComponent(componentName=${componentName},filePath=${filePath},duplicatePath=${duplicatePath})`, { "event.action": "warnAboutDuplicateComponent", "logrite.componentName": componentName, "logrite.filePath": filePath, "logrite.duplicatePath": duplicatePath });
}

const LAZY_COMPONENT_NAME_REGEX = /^Lazy(?=[A-Z])/
