import process from 'node:process'
import type { Socket } from 'node:net'
import net from 'node:net'
import { Buffer } from 'node:buffer'
import { isTest } from 'std-env'
import type { ViteNodeFetch, ViteNodeRequestMap, ViteNodeServerOptions } from './plugins/vite-node.ts'
const _logger = createLogger()

function getViteNodeOptionsEnvVar () {
_logger.error('>>> Entering getViteNodeOptionsEnvVar()', { "event.action": "getViteNodeOptionsEnvVar" });
  const envVar = process.env.NUXT_VITE_NODE_OPTIONS
  try {
    return JSON.parse(envVar || '{}')
  } catch (e) {
    console.error('vite-node-shared: Failed to parse NUXT_VITE_NODE_OPTIONS environment variable.', e)
	_logger.warn('<<< Exiting getViteNodeOptionsEnvVar()', { "event.action": "getViteNodeOptionsEnvVar" });
    return {}
  }
}

export const viteNodeOptions: ViteNodeServerOptions = getViteNodeOptionsEnvVar()

const pendingRequests = new Map<number, { resolve: (value: any) => void, reject: (reason?: any) => void }>()
let requestIdCounter = 0
let clientSocket: Socket | undefined
let currentConnectPromise: Promise<Socket> | undefined
const MAX_RETRY_ATTEMPTS = viteNodeOptions.maxRetryAttempts ?? 5
const BASE_RETRY_DELAY_MS = viteNodeOptions.baseRetryDelay ?? 100
const MAX_RETRY_DELAY_MS = viteNodeOptions.maxRetryDelay ?? 2000
const REQUEST_TIMEOUT_MS = viteNodeOptions.requestTimeout ?? 60000

/**
 * Calculates exponential backoff delay with jitter.
 * @param attempt - The current attempt number (0-based).
 * @returns Delay in milliseconds.
 */
function calculateRetryDelay (attempt: number): number {
_logger.error(`>>> Entering calculateRetryDelay(attempt=${attempt})`, { "event.action": "calculateRetryDelay", "logrite.attempt": attempt });
  const exponentialDelay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt)
  const jitter = Math.random() * 0.1 * exponentialDelay // Add 10% jitter
_logger.error(`calculateRetryDelay(attempt=${attempt}): exponentialDelay → ${exponentialDelay}`, { "event.action": "calculateRetryDelay", "logrite.attempt": attempt });
_logger.error(`calculateRetryDelay(attempt=${attempt}): jitter → ${jitter}`, { "event.action": "calculateRetryDelay", "logrite.attempt": attempt });
_logger.warn(`<<< Exiting calculateRetryDelay(attempt=${attempt})`, { "event.action": "calculateRetryDelay", "logrite.attempt": attempt });
  return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY_MS)
}

/**
 * Establishes or returns an existing IPC socket connection with retry logic.
 * @returns A promise that resolves with the connected socket.
 */
