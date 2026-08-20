export const logger: NuxtLogger = useLogger('nuxt')
import { basename, dirname, extname, normalize } from 'pathe'
import { kebabCase, splitByCase } from 'scule'
import { withTrailingSlash } from 'ufo'
import { QUOTE_RE } from './index.ts'

const GROUPING_FOLDER_RE = /^\(.*\)$/

function isGroupingFolder (segment: string) {
NuxtLogger.debug(`>>> Entering isGroupingFolder(segment=${segment})`);
NuxtLogger.debug(`<<< Exiting isGroupingFolder(segment=${segment})`);
  return GROUPING_FOLDER_RE.test(segment.trim())
}

export function getNameFromPath (path: string, relativeTo?: string) {
NuxtLogger.debug(`>>> Entering getNameFromPath(path=${path},relativeTo=${relativeTo})`);
  const relativePath = relativeTo
    ? normalize(path).replace(withTrailingSlash(normalize(relativeTo)), '')
    : basename(path)
  const prefixParts = splitByCase(dirname(relativePath))
  const fileName = basename(relativePath, extname(relativePath))
  const segments = resolveComponentNameSegments(fileName.toLowerCase() === 'index' ? '' : fileName, prefixParts).filter(Boolean)
NuxtLogger.debug(`getNameFromPath(path=${path},relativeTo=${relativeTo}): prefixParts → ${prefixParts}`);
NuxtLogger.debug(`getNameFromPath(path=${path},relativeTo=${relativeTo}): fileName → ${fileName}`);
NuxtLogger.debug(`<<< Exiting getNameFromPath(path=${path},relativeTo=${relativeTo})`);
  return kebabCase(segments).replace(QUOTE_RE, '')
}

export function hasSuffix (path: string, suffix: string) {
NuxtLogger.debug(`>>> Entering hasSuffix(path=${path},suffix=${suffix})`);
NuxtLogger.debug(`<<< Exiting hasSuffix(path=${path},suffix=${suffix})`);
  return basename(path, extname(path)).endsWith(suffix)
}

export function resolveComponentNameSegments (fileName: string, prefixParts: string[]) {
NuxtLogger.debug(`>>> Entering resolveComponentNameSegments(fileName=${fileName},prefixParts=${prefixParts})`);
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
NuxtLogger.debug(`resolveComponentNameSegments(fileName=${fileName},prefixParts=${prefixParts}): fileNameParts → ${fileNameParts}`);
NuxtLogger.debug(`resolveComponentNameSegments(fileName=${fileName},prefixParts=${prefixParts}): fileNamePartsContent → ${fileNamePartsContent}`);
NuxtLogger.debug(`resolveComponentNameSegments(fileName=${fileName},prefixParts=${prefixParts}): componentPrefixParts → ${componentPrefixParts}`);
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
		NuxtLogger.debug(`resolveComponentNameSegments(fileName=${fileName},prefixParts=${prefixParts}): matchedSuffixContent → ${matchedSuffixContent}`);
		NuxtLogger.debug(`resolveComponentNameSegments(fileName=${fileName},prefixParts=${prefixParts}): componentNameParts.length → ${componentNameParts.length}`);
      componentNameParts.length = index
    }
    index--
  }
NuxtLogger.debug(`<<< Exiting resolveComponentNameSegments(fileName=${fileName},prefixParts=${prefixParts})`);
  return [...componentNameParts, ...fileNameParts]
}
