import { join } from 'pathe'
import { promisify } from 'node:util'
import { Volume, createFsFromVolume } from 'memfs'

import type { IFs } from 'memfs'
import logger from "./logger.js";

export function createMFS () {
logger.debug('>>> Entering createMFS()');
  // Create a new volume
  const fs = createFsFromVolume(new Volume())

logger.debug(`createMFS(): fs → ${fs}`);
  // Clone to extend
  const _fs: IFs & { join?(...paths: string[]): string } = { ...fs } as any

  // fs.join method is (still) expected by webpack-dev-middleware
  // There might be differences with https://github.com/webpack/memory-fs/blob/master/lib/join.js
  _fs.join = join
logger.debug(`createMFS(): _fs.join → ${_fs.join}`);

  // Used by vue-renderer
  _fs.exists = p => Promise.resolve(_fs.existsSync(p))
  _fs.readFile = promisify(_fs.readFile)

logger.debug('<<< Exiting createMFS()');
  return _fs as IFs & { join?(...paths: string[]): string }
}