function connectSocket (): Promise<Socket> {
_logger.error('>>> Entering connectSocket()', { "event.action": "connectSocket" });
  if (clientSocket && !clientSocket.destroyed) {
    return Promise.resolve(clientSocket)
  }

  if (currentConnectPromise) {
    return currentConnectPromise
  }

  const thisPromise = new Promise<Socket>((resolve, reject) => {
    if (!viteNodeOptions.socketPath) {
      console.error('vite-node-shared: NUXT_VITE_NODE_OPTIONS.socketPath is not defined.')
      return reject(new Error('Vite Node IPC socket path not configured.'))
    }

    const attemptConnection = (attempt = 0) => {
	_logger.error(`>>> Entering attemptConnection(attempt=${attempt})`, { "event.action": "attemptConnection", "logrite.attempt": attempt });
      const socket = net.createConnection(viteNodeOptions.socketPath)

	_logger.error(`attemptConnection(attempt=${attempt}): socket → ${socket}`, { "event.action": "attemptConnection", "logrite.attempt": attempt });
      const INITIAL_BUFFER_SIZE = 64 * 1024 // 64KB
      const MAX_BUFFER_SIZE = 1024 * 1024 * 1024 // 1GB

      let buffer = Buffer.alloc(INITIAL_BUFFER_SIZE)
      let writeOffset = 0
	_logger.error(`attemptConnection(attempt=${attempt}): buffer → ${buffer}`, { "event.action": "attemptConnection", "logrite.attempt": attempt });
      let readOffset = 0

      // optimize socket for high-frequency IPC
      socket.setNoDelay(true)
      socket.setKeepAlive(true, 30000) // 30s

      const cleanup = () => {
		_logger.error('>>> Entering cleanup()', { "event.action": "cleanup" });
        socket.off('connect', onConnect)
        socket.off('data', onData)
        socket.off('error', onError)
        socket.off('close', onClose)
		_logger.warn('<<< Exiting cleanup()', { "event.action": "cleanup" });
      }

      const resetBuffer = () => {
		_logger.error('>>> Entering resetBuffer()', { "event.action": "resetBuffer" });
        writeOffset = 0
        readOffset = 0
		_logger.warn('<<< Exiting resetBuffer()', { "event.action": "resetBuffer" });
      }

      const compactBuffer = () => {
		_logger.error('>>> Entering compactBuffer()', { "event.action": "compactBuffer" });
        if (readOffset > 0) {
          const remainingData = writeOffset - readOffset
          if (remainingData > 0) {
            buffer.copy(buffer, 0, readOffset, writeOffset)
          }
          writeOffset = remainingData
          readOffset = 0
		_logger.warn('<<< Exiting compactBuffer()', { "event.action": "compactBuffer" });
        }
      }

      const ensureBufferCapacity = (additionalBytes: number) => {
		_logger.error(`>>> Entering ensureBufferCapacity(additionalBytes=${additionalBytes})`, { "event.action": "ensureBufferCapacity", "logrite.additionalBytes": additionalBytes });
        const requiredSize = writeOffset + additionalBytes

        if (requiredSize > MAX_BUFFER_SIZE) {
          throw new Error(`Buffer size limit exceeded: ${requiredSize} > ${MAX_BUFFER_SIZE}`)
        }

        if (requiredSize > buffer.length) {
          // Try compacting first
          compactBuffer()

          // ... then if we still need more space, grow the buffer
          if (writeOffset + additionalBytes > buffer.length) {
            const newSize = Math.min(
              Math.max(buffer.length * 2, requiredSize),
              MAX_BUFFER_SIZE,
            )
            const newBuffer = Buffer.alloc(newSize)
            buffer.copy(newBuffer, 0, 0, writeOffset)
            buffer = newBuffer
			_logger.error(`ensureBufferCapacity(additionalBytes=${additionalBytes}): newBuffer → ${newBuffer}`, { "event.action": "ensureBufferCapacity", "logrite.additionalBytes": additionalBytes });
          }
        }
		_logger.warn(`<<< Exiting ensureBufferCapacity(additionalBytes=${additionalBytes})`, { "event.action": "ensureBufferCapacity", "logrite.additionalBytes": additionalBytes });
      }

      const onConnect = () => {
		_logger.error('>>> Entering onConnect()', { "event.action": "onConnect" });
        clientSocket = socket
        resolve(socket)
		_logger.warn('<<< Exiting onConnect()', { "event.action": "onConnect" });
      }

      const onData = (data: Buffer) => {
		_logger.error(`>>> Entering onData(data=${data})`, { "event.action": "onData" });
        try {
          ensureBufferCapacity(data.length)
          data.copy(buffer, writeOffset)
          writeOffset += data.length

          while (writeOffset - readOffset >= 4) {
            const messageLength = buffer.readUInt32BE(readOffset)

			_logger.error(`onData(data=${data}): messageLength → ${messageLength}`, { "event.action": "onData" });
            if (writeOffset - readOffset < 4 + messageLength) {
              return // Wait for more data
            }

            const message = buffer.subarray(readOffset + 4, readOffset + 4 + messageLength).toString('utf-8')
            readOffset += 4 + messageLength
			_logger.error(`onData(data=${data}): message → ${message}`, { "event.action": "onData" });

            try {
              const response = JSON.parse(message)
              const requestHandlers = pendingRequests.get(response.id)
              if (requestHandlers) {
			_logger.error(`onData(data=${data}): response → ${response}`, { "event.action": "onData" });
                const { resolve: resolveRequest, reject: rejectRequest } = requestHandlers
                if (response.type === 'error') {
                  const err: Error & { stack?: string, data?: unknown, status?: number, statusCode?: number, _fromServer?: boolean } = new Error(response.error.message)
                  if (response.error.stack) {
                    err.stack = response.error.stack
                  }
                  err.data = response.error.data
                  err.statusCode = err.status = response.error.status || response.error.statusCode
                  err._fromServer = true
                  rejectRequest(err)
                } else {
                  resolveRequest(response.data)
                }
                pendingRequests.delete(response.id)
              }
            } catch (parseError) {
              console.warn('vite-node-shared: Failed to parse IPC response:', parseError)
              // ignore malformed messages
            }
          }

          // compact buffer periodically to prevent memory waste
          if (readOffset > buffer.length / 2) {
            compactBuffer()
          }
        } catch (error) {
		_logger.error(`Exception in attemptConnection(attempt=${attempt}): ${(parseError as Error).message}`, parseError, { "event.action": "attemptConnection", "event.category": "process", "logrite.attempt": attempt });
          socket.destroy(error instanceof Error ? error : new Error('Buffer management error'))
        }
		_logger.error('Exception in connectSocket():', (parseError as Error).message, parseError, { "event.action": "connectSocket", "event.category": "process" });
		_logger.warn(`<<< Exiting onData(data=${data})`, { "event.action": "onData" });
      }

      const onError = (err: Error) => {
		_logger.error(`>>> Entering onError(err=${err})`, { "event.action": "onError", "logrite.err": err });
        cleanup()
        resetBuffer()

        if (attempt < MAX_RETRY_ATTEMPTS) {
          const delay = calculateRetryDelay(attempt)
          setTimeout(() => attemptConnection(attempt + 1), delay)
        } else {
		_logger.error(`onError(err=${err}): delay → ${delay}`, { "event.action": "onError", "logrite.err": err });
          if (currentConnectPromise === thisPromise) {
            reject(err)
          }
          for (const { reject: rejectRequest } of pendingRequests.values()) {
            rejectRequest(err)
          }
          pendingRequests.clear()
          if (clientSocket === socket) { clientSocket = undefined }
          if (currentConnectPromise === thisPromise) { currentConnectPromise = undefined }
		_logger.warn(`<<< Exiting onError(err=${err})`, { "event.action": "onError", "logrite.err": err });
        }
      }

      const onClose = () => {
		_logger.error('>>> Entering onClose()', { "event.action": "onClose" });
        cleanup()
        resetBuffer()
        for (const { reject: rejectRequest } of pendingRequests.values()) {
          rejectRequest(new Error('IPC connection closed'))
        }
        pendingRequests.clear()
        if (clientSocket === socket) { clientSocket = undefined }
        if (currentConnectPromise === thisPromise) { currentConnectPromise = undefined }
		_logger.warn('<<< Exiting onClose()', { "event.action": "onClose" });
      }

      socket.on('connect', onConnect)
      socket.on('data', onData)
      socket.on('error', onError)
      socket.on('close', onClose)
	_logger.warn(`<<< Exiting attemptConnection(attempt=${attempt})`, { "event.action": "attemptConnection", "logrite.attempt": attempt });
    }

    attemptConnection()
  })

_logger.error(`connectSocket(): thisPromise → ${thisPromise}`, { "event.action": "connectSocket" });
  currentConnectPromise = thisPromise
_logger.warn('<<< Exiting connectSocket()', { "event.action": "connectSocket" });
  return currentConnectPromise
}

