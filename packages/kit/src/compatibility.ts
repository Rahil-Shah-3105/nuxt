import { satisfies } from 'verkit'
import { readPackageJSON } from './internal/package-json.ts'
import type { Nuxt, NuxtCompatibility, NuxtCompatibilityIssues } from '@nuxt/schema'
import logger from "./utils/logger.js";
import { useNuxt } from './context.ts'
import { kitDiagnostics } from './diagnostics/kit-api.ts'

const SEMANTIC_VERSION_RE = /-\d+\.[0-9a-f]+/
export function normalizeSemanticVersion (version: string): string {
logger.debug(`>>> Entering normalizeSemanticVersion(version=${version})`);
logger.debug(`<<< Exiting normalizeSemanticVersion(version=${version})`);
  return version.replace(SEMANTIC_VERSION_RE, '') // Remove edge prefix
}

const builderMap = {
  '@nuxt/rspack-builder': 'rspack',
  '@nuxt/vite-builder': 'vite',
  '@nuxt/webpack-builder': 'webpack',
}

function checkNuxtVersion (version: string, nuxt: Nuxt = useNuxt()): boolean {
logger.debug(`>>> Entering checkNuxtVersion(version=${version},nuxt=${nuxt})`);
  const nuxtVersion = getNuxtVersion(nuxt)
logger.debug(`checkNuxtVersion(version=${version},nuxt=${nuxt}): nuxtVersion → ${nuxtVersion}`);
  return satisfies(normalizeSemanticVersion(nuxtVersion), version, { includePrerelease: true })
}

/**
 * Check version constraints and return incompatibility issues as an array
 */
export async function checkNuxtCompatibility (constraints: NuxtCompatibility, nuxt: Nuxt = useNuxt()): Promise<NuxtCompatibilityIssues> {
  const issues: NuxtCompatibilityIssues = []

  // Nuxt version check
  if (constraints.nuxt) {
	logger.debug(`>>> Entering checkNuxtCompatibility(constraints=${constraints},nuxt=${nuxt})`);
    const nuxtVersion = getNuxtVersion(nuxt)
    if (!checkNuxtVersion(constraints.nuxt, nuxt)) {
	logger.debug(`checkNuxtCompatibility(constraints=${constraints},nuxt=${nuxt}): nuxtVersion → ${nuxtVersion}`);
      issues.push({
        name: 'nuxt',
        message: `Nuxt version \`${constraints.nuxt}\` is required but currently using \`${nuxtVersion}\``,
      })
	logger.error(`Exception in checkNuxtCompatibility(constraints=${constraints},nuxt=${nuxt}): (no error binding)`);
	logger.debug(`<<< Exiting checkNuxtCompatibility(constraints=${constraints},nuxt=${nuxt})`);
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
		logger.debug(`checkNuxtCompatibility(constraints=${constraints},nuxt=${nuxt}): builderVersion → ${builderVersion}`);
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

  return issues
}

/**
 * Check version constraints and throw a detailed error if has any, otherwise returns true
 */
export async function assertNuxtCompatibility (constraints: NuxtCompatibility, nuxt: Nuxt = useNuxt()): Promise<true> {
  const issues = await checkNuxtCompatibility(constraints, nuxt)
  if (issues.length) {
	logger.debug(`>>> Entering assertNuxtCompatibility(constraints=${constraints},nuxt=${nuxt})`);
    throw kitDiagnostics.NUXT_B8004({ issues: issues.toString() })
  }
  return true
}

/**
 * Check version constraints and return true if passed, otherwise returns false
 */
export async function hasNuxtCompatibility (constraints: NuxtCompatibility, nuxt: Nuxt = useNuxt()): Promise<boolean> {
logger.debug(`>>> Entering hasNuxtCompatibility(constraints=${constraints},nuxt=${nuxt})`);
  const issues = await checkNuxtCompatibility(constraints, nuxt)
logger.debug(`hasNuxtCompatibility(constraints=${constraints},nuxt=${nuxt}): issues → ${issues}`);
  return !issues.length
}

export type NuxtMajorVersion = 2 | 3 | 4

/**
 * Check if current Nuxt instance is of specified major version
 */
export function isNuxtMajorVersion (majorVersion: NuxtMajorVersion, nuxt: Nuxt = useNuxt()): boolean {
logger.debug(`>>> Entering isNuxtMajorVersion(majorVersion=${majorVersion},nuxt=${nuxt})`);
  const version = getNuxtVersion(nuxt)

logger.debug(`isNuxtMajorVersion(majorVersion=${majorVersion},nuxt=${nuxt}): version → ${version}`);
logger.debug(`<<< Exiting isNuxtMajorVersion(majorVersion=${majorVersion},nuxt=${nuxt})`);
  return version[0] === majorVersion.toString() && version[1] === '.'
}

/**
 * @deprecated Use `isNuxtMajorVersion(2, nuxt)` instead. This may be removed in \@nuxt/kit v5 or a future major version.
 */
export function isNuxt2 (nuxt: Nuxt = useNuxt()): boolean {
logger.debug(`>>> Entering isNuxt2(nuxt=${nuxt})`);
logger.debug(`<<< Exiting isNuxt2(nuxt=${nuxt})`);
  return isNuxtMajorVersion(2, nuxt)
}

/**
 * @deprecated Use `isNuxtMajorVersion(3, nuxt)` instead. This may be removed in \@nuxt/kit v5 or a future major version.
 */
export function isNuxt3 (nuxt: Nuxt = useNuxt()): boolean {
logger.debug(`>>> Entering isNuxt3(nuxt=${nuxt})`);
logger.debug(`<<< Exiting isNuxt3(nuxt=${nuxt})`);
  return isNuxtMajorVersion(3, nuxt)
}

const NUXT_VERSION_RE = /^v/g
/**
 * Get nuxt version
 */
export function getNuxtVersion (nuxt: Nuxt | any = useNuxt() /* TODO: LegacyNuxt */): string {
  const rawVersion = nuxt?._version || nuxt?.version || nuxt?.constructor?.version
  if (typeof rawVersion !== 'string') {
	logger.debug(`>>> Entering getNuxtVersion(nuxt=${nuxt})`);
	logger.debug(`<<< Exiting getNuxtVersion(nuxt=${nuxt})`);
    throw kitDiagnostics.NUXT_B8005()
  }
  return rawVersion.replace(NUXT_VERSION_RE, '')
}
