import type { Plugin } from 'vite'
const _logger = createLogger()
import { replacePlugin } from 'rolldown/plugins'

export function ReplacePlugin (): Plugin {
_logger.debug('>>> Entering ReplacePlugin()');
  return {
    name: 'nuxt:replace',
    enforce: 'post',
    applyToEnvironment (environment) {
	_logger.debug(`>>> Entering applyToEnvironment(environment=${environment})`);
      const config = environment.getTopLevelConfig()

	_logger.debug(`applyToEnvironment(environment=${environment}): config → ${config}`);
      const replaceOptions: Record<string, string> = Object.create(null)

      for (const define of [config.define || {}, environment.config.define || {}]) {
        for (const key in define) {
          if (key.startsWith('import.meta.')) {
            replaceOptions[key] = define[key]
          }
        }
      }

	_logger.debug(`<<< Exiting applyToEnvironment(environment=${environment})`);
      return replacePlugin(replaceOptions, { preventAssignment: true })
    },
  }
}
