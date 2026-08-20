import process from 'node:process'
import type { Socket } from 'node:net'
import net from 'node:net'
import { Buffer } from 'node:buffer'
import { isTest } from 'std-env'
import type { ViteNodeFetch, ViteNodeRequestMap, ViteNodeServerOptions } from './plugins/vite-node.ts'
const _logger = createLogger()

function getViteNodeOptionsEnvVar () {
_logger.debug('>>> Entering getViteNodeOptionsEnvVar()');
  const envVar = process.env.NUXT_VITE_NODE_OPTIONS
  try {
    return JSON.parse(envVar || '{}')
  } catch (e) {
    console.error('vite-node-shared: Failed to parse NUXT_VITE_NODE_OPTIONS environment variable.', e)
	_logger.debug('<<< Exiting getViteNodeOptionsEnvVar()');
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
_logger.debug(`>>> Entering calculateRetryDelay(attempt=${attempt})`);
  const exponentialDelay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt)
  const jitter = Math.random() * 0.1 * exponentialDelay // Add 10% jitter
_logger.debug(`calculateRetryDelay(attempt=${attempt}): exponentialDelay → ${exponentialDelay}`);
_logger.debug(`calculateRetryDelay(attempt=${attempt}): jitter → ${jitter}`);
_logger.debug(`<<< Exiting calculateRetryDelay(attempt=${attempt})`);
  return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY_MS)
}

/**
 * Establishes or returns an existing IPC socket connection with retry logic.
 * @returns A promise that resolves with the connected socket.
 */
