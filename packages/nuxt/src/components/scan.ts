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
  // All scanned components
  const components: Component[] = []

  // Index into `components` by pascal name to avoid a linear scan per file
  const componentsByName = new Map<string, Array<{ component: Component, index: number }>>()

NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): componentsByName → ${componentsByName}`);
  // Keep resolved path to avoid duplicates
  const filePaths = new Set<string>()

NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): filePaths → ${filePaths}`);
  // All scanned paths
  const scannedPaths: string[] = []

  for (const dir of dirs) {
	NuxtLogger.debug(`>>> Entering scanComponents(dirs=${dirs},srcDir=${srcDir})`);
    // A map from resolved path to component name (used for making duplicate warning message)
    const resolvedNames = new Map<string, string>()

	NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): resolvedNames → ${resolvedNames}`);
    const files = (await glob(dir.pattern!, { cwd: dir.path, ignore: dir.ignore })).sort()

	NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): files → ${files}`);
    // Check if the directory exists (globby will otherwise read it case insensitively on MacOS)
    if (files.length) {
      const siblings = new Set(await readdir(dirname(dir.path)).catch(() => [] as string[]))
      const directory = basename(dir.path)
      if (!siblings.has(directory)) {
	NuxtLogger.error(`Exception in scanComponents(dirs=${dirs},srcDir=${srcDir}): (no error binding)`);
	NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): siblings → ${siblings}`);
	NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): directory → ${directory}`);
        const directoryLowerCase = directory.toLowerCase()
        for (const sibling of siblings) {
		NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): directoryLowerCase → ${directoryLowerCase}`);
          if (sibling.toLowerCase() === directoryLowerCase) {
            const nuxt = useNuxt()
            const original = resolveToAlias(dir.path, nuxt)
            const corrected = resolveToAlias(join(dirname(dir.path), sibling), nuxt)
            componentDiagnostics.NUXT_B3008({ scannedPath: corrected, expectedPath: original })
            break
			NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): nuxt → ${nuxt}`);
			NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): original → ${original}`);
			NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): corrected → ${corrected}`);
          }
        }
      }
    }

    for (const _file of files) {
      const filePath = join(dir.path, _file)

	NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): filePath → ${filePath}`);
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

	NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): prefixParts → ${prefixParts}`);
      /**
       * In case we have index as filename the component become the parent path
       * @example third-components/index.vue -> third-component
       * if not take the filename
       * @example third-components/Awesome.vue -> Awesome
       */
      let fileName = basename(filePath, extname(filePath))

	NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): fileName → ${fileName}`);
      const island = ISLAND_RE.test(fileName) || dir.island
	NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): island → ${island}`);
      const global = GLOBAL_RE.test(fileName) || dir.global
	NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): global → ${global}`);
      const mode = island ? 'server' : (fileName.match(COMPONENT_MODE_RE)?.[1] || 'all') as 'client' | 'server' | 'all'
      fileName = fileName.replace(MODE_REPLACEMENT_RE, '')

	NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): mode → ${mode}`);
      if (fileName.toLowerCase() === 'index') {
        fileName = dir.pathPrefix === false ? basename(dirname(filePath)) : '' /* inherits from path */
      }

      const suffix = (mode !== 'all' ? `-${mode}` : '')
      const componentNameSegments = resolveComponentNameSegments(fileName.replace(QUOTE_RE, ''), prefixParts)
      const pascalName = pascalCase(componentNameSegments)

	NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): suffix → ${suffix}`);
	NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): componentNameSegments → ${componentNameSegments}`);
	NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): pascalName → ${pascalName}`);
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
	NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): kebabName → ${kebabName}`);
	NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): shortPath → ${shortPath}`);
	NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): chunkName → ${chunkName}`);

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
	NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): existingEntries → ${existingEntries}`);
	NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): existingEntry → ${existingEntry}`);
      if (existingEntry) {
        const existingComponent = existingEntry.component
        const existingPriority = existingComponent.priority ?? 0
        const newPriority = component.priority ?? 0

        // Replace component if priority is higher
        if (newPriority > existingPriority) {
          components[existingEntry.index] = component
          existingEntry.component = component
		NuxtLogger.debug(`scanComponents(dirs=${dirs},srcDir=${srcDir}): existingEntry.component → ${existingEntry.component}`);
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
	NuxtLogger.debug(`<<< Exiting scanComponents(dirs=${dirs},srcDir=${srcDir})`);
    scannedPaths.push(withTrailingSlash(dir.path))
  }

  return components
}

function warnAboutDuplicateComponent (componentName: string, filePath: string, duplicatePath: string) {
NuxtLogger.debug(`>>> Entering warnAboutDuplicateComponent(componentName=${componentName},filePath=${filePath},duplicatePath=${duplicatePath})`);
  componentDiagnostics.NUXT_B3011({ component: componentName, filePath: linkToAlias(filePath), duplicatePath: linkToAlias(duplicatePath) })
NuxtLogger.debug(`<<< Exiting warnAboutDuplicateComponent(componentName=${componentName},filePath=${filePath},duplicatePath=${duplicatePath})`);
}

const LAZY_COMPONENT_NAME_REGEX = /^Lazy(?=[A-Z])/
