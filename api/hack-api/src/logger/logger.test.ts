import { existsSync, readFileSync, statSync } from 'fs'
import os from 'os'
import { join } from 'path'

import { BaseLogger, LoggerOptions } from 'pino'
import split from 'split2'

const pid = process.pid
const hostname = os.hostname()

import { createLogger, emitLogLevels } from '../logger'

const once = (emitter, name) => {
  return new Promise((resolve, reject) => {
    if (name !== 'error') {
      emitter.once('error', reject)
    }

    emitter.once(name, ({ ...args }) => {
      emitter.removeListener('error', reject)
      resolve({ ...args })
    })
  })
}

const sink = () => {
  const logStatement = split((data) => {
    try {
      return JSON.parse(data)
    } catch (err) {
      console.log(err)
      console.log(data)
    }
  })

  return logStatement
}

const watchFileCreated = (filename) => {
  return new Promise((resolve, reject) => {
    const TIMEOUT = 800
    const INTERVAL = 100
    const threshold = TIMEOUT / INTERVAL
    let counter = 0
    const interval = setInterval(() => {
      // On some CI runs file is created but not filled
      if (existsSync(filename) && statSync(filename).size !== 0) {
        clearInterval(interval)
        resolve(null)
      } else if (counter <= threshold) {
        counter++
      } else {
        clearInterval(interval)
        reject(new Error(`${filename} was not created.`))
      }
    }, INTERVAL)
  })
}

const setupLogger = (
  loggerOptions?: LoggerOptions,
  destination?: string,
  showConfig?: boolean
): {
  logger: BaseLogger
  logSinkData?: Promise<unknown>
} => {
  if (destination) {
    const logger = createLogger({
      options: { prettyPrint: false, ...loggerOptions },
      destination: destination,
      showConfig,
    })

    return { logger }
  } else {
    const stream = sink()
    const logSinkData = once(stream, 'data')

    const logger = createLogger({
      options: { ...loggerOptions, prettyPrint: false },
      destination: stream,
      showConfig,
    })

    return { logger, logSinkData }
  }
}