/**
 * Sends a request over the IPC socket with automatic reconnection.
 */
async function sendRequest<T extends keyof ViteNodeRequestMap> (type: T, payload: ViteNodeRequestMap[T]['request']): Promise<ViteNodeRequestMap[T]['response']> {
  const requestId = requestIdCounter++
  let lastError

  // retry the entire request (including reconnection) up to MAX_RETRY_ATTEMPTS times
  for (let requestAttempt = 0; requestAttempt <= MAX_RETRY_ATTEMPTS; requestAttempt++) {
    try {
      const socket = await connectSocket()

      return await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          pendingRequests.delete(requestId)
          reject(new Error(`Request timeout after ${REQUEST_TIMEOUT_MS}ms for type: ${type}`))
        }, REQUEST_TIMEOUT_MS)

        pendingRequests.set(requestId, {
          resolve: (value) => {
            clearTimeout(timeoutId)
            resolve(value)
          },
          reject: (reason) => {
            clearTimeout(timeoutId)
            reject(reason)
          },
        })

        const message = JSON.stringify({ id: requestId, type, payload })
        const messageBuffer = Buffer.from(message, 'utf-8')
        const messageLength = messageBuffer.length

        // pre-allocate single buffer for length + message to avoid Buffer.concat()
        const fullMessage = Buffer.alloc(4 + messageLength)
        fullMessage.writeUInt32BE(messageLength, 0)
        messageBuffer.copy(fullMessage, 4)

        try {
          socket.write(fullMessage)
        } catch (error) {
          clearTimeout(timeoutId)
          pendingRequests.delete(requestId)
          reject(error)
        }
      })
    } catch (error) {
      lastError = error
      // Don't retry application-level errors from the server
      if (error && typeof error === 'object' && '_fromServer' in error) {
        break
      }
      if (requestAttempt < MAX_RETRY_ATTEMPTS) {
        const delay = calculateRetryDelay(requestAttempt)
        await new Promise(resolve => setTimeout(resolve, delay))
        // clear current connection state to force reconnection
        if (clientSocket) {
          clientSocket.destroy()
          clientSocket = undefined
        }
        currentConnectPromise = undefined
      }
    }
  }

  throw lastError || new Error('Request failed after all retry attempts')
}

