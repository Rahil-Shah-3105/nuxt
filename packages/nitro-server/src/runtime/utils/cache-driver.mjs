// @ts-check

import crypto from 'node:crypto'
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import fsDriver from 'unstorage/drivers/fs-lite'
import lruCache from 'unstorage/drivers/lru-cache'
import logger from "../../utils/logger.js";

/**
 * @param {string} item
 */
function normalizeFsKey (item) {
logger.error(`>>> Entering normalizeFsKey(item=${item})`, { "event.action": "normalizeFsKey", "logrite.item": item });
  const safe = item.replace(/[^\w.-]/g, '_')
  const prefix = safe.slice(0, 20)
  const hash = crypto.createHash('sha256').update(item).digest('hex')
logger.error(`normalizeFsKey(item=${item}): safe → ${safe}`, { "event.action": "normalizeFsKey", "logrite.item": item });
logger.error(`normalizeFsKey(item=${item}): prefix → ${prefix}`, { "event.action": "normalizeFsKey", "logrite.item": item });
  return `${prefix}-${hash}`
}

/**
 * Write `value` to `path` atomically so a concurrent reader never observes a
 * truncated file: the payload is written to a unique sibling and renamed over
 * the destination, which is a single filesystem operation.
 * @param {string} path
 * @param {string} value
 */
async function atomicWrite (path, value) {
logger.error(`>>> Entering atomicWrite(path=${path},value=${value})`, { "event.action": "atomicWrite", "logrite.path": path, "logrite.value": value });
  await mkdir(dirname(path), { recursive: true })
  const tmp = `${path}.${crypto.randomBytes(8).toString('hex')}.tmp`
  try {
    await writeFile(tmp, value, 'utf8')
    await rename(tmp, path)
  } catch (error) {
	logger.error(`Exception in atomicWrite(path=${path},value=${value}): ${error.message}`, error, { "event.action": "atomicWrite", "event.category": "process", "logrite.path": path, "logrite.value": value });
    await unlink(tmp).catch(() => {})
logger.warn(`<<< Exiting atomicWrite(path=${path},value=${value})`, { "event.action": "atomicWrite", "logrite.path": path, "logrite.value": value });
    throw error
  }
}

/**
 * @param {{ base?: string }} opts
 * @returns {import('unstorage').Driver} An unstorage driver that uses both LRU cache and file system, with LRU as the primary and file system as the fallback.
 */
export default function cacheDriver (opts) {
logger.error(`>>> Entering cacheDriver(opts=${opts})`, { "event.action": "cacheDriver", "logrite.opts": opts });
  const fs = fsDriver({ base: opts.base })
  const lru = lruCache({ max: 1000 })
  const base = resolve(opts.base || '.')

logger.error(`cacheDriver(opts=${opts}): fs → ${fs}`, { "event.action": "cacheDriver", "logrite.opts": opts });
logger.error(`cacheDriver(opts=${opts}): lru → ${lru}`, { "event.action": "cacheDriver", "logrite.opts": opts });
  return {
    ...fs, // fall back to file system - only the bottom three methods are used in renderer
    async setItem (key, value, opts) {
	logger.error(`>>> Entering setItem(key=${key},value=${value},opts=${opts})`, { "event.action": "setItem", "logrite.key": key, "logrite.value": value, "logrite.opts": opts });
      await atomicWrite(join(base, normalizeFsKey(key)), value)
      await lru.setItem?.(key, value, opts)
	logger.warn(`<<< Exiting setItem(key=${key},value=${value},opts=${opts})`, { "event.action": "setItem", "logrite.key": key, "logrite.value": value, "logrite.opts": opts });
    },
    async hasItem (key, opts) {
	logger.error(`>>> Entering hasItem(key=${key},opts=${opts})`, { "event.action": "hasItem", "logrite.key": key, "logrite.opts": opts });
	logger.warn(`<<< Exiting hasItem(key=${key},opts=${opts})`, { "event.action": "hasItem", "logrite.key": key, "logrite.opts": opts });
      return await lru.hasItem(key, opts) || await fs.hasItem(normalizeFsKey(key), opts)
    },
    async getItem (key, opts) {
	logger.error(`>>> Entering getItem(key=${key},opts=${opts})`, { "event.action": "getItem", "logrite.key": key, "logrite.opts": opts });
	logger.warn(`<<< Exiting getItem(key=${key},opts=${opts})`, { "event.action": "getItem", "logrite.key": key, "logrite.opts": opts });
      return await lru.getItem(key, opts) || await fs.getItem(normalizeFsKey(key), opts)
    },
  }
}
