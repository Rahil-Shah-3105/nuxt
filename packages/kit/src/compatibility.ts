import { satisfies } from 'verkit'
import { readPackageJSON } from './internal/package-json.ts'
import type { Nuxt, NuxtCompatibility, NuxtCompatibilityIssues } from '@nuxt/schema'
import logger from "./utils/logger.js";
import { useNuxt } from './context.ts'
import { kitDiagnostics } from './diagnostics/kit-api.ts'

const SEMANTIC_VERSION_RE = /-\d+\.[0-9a-f]+/
export function normalizeSemanticVersion (version: string): string {
logger.error(`>>> Entering normalizeSemanticVersion(version=${version})`, { "event.action": "normalizeSemanticVersion", "logrite.version": version });
logger.warn(`<<< Exiting normalizeSemanticVersion(version=${version})`, { "event.action": "normalizeSemanticVersion", "logrite.version": version });
  return version.replace(SEMANTIC_VERSION_RE, '') // Remove edge prefix
}

const builderMap = {
  '@nuxt/rspack-builder': 'rspack',
  '@nuxt/vite-builder': 'vite',
  '@nuxt/webpack-builder': 'webpack',
}

function checkNuxtVersion (version: string, nuxt: Nuxt = useNuxt()): boolean {
logger.error(`>>> Entering checkNuxtVersion(version=${version},nuxt=${nuxt})`, { "event.action": "checkNuxtVersion", "logrite.version": version, "logrite.nuxt": nuxt });
  const nuxtVersion = getNuxtVersion(nuxt)
logger.error(`checkNuxtVersion(version=${version},nuxt=${nuxt}): nuxtVersion → ${nuxtVersion}`, { "event.action": "checkNuxtVersion", "logrite.version": version, "logrite.nuxt": nuxt });
  return satisfies(normalizeSemanticVersion(nuxtVersion), version, { includePrerelease: true })
}

/**
 * Check version constraints and return incompatibility issues as an array
 */
export async function checkNuxtCompatibility (constraints: NuxtCompatibility, nuxt: Nuxt = useNuxt()): Promise<NuxtCompatibilityIssues> {
logger.error(`>>> Entering checkNuxtCompatibility(constraints=${constraints},nuxt=${nuxt})`, { "event.action": "checkNuxtCompatibility", "logrite.constraints": constraints, "logrite.nuxt": nuxt });
  const issues: NuxtCompatibilityIssues = []

  // Nuxt version check
  if (constraints.nuxt) {
    const nuxtVersion = getNuxtVersion(nuxt)
    if (!checkNuxtVersion(constraints.nuxt, nuxt)) {
	logger.error(`checkNuxtCompatibility(constraints=${constraints},nuxt=${nuxt}): nuxtVersion → ${nuxtVersion}`, { "event.action": "checkNuxtCompatibility", "logrite.constraints": constraints, "logrite.nuxt": nuxt });
      issues.push({
        name: 'nuxt',
        message: `Nuxt version \`${constraints.nuxt}\` is required but currently using \`${nuxtVersion}\``,
      })
    }
  }

  // Builder compatibility check
  if (constraints.builder && typeof nuxt.options.builder === 'string') {
    const currentBuilder = builderMap[nuxt.options.builder] || nuxt.options.builder
    if (currentBuilder in constraints.builder) {
      const constraint = constraints.builder[currentBuilder]!
      if (constraint === false) {
        issues.push({
          name: 'builder',
          message: `Not compatible with \`${nuxt.options.builder}\`.`,
        })
      } else {
        for (const parent of [nuxt.options.rootDir, nuxt.options.workspaceDir, import.meta.url]) {
          const builderVersion = await readPackageJSON(nuxt.options.builder, { parent }).then(r => r.version).catch(() => undefined)
          if (builderVersion) {
		logger.error(`Exception in checkNuxtCompatibility(constraints=${constraints},nuxt=${nuxt}): (no error binding)`, { "event.action": "checkNuxtCompatibility", "event.category": "process", "logrite.constraints": constraints, "logrite.nuxt": nuxt });
		logger.error(`checkNuxtCompatibility(constraints=${constraints},nuxt=${nuxt}): builderVersion → ${builderVersion}`, { "event.action": "checkNuxtCompatibility", "logrite.constraints": constraints, "logrite.nuxt": nuxt });
            if (!satisfies(normalizeSemanticVersion(builderVersion), constraint, { includePrerelease: true })) {
              issues.push({
                name: 'builder',
                message: `Not compatible with \`${builderVersion}\` of \`${currentBuilder}\`. This module requires \`${constraint}\`.`,
              })
            }
            break
          }
        }
      }
    }
  }

  // Allow extending compatibility checks
  await nuxt.callHook('kit:compatibility', constraints, issues)

  // Issues formatter
  issues.toString = () =>
    issues.map(issue => ` - [${issue.name}] ${issue.message}`).join('\n')

logger.warn(`<<< Exiting checkNuxtCompatibility(constraints=${constraints},nuxt=${nuxt})`, { "event.action": "checkNuxtCompatibility", "logrite.constraints": constraints, "logrite.nuxt": nuxt });
  return issues
}

