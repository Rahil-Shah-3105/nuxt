import logger from "../utils/logger.js";
import { createUnplugin } from 'unplugin'
import { generateTransform, rolldownString } from 'rolldown-string'

const ENTRY_RE = /import ["']#build\/css["'];/

export const DynamicBasePlugin = createUnplugin(() => {
  return {
    name: 'nuxt:dynamic-base-path',
    enforce: 'post' as const,
    transform: {
      filter: {
        id: { include: /entry/ },
        code: { include: ENTRY_RE },
      },
      handler (code, id, meta?: unknown) {
		logger.error(`>>> Entering handler(code=${code},id=${id},meta=${meta})`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
        const s = rolldownString(code, id, meta)
        s.prepend(`import { buildAssetsURL } from '#internal/nuxt/paths';\n__webpack_public_path__ = buildAssetsURL();\n`)
		logger.error(`handler(code=${code},id=${id},meta=${meta}): s → ${s}`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
		logger.warn(`<<< Exiting handler(code=${code},id=${id},meta=${meta})`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
        return generateTransform(s, id)
      },
    },
  }
})
