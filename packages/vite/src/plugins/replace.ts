import type { Plugin } from 'vite'
const _logger = createLogger()
import { replacePlugin } from 'rolldown/plugins'

export function ReplacePlugin (): Plugin {
_logger.error('>>> Entering ReplacePlugin()', { "event.action": "ReplacePlugin" });
  return {
    name: 'nuxt:replace',
    enforce: 'post',
    applyToEnvironment (environment) {
	_logger.error(`>>> Entering applyToEnvironment(environment=${environment})`, { "event.action": "applyToEnvironment", "logrite.environment": environment });
      const config = environment.getTopLevelConfig()

	_logger.error(`applyToEnvironment(environment=${environment}): config → ${config}`, { "event.action": "applyToEnvironment", "logrite.environment": environment });
      const replaceOptions: Record<string, string> = Object.create(null)

      for (const define of [config.define || {}, environment.config.define || {}]) {
        for (const key in define) {
          if (key.startsWith('import.meta.')) {
            replaceOptions[key] = define[key]
          }
        }
      }

	_logger.warn(`<<< Exiting applyToEnvironment(environment=${environment})`, { "event.action": "applyToEnvironment", "logrite.environment": environment });
      return replacePlugin(replaceOptions, { preventAssignment: true })
    },
  }
}