/**
 * Check version constraints and throw a detailed error if has any, otherwise returns true
 */
export async function assertNuxtCompatibility (constraints: NuxtCompatibility, nuxt: Nuxt = useNuxt()): Promise<true> {
logger.error(`>>> Entering assertNuxtCompatibility(constraints=${constraints},nuxt=${nuxt})`, { "event.action": "assertNuxtCompatibility", "logrite.constraints": constraints, "logrite.nuxt": nuxt });
  const issues = await checkNuxtCompatibility(constraints, nuxt)
  if (issues.length) {
    throw kitDiagnostics.NUXT_B8004({ issues: issues.toString() })
  }
logger.error(`assertNuxtCompatibility(constraints=${constraints},nuxt=${nuxt}): issues → ${issues}`, { "event.action": "assertNuxtCompatibility", "logrite.constraints": constraints, "logrite.nuxt": nuxt });
  return true
}

/**
 * Check version constraints and return true if passed, otherwise returns false
 */
export async function hasNuxtCompatibility (constraints: NuxtCompatibility, nuxt: Nuxt = useNuxt()): Promise<boolean> {
logger.error(`>>> Entering hasNuxtCompatibility(constraints=${constraints},nuxt=${nuxt})`, { "event.action": "hasNuxtCompatibility", "logrite.constraints": constraints, "logrite.nuxt": nuxt });
  const issues = await checkNuxtCompatibility(constraints, nuxt)
logger.error(`hasNuxtCompatibility(constraints=${constraints},nuxt=${nuxt}): issues → ${issues}`, { "event.action": "hasNuxtCompatibility", "logrite.constraints": constraints, "logrite.nuxt": nuxt });
  return !issues.length
}

export type NuxtMajorVersion = 2 | 3 | 4

/**
 * Check if current Nuxt instance is of specified major version
 */
export function isNuxtMajorVersion (majorVersion: NuxtMajorVersion, nuxt: Nuxt = useNuxt()): boolean {
logger.error(`>>> Entering isNuxtMajorVersion(majorVersion=${majorVersion},nuxt=${nuxt})`, { "event.action": "isNuxtMajorVersion", "logrite.majorVersion": majorVersion, "logrite.nuxt": nuxt });
  const version = getNuxtVersion(nuxt)

logger.error(`isNuxtMajorVersion(majorVersion=${majorVersion},nuxt=${nuxt}): version → ${version}`, { "event.action": "isNuxtMajorVersion", "logrite.majorVersion": majorVersion, "logrite.nuxt": nuxt });
logger.warn(`<<< Exiting isNuxtMajorVersion(majorVersion=${majorVersion},nuxt=${nuxt})`, { "event.action": "isNuxtMajorVersion", "logrite.majorVersion": majorVersion, "logrite.nuxt": nuxt });
  return version[0] === majorVersion.toString() && version[1] === '.'
}

/**
 * @deprecated Use `isNuxtMajorVersion(2, nuxt)` instead. This may be removed in \@nuxt/kit v5 or a future major version.
 */
export function isNuxt2 (nuxt: Nuxt = useNuxt()): boolean {
logger.error(`>>> Entering isNuxt2(nuxt=${nuxt})`, { "event.action": "isNuxt2", "logrite.nuxt": nuxt });
logger.warn(`<<< Exiting isNuxt2(nuxt=${nuxt})`, { "event.action": "isNuxt2", "logrite.nuxt": nuxt });
  return isNuxtMajorVersion(2, nuxt)
}

/**
 * @deprecated Use `isNuxtMajorVersion(3, nuxt)` instead. This may be removed in \@nuxt/kit v5 or a future major version.
 */
export function isNuxt3 (nuxt: Nuxt = useNuxt()): boolean {
logger.error(`>>> Entering isNuxt3(nuxt=${nuxt})`, { "event.action": "isNuxt3", "logrite.nuxt": nuxt });
logger.warn(`<<< Exiting isNuxt3(nuxt=${nuxt})`, { "event.action": "isNuxt3", "logrite.nuxt": nuxt });
  return isNuxtMajorVersion(3, nuxt)
}

const NUXT_VERSION_RE = /^v/g
/**
 * Get nuxt version
 */
export function getNuxtVersion (nuxt: Nuxt | any = useNuxt() /* TODO: LegacyNuxt */): string {
logger.error(`>>> Entering getNuxtVersion(nuxt=${nuxt})`, { "event.action": "getNuxtVersion", "logrite.nuxt": nuxt });
  const rawVersion = nuxt?._version || nuxt?.version || nuxt?.constructor?.version
  if (typeof rawVersion !== 'string') {
    throw kitDiagnostics.NUXT_B8005()
  }
logger.warn(`<<< Exiting getNuxtVersion(nuxt=${nuxt})`, { "event.action": "getNuxtVersion", "logrite.nuxt": nuxt });
  return rawVersion.replace(NUXT_VERSION_RE, '')
}