describe('logger', () => {
  describe('creates a logger without options', () => {
    test('it logs a trace message', async () => {
      const logger = createLogger({})

      expect(logger).toBeDefined()
    })
  })

  describe('supports various logging levels', () => {
    test('it logs a trace message', async () => {
      const { logger, logSinkData } = setupLogger()

      logger.trace('test of a trace level message')
      const logStatement = await logSinkData

      expect(logStatement).toHaveProperty('level')
      expect(logStatement).toHaveProperty('time')
      expect(logStatement).toHaveProperty('msg')

      expect(logStatement['level']).toEqual(10)
      expect(logStatement['msg']).toEqual('test of a trace level message')
    })

    test('it logs an info message', async () => {
      const { logger, logSinkData } = setupLogger()

      logger.info('test of an info level message')
      const logStatement = await logSinkData

      expect(logStatement).toHaveProperty('level')
      expect(logStatement).toHaveProperty('time')
      expect(logStatement).toHaveProperty('msg')

      expect(logStatement['level']).toEqual(30)
      expect(logStatement['msg']).toEqual('test of an info level message')
    })

    test('it logs a debug message', async () => {
      const { logger, logSinkData } = setupLogger()

      logger.debug('test of a debug level message')
      const logStatement = await logSinkData

      expect(logStatement).toHaveProperty('level')
      expect(logStatement).toHaveProperty('time')
      expect(logStatement).toHaveProperty('msg')

      expect(logStatement['level']).toEqual(20)
      expect(logStatement['msg']).toEqual('test of a debug level message')
    })

    test('it logs a warning message', async () => {
      const { logger, logSinkData } = setupLogger()

      logger.warn('test of a warning level message')
      const logStatement = await logSinkData

      expect(logStatement).toHaveProperty('level')
      expect(logStatement).toHaveProperty('time')
      expect(logStatement).toHaveProperty('msg')

      expect(logStatement['level']).toEqual(40)
      expect(logStatement['msg']).toEqual('test of a warning level message')
    })

    test('it logs an error message', async () => {
      const { logger, logSinkData } = setupLogger()

      const error = Object.assign(new Error('TestError'), {
        message: 'something unexpected happened',
      })
      logger.error({ message: error.message }, 'test of an error level message')
      const logStatement = await logSinkData

      expect(logStatement).toHaveProperty('level')
      expect(logStatement).toHaveProperty('time')
      expect(logStatement).toHaveProperty('msg')
      expect(logStatement).toHaveProperty('message')

      expect(logStatement['level']).toEqual(50)
      expect(logStatement['msg']).toEqual('test of an error level message')
      expect(logStatement['message']).toEqual('something unexpected happened')
    })
  })

  describe('supports key redaction', () => {
    test('it redacts defaults header authorization', async () => {
      const { logger, logSinkData } = setupLogger({
        redact: ['event.headers.authorization'],
      })
      const event = {
        event: { headers: { authorization: 'Bearer access_token' } },
      }

      logger.info(event, 'test of an access token')
      const logStatement = await logSinkData
      expect(logStatement['msg']).toEqual('test of an access token')

      expect(logStatement).toHaveProperty('event')
      expect(logStatement['event']['headers']['authorization']).toEqual(
        '[Redacted]'
      )
    })

    test('it redacts the value of a given key', async () => {
      const { logger, logSinkData } = setupLogger({
        redact: ['redactedKey'],
      })

      logger.info({ redactedKey: 'you cannot see me' }, 'test of a redaction')
      const logStatement = await logSinkData
      expect(logStatement['msg']).toEqual('test of a redaction')

      expect(logStatement).toHaveProperty('redactedKey')
      expect(logStatement['redactedKey']).toEqual('[Redacted]')
    })

    test('it redacts a JWT token key by default', async () => {
      const { logger, logSinkData } = setupLogger()

      logger.info(
        {
          jwt:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        },
        'test of a redacted JWT'
      )
      const logStatement = await logSinkData
      expect(logStatement['msg']).toEqual('test of a redacted JWT')

      expect(logStatement).toHaveProperty('jwt')
      expect(logStatement['jwt']).toEqual('[Redacted]')
    })

    test('it redacts a password key by default', async () => {
      const { logger, logSinkData } = setupLogger()

      logger.info(
        {
          password: '123456',
        },
        'test of a redacted password'
      )
      const logStatement = await logSinkData
      expect(logStatement['msg']).toEqual('test of a redacted password')

      expect(logStatement).toHaveProperty('password')
      expect(logStatement['password']).toEqual('[Redacted]')
    })

    test('it redacts the email key by default', async () => {
      const { logger, logSinkData } = setupLogger()

      logger.info(
        {
          email: 'alice@example.com',
        },
        'test of a redacted email'
      )
      const logStatement = await logSinkData
      expect(logStatement['msg']).toEqual('test of a redacted email')

      expect(logStatement).toHaveProperty('email')
      expect(logStatement['email']).toEqual('[Redacted]')
    })
  })

  describe('when configuring pretty printing', () => {
    test('it pretty prints', async () => {
      const tmp = join(
        os.tmpdir(),
        '_' + Math.random().toString(36).substr(2, 9)
      )

      const { logger } = setupLogger({ prettyPrint: true }, tmp)

      const message = 'logged with pretty printing on'

      logger.info(message)

      await watchFileCreated(tmp)

      const logStatement = readFileSync(tmp).toString().trim()

      expect(logStatement).toMatch(/INFO/)
      expect(logStatement).toContain(message)
    })

    test('it allows setting translateTime ', async () => {
      const tmp = join(
        os.tmpdir(),
        '_' + Math.random().toString(36).substr(2, 9)
      )

      const { logger } = setupLogger(
        { prettyPrint: { translateTime: 'dddd, mmmm dS, yyyy, h:MM:ss TT' } },
        tmp
      )

      const message = 'logged with pretty printing on'

      logger.info(message)

      await watchFileCreated(tmp)

      const logStatement = readFileSync(tmp).toString().trim()
      console.log(logStatement)
      expect(logStatement).toMatch(/INFO/)
      expect(logStatement).toContain(message)
    })
  })

  describe('file logging', () => {
    test('it creates a log file with a statement', async () => {
      const tmp = join(
        os.tmpdir(),
        '_' + Math.random().toString(36).substr(2, 9)
      )

      const { logger } = setupLogger({}, tmp)

      logger.warn('logged a warning to a temp file')

      await watchFileCreated(tmp)

      const logStatement = JSON.parse(readFileSync(tmp).toString())

      delete logStatement.time

      expect(logStatement).toEqual({
        pid,
        hostname,
        level: 40,
        msg: 'logged a warning to a temp file',
      })
    })
  })

  describe('handles Prisma Logging', () => {
    test('it defines log levels to emit', () => {
      const log = emitLogLevels(['info', 'warn', 'error'])

      expect(log).toEqual([
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ])
    })

    test('it defines log levels with query events to emit', () => {
      const log = emitLogLevels(['info', 'warn', 'error', 'query'])

      expect(log).toEqual([
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'query' },
      ])
    })
  })
})
