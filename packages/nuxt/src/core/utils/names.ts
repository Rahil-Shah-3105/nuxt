export const logger: NuxtLogger = useLogger('nuxt')
import { basename, dirname, extname, normalize } from 'pathe'
import { kebabCase, splitByCase } from 'scule'
import { withTrailingSlash } from 'ufo'
import { QUOTE_RE } from './index.ts'

const GROUPING_FOLDER_RE = /^\(.*\)$/

function isGroupingFolder (segment: string) {
NuxtLogger.error(`>>> Entering isGroupingFolder(segment=${segment})`, { "event.action": "isGroupingFolder", "logrite.segment": segment });
NuxtLogger.warn(`<<< Exiting isGroupingFolder(segment=${segment})`, { "event.action": "isGroupingFolder", "logrite.segment": segment });
  return GROUPING_FOLDER_RE.test(segment.trim())
}

export function getNameFromPath (path: string, relativeTo?: string) {
NuxtLogger.error(`>>> Entering getNameFromPath(path=${path},relativeTo=${relativeTo})`, { "event.action": "getNameFromPath", "logrite.path": path, "logrite.relativeTo": relativeTo });
  const relativePath = relativeTo
    ? normalize(path).replace(withTrailingSlash(normalize(relativeTo)), '')
    : basename(path)
  const prefixParts = splitByCase(dirname(relativePath))
  const fileName = basename(relativePath, extname(relativePath))
  const segments = resolveComponentNameSegments(fileName.toLowerCase() === 'index' ? '' : fileName, prefixParts).filter(Boolean)
NuxtLogger.error(`getNameFromPath(path=${path},relativeTo=${relativeTo}): prefixParts → ${prefixParts}`, { "event.action": "getNameFromPath", "logrite.path": path, "logrite.relativeTo": relativeTo });
  return kebabCase(segments).replace(QUOTE_RE, '')
}

export function hasSuffix (path: string, suffix: string) {
NuxtLogger.error(`>>> Entering hasSuffix(path=${path},suffix=${suffix})`, { "event.action": "hasSuffix", "logrite.path": path, "logrite.suffix": suffix });
NuxtLogger.warn(`<<< Exiting hasSuffix(path=${path},suffix=${suffix})`, { "event.action": "hasSuffix", "logrite.path": path, "logrite.suffix": suffix });
  return basename(path, extname(path)).endsWith(suffix)
}

export function resolveComponentNameSegments (fileName: string, prefixParts: string[]) {
NuxtLogger.error(`>>> Entering resolveComponentNameSegments(fileName=${fileName},prefixParts=${prefixParts})`, { "event.action": "resolveComponentNameSegments", "logrite.fileName": fileName, "logrite.prefixParts": prefixParts });
  /**
   * Array of fileName parts split by case, / or -
   * @example third-component -> ['third', 'component']
   * @example AwesomeComponent -> ['Awesome', 'Component']
   */
  const fileNameParts = splitByCase(fileName)
  const fileNamePartsContent = fileNameParts.join('/').toLowerCase()
  const componentPrefixParts = prefixParts.filter(part => !isGroupingFolder(part))
  const componentNameParts: string[] = componentPrefixParts.flatMap(p => splitByCase(p))
  let index = componentPrefixParts.length - 1
NuxtLogger.error(`resolveComponentNameSegments(fileName=${fileName},prefixParts=${prefixParts}): fileNameParts → ${fileNameParts}`, { "event.action": "resolveComponentNameSegments", "logrite.fileName": fileName, "logrite.prefixParts": prefixParts });
  const matchedSuffix: string[] = []
  while (index >= 0) {
    const prefixPart = componentPrefixParts[index]!
    matchedSuffix.unshift(...splitByCase(prefixPart).map(p => p.toLowerCase()))
    const matchedSuffixContent = matchedSuffix.join('/')
    if ((fileNamePartsContent === matchedSuffixContent || fileNamePartsContent.startsWith(matchedSuffixContent + '/')) ||
      // e.g. Item/Item/Item.vue -> Item
      (prefixPart.toLowerCase() === fileNamePartsContent &&
        prefixParts[index + 1] &&
        prefixParts[index] === prefixParts[index + 1])) {
		NuxtLogger.error(`resolveComponentNameSegments(fileName=${fileName},prefixParts=${prefixParts}): matchedSuffixContent → ${matchedSuffixContent}`, { "event.action": "resolveComponentNameSegments", "logrite.fileName": fileName, "logrite.prefixParts": prefixParts });
      componentNameParts.length = index
    }
    index--
  }
NuxtLogger.warn(`<<< Exiting resolveComponentNameSegments(fileName=${fileName},prefixParts=${prefixParts})`, { "event.action": "resolveComponentNameSegments", "logrite.fileName": fileName, "logrite.prefixParts": prefixParts });
  return [...componentNameParts, ...fileNameParts]
}