function connectSocket (): Promise<Socket> {
  if (clientSocket && !clientSocket.destroyed) {
	_logger.debug('>>> Entering connectSocket()');
	_logger.error('Exception in connectSocket():', (parseError as Error).message, parseError);
	_logger.debug('<<< Exiting connectSocket()');
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
	_logger.debug(`>>> Entering attemptConnection(attempt=${attempt})`);
      const socket = net.createConnection(viteNodeOptions.socketPath)

	_logger.debug(`attemptConnection(attempt=${attempt}): socket → ${socket}`);
      const INITIAL_BUFFER_SIZE = 64 * 1024 // 64KB
      const MAX_BUFFER_SIZE = 1024 * 1024 * 1024 // 1GB

      let buffer = Buffer.alloc(INITIAL_BUFFER_SIZE)
      let writeOffset = 0
	_logger.debug(`attemptConnection(attempt=${attempt}): buffer → ${buffer}`);
      let readOffset = 0

      // optimize socket for high-frequency IPC
      socket.setNoDelay(true)
      socket.setKeepAlive(true, 30000) // 30s

      const cleanup = () => {
		_logger.debug('>>> Entering cleanup()');
        socket.off('connect', onConnect)
        socket.off('data', onData)
        socket.off('error', onError)
        socket.off('close', onClose)
		_logger.debug('<<< Exiting cleanup()');
      }

      const resetBuffer = () => {
		_logger.debug('>>> Entering resetBuffer()');
        writeOffset = 0
        readOffset = 0
		_logger.debug('<<< Exiting resetBuffer()');
      }

      const compactBuffer = () => {
		_logger.debug('>>> Entering compactBuffer()');
        if (readOffset > 0) {
          const remainingData = writeOffset - readOffset
          if (remainingData > 0) {
            buffer.copy(buffer, 0, readOffset, writeOffset)
          }
          writeOffset = remainingData
          readOffset = 0
		_logger.debug('<<< Exiting compactBuffer()');
        }
      }

      const ensureBufferCapacity = (additionalBytes: number) => {
		_logger.debug(`>>> Entering ensureBufferCapacity(additionalBytes=${additionalBytes})`);
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
			_logger.debug(`ensureBufferCapacity(additionalBytes=${additionalBytes}): newBuffer → ${newBuffer}`);
          }
        }
		_logger.debug(`<<< Exiting ensureBufferCapacity(additionalBytes=${additionalBytes})`);
      }

      const onConnect = () => {
		_logger.debug('>>> Entering onConnect()');
        clientSocket = socket
        resolve(socket)
		_logger.debug('<<< Exiting onConnect()');
      }

      const onData = (data: Buffer) => {
		_logger.debug(`>>> Entering onData(data=${data})`);
        try {
          ensureBufferCapacity(data.length)
          data.copy(buffer, writeOffset)
          writeOffset += data.length

          while (writeOffset - readOffset >= 4) {
            const messageLength = buffer.readUInt32BE(readOffset)

			_logger.debug(`onData(data=${data}): messageLength → ${messageLength}`);
            if (writeOffset - readOffset < 4 + messageLength) {
              return // Wait for more data
            }

            const message = buffer.subarray(readOffset + 4, readOffset + 4 + messageLength).toString('utf-8')
            readOffset += 4 + messageLength
			_logger.debug(`onData(data=${data}): message → ${message}`);

            try {
              const response = JSON.parse(message)
              const requestHandlers = pendingRequests.get(response.id)
              if (requestHandlers) {
			_logger.debug(`onData(data=${data}): response → ${response}`);
			_logger.debug(`onData(data=${data}): requestHandlers → ${requestHandlers}`);
                const { resolve: resolveRequest, reject: rejectRequest } = requestHandlers
                if (response.type === 'error') {
                  const err: Error & { stack?: string, data?: unknown, status?: number, statusCode?: number, _fromServer?: boolean } = new Error(response.error.message)
                  if (response.error.stack) {
                    err.stack = response.error.stack
					_logger.debug(`connectSocket(): err.stack → ${err.stack}`);
                  }
                  err.data = response.error.data
				_logger.debug(`attemptConnection(attempt=${attempt}): err.stack → ${err.stack}`);
                  err.statusCode = err.status = response.error.status || response.error.statusCode
				_logger.debug(`connectSocket(): err.data → ${err.data}`);
				_logger.debug(`connectSocket(): err.statusCode → ${err.statusCode}`);
				_logger.debug(`connectSocket(): err._fromServer → ${err._fromServer}`);
                  err._fromServer = true
                  rejectRequest(err)
                } else {
				_logger.debug(`onData(data=${data}): err.stack → ${err.stack}`);
                  resolveRequest(response.data)
                }
				_logger.debug(`attemptConnection(attempt=${attempt}): err.data → ${err.data}`);
                pendingRequests.delete(response.id)
              }
				_logger.debug(`onData(data=${data}): err.data → ${err.data}`);
            } catch (parseError) {
			_logger.debug(`attemptConnection(attempt=${attempt}): err.statusCode → ${err.statusCode}`);
              console.warn('vite-node-shared: Failed to parse IPC response:', parseError)
              // ignore malformed messages
			_logger.debug(`onData(data=${data}): err.statusCode → ${err.statusCode}`);
            }
          }

		_logger.debug(`attemptConnection(attempt=${attempt}): err._fromServer → ${err._fromServer}`);
          // compact buffer periodically to prevent memory waste
          if (readOffset > buffer.length / 2) {
			_logger.debug(`onData(data=${data}): err._fromServer → ${err._fromServer}`);
            compactBuffer()
          }
        } catch (error) {
          socket.destroy(error instanceof Error ? error : new Error('Buffer management error'))
        }
		_logger.debug(`<<< Exiting onData(data=${data})`);
      }

	_logger.error(`Exception in attemptConnection(attempt=${attempt}): ${(parseError as Error).message}`, parseError);
      const onError = (err: Error) => {
		_logger.debug(`>>> Entering onError(err=${err})`);
        cleanup()
        resetBuffer()

        if (attempt < MAX_RETRY_ATTEMPTS) {
          const delay = calculateRetryDelay(attempt)
          setTimeout(() => attemptConnection(attempt + 1), delay)
        } else {
		_logger.debug(`onError(err=${err}): delay → ${delay}`);
          if (currentConnectPromise === thisPromise) {
            reject(err)
          }
          for (const { reject: rejectRequest } of pendingRequests.values()) {
            rejectRequest(err)
          }
          pendingRequests.clear()
          if (clientSocket === socket) { clientSocket = undefined }
          if (currentConnectPromise === thisPromise) { currentConnectPromise = undefined }
		_logger.debug(`<<< Exiting onError(err=${err})`);
        }
      }

      const onClose = () => {
		_logger.debug('>>> Entering onClose()');
        cleanup()
        resetBuffer()
        for (const { reject: rejectRequest } of pendingRequests.values()) {
          rejectRequest(new Error('IPC connection closed'))
        }
        pendingRequests.clear()
        if (clientSocket === socket) { clientSocket = undefined }
        if (currentConnectPromise === thisPromise) { currentConnectPromise = undefined }
		_logger.debug('<<< Exiting onClose()');
      }

      socket.on('connect', onConnect)
      socket.on('data', onData)
      socket.on('error', onError)
      socket.on('close', onClose)
	_logger.debug(`<<< Exiting attemptConnection(attempt=${attempt})`);
    }

    attemptConnection()
  })

  currentConnectPromise = thisPromise
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
	_logger.debug('>>> Entering getManifest()');
	_logger.debug('<<< Exiting getManifest()');
    return sendRequest('manifest', undefined)
  },
  getInvalidates () {
	_logger.debug('>>> Entering getInvalidates()');
	_logger.debug('<<< Exiting getInvalidates()');
    return sendRequest('invalidates', undefined)
  },
  resolveId (id, importer) {
	_logger.debug(`>>> Entering resolveId(id=${id},importer=${importer})`);
	_logger.debug(`<<< Exiting resolveId(id=${id},importer=${importer})`);
    return sendRequest('resolve', { id, importer })
  },
  fetchModule (moduleId) {
	_logger.debug(`>>> Entering fetchModule(moduleId=${moduleId})`);
	_logger.debug(`<<< Exiting fetchModule(moduleId=${moduleId})`);
    return sendRequest('module', { moduleId })
  },
  ensureConnected () {
	_logger.debug('>>> Entering ensureConnected()');
	_logger.debug('<<< Exiting ensureConnected()');
    return connectSocket()
  },
}

// attempt to pre-establish the IPC connection to reduce latency on first request
let preConnectAttempted = false
function preConnect () {
_logger.debug('>>> Entering preConnect()');
  if (preConnectAttempted || !viteNodeOptions.socketPath) {
    return
  }
  preConnectAttempted = true

  return connectSocket().catch(() => {})
_logger.error('Exception in preConnect()');
_logger.debug('<<< Exiting preConnect()');
}

if (typeof process !== 'undefined' && !isTest) {
  setTimeout(preConnect, 100)
}