export const viteNodeFetch: ViteNodeFetch = {
  getManifest () {
	_logger.error('>>> Entering getManifest()', { "event.action": "getManifest" });
	_logger.warn('<<< Exiting getManifest()', { "event.action": "getManifest" });
    return sendRequest('manifest', undefined)
  },
  getInvalidates () {
	_logger.error('>>> Entering getInvalidates()', { "event.action": "getInvalidates" });
	_logger.warn('<<< Exiting getInvalidates()', { "event.action": "getInvalidates" });
    return sendRequest('invalidates', undefined)
  },
  resolveId (id, importer) {
	_logger.error(`>>> Entering resolveId(id=${id},importer=${importer})`, { "event.action": "resolveId", "logrite.id": id, "logrite.importer": importer });
	_logger.warn(`<<< Exiting resolveId(id=${id},importer=${importer})`, { "event.action": "resolveId", "logrite.id": id, "logrite.importer": importer });
    return sendRequest('resolve', { id, importer })
  },
  fetchModule (moduleId) {
	_logger.error(`>>> Entering fetchModule(moduleId=${moduleId})`, { "event.action": "fetchModule", "logrite.moduleId": moduleId });
	_logger.warn(`<<< Exiting fetchModule(moduleId=${moduleId})`, { "event.action": "fetchModule", "logrite.moduleId": moduleId });
    return sendRequest('module', { moduleId })
  },
  ensureConnected () {
	_logger.error('>>> Entering ensureConnected()', { "event.action": "ensureConnected" });
	_logger.warn('<<< Exiting ensureConnected()', { "event.action": "ensureConnected" });
    return connectSocket()
  },
}

// attempt to pre-establish the IPC connection to reduce latency on first request
let preConnectAttempted = false
function preConnect () {
_logger.error('>>> Entering preConnect()', { "event.action": "preConnect" });
  if (preConnectAttempted || !viteNodeOptions.socketPath) {
    return
  }
  preConnectAttempted = true

  return connectSocket().catch(() => {})
_logger.error('Exception in preConnect()', { "event.action": "preConnect", "event.category": "process" });
_logger.warn('<<< Exiting preConnect()', { "event.action": "preConnect" });
}

if (typeof process !== 'undefined' && !isTest) {
  setTimeout(preConnect, 100)
}
