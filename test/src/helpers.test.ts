import * as fs from 'fs'
import {
  removeDuplicateArchiversByPubKey,
  validateArchiver,
  sanitizeArchiverList,
  readConfigFromFile,
} from '../../src/helpers'
import { Archiver, Config } from '../../src/types'

jest.mock('fs')

describe('helpers', () => {
  const mockFs = fs as jest.Mocked<typeof fs>

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('removeDuplicateArchiversByPubKey', () => {
    it('should remove duplicate archivers with the same public key', () => {
      const archivers: Archiver[] = [
        { ip: '192.168.1.1', port: 8080, publicKey: 'key1' },
        { ip: '192.168.1.2', port: 8081, publicKey: 'key2' },
        { ip: '192.168.1.3', port: 8082, publicKey: 'key1' },
        { ip: '192.168.1.4', port: 8083, publicKey: 'key3' },
        { ip: '192.168.1.5', port: 8084, publicKey: 'key2' },
      ]

      const result = removeDuplicateArchiversByPubKey(archivers)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({ ip: '192.168.1.1', port: 8080, publicKey: 'key1' })
      expect(result[1]).toEqual({ ip: '192.168.1.2', port: 8081, publicKey: 'key2' })
      expect(result[2]).toEqual({ ip: '192.168.1.4', port: 8083, publicKey: 'key3' })
    })

    it('should preserve order keeping first occurrence', () => {
      const archivers: Archiver[] = [
        { ip: '192.168.1.1', port: 8080, publicKey: 'A' },
        { ip: '192.168.1.2', port: 8081, publicKey: 'B' },
        { ip: '192.168.1.3', port: 8082, publicKey: 'C' },
        { ip: '192.168.1.4', port: 8083, publicKey: 'D' },
        { ip: '192.168.1.5', port: 8084, publicKey: 'B' },
        { ip: '192.168.1.6', port: 8085, publicKey: 'E' },
      ]

      const result = removeDuplicateArchiversByPubKey(archivers)

      expect(result).toHaveLength(5)
      const keys = result.map((a) => a.publicKey)
      expect(keys).toEqual(['A', 'B', 'C', 'D', 'E'])
    })

    it('should handle empty array', () => {
      const result = removeDuplicateArchiversByPubKey([])
      expect(result).toEqual([])
    })

    it('should handle single archiver', () => {
      const archiver: Archiver = { ip: '192.168.1.1', port: 8080, publicKey: 'key1' }
      const result = removeDuplicateArchiversByPubKey([archiver])
      expect(result).toEqual([archiver])
    })

    it('should handle all duplicates', () => {
      const archivers: Archiver[] = [
        { ip: '192.168.1.1', port: 8080, publicKey: 'key1' },
        { ip: '192.168.1.2', port: 8081, publicKey: 'key1' },
        { ip: '192.168.1.3', port: 8082, publicKey: 'key1' },
      ]

      const result = removeDuplicateArchiversByPubKey(archivers)
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ ip: '192.168.1.1', port: 8080, publicKey: 'key1' })
    })
  })

  describe('validateArchiver', () => {
    it('should not throw for valid archiver', () => {
      const archiver: Archiver = {
        ip: '192.168.1.1',
        port: 8080,
        publicKey: 'valid-key',
      }

      expect(() => validateArchiver(archiver)).not.toThrow()
    })

    it('should throw when ip is not defined', () => {
      const archiver = {
        port: 8080,
        publicKey: 'valid-key',
      } as any

      expect(() => validateArchiver(archiver)).toThrow('Archiver ip is not defined')
    })

    it('should throw when ip is empty string', () => {
      const archiver: Archiver = {
        ip: '',
        port: 8080,
        publicKey: 'valid-key',
      }

      expect(() => validateArchiver(archiver)).toThrow('Archiver ip is not defined')
    })

    it('should throw when ip is invalid', () => {
      const archiver: Archiver = {
        ip: '999.999.999.999',
        port: 8080,
        publicKey: 'valid-key',
      }

      expect(() => validateArchiver(archiver)).toThrow('Archiver ip is invalid')
    })

    it('should accept localhost as valid IP', () => {
      const archiver: Archiver = {
        ip: '127.0.0.1',
        port: 8080,
        publicKey: 'valid-key',
      }

      expect(() => validateArchiver(archiver)).not.toThrow()
    })

    it('should throw when port is not defined', () => {
      const archiver = {
        ip: '192.168.1.1',
        publicKey: 'valid-key',
      } as any

      expect(() => validateArchiver(archiver)).toThrow('Archiver port is not defined')
    })

    it('should throw when port is 0', () => {
      const archiver: Archiver = {
        ip: '192.168.1.1',
        port: 0,
        publicKey: 'valid-key',
      }

      expect(() => validateArchiver(archiver)).toThrow('Archiver port is not defined')
    })

    it('should throw when port is negative', () => {
      const archiver: Archiver = {
        ip: '192.168.1.1',
        port: -1,
        publicKey: 'valid-key',
      }

      expect(() => validateArchiver(archiver)).toThrow('Archiver port is invalid')
    })

    it('should throw when port exceeds 65535', () => {
      const archiver: Archiver = {
        ip: '192.168.1.1',
        port: 65536,
        publicKey: 'valid-key',
      }

      expect(() => validateArchiver(archiver)).toThrow('Archiver port is invalid')
    })

    it('should accept port 65535', () => {
      const archiver: Archiver = {
        ip: '192.168.1.1',
        port: 65535,
        publicKey: 'valid-key',
      }

      expect(() => validateArchiver(archiver)).not.toThrow()
    })

    it('should throw when publicKey is not defined', () => {
      const archiver = {
        ip: '192.168.1.1',
        port: 8080,
      } as any

      expect(() => validateArchiver(archiver)).toThrow('Archiver publicKey is not defined')
    })

    it('should throw when publicKey is empty string', () => {
      const archiver: Archiver = {
        ip: '192.168.1.1',
        port: 8080,
        publicKey: '',
      }

      expect(() => validateArchiver(archiver)).toThrow('Archiver publicKey is not defined')
    })
  })

  describe('sanitizeArchiverList', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

    it('should return only valid archivers', () => {
      const archivers: Archiver[] = [
        { ip: '192.168.1.1', port: 8080, publicKey: 'key1' },
        { ip: '', port: 8080, publicKey: 'key2' }, // invalid
        { ip: '192.168.1.3', port: 8082, publicKey: 'key3' },
      ]

      const result = sanitizeArchiverList(archivers)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ ip: '192.168.1.1', port: 8080, publicKey: 'key1' })
      expect(result[1]).toEqual({ ip: '192.168.1.3', port: 8082, publicKey: 'key3' })
    })

    it('should filter out multiple invalid archivers', () => {
      const archivers: any[] = [
        { ip: '192.168.1.1', port: 8080, publicKey: 'key1' },
        { ip: '999.999.999.999', port: 8080, publicKey: 'key2' }, // invalid IP
        { ip: '192.168.1.3', port: -1, publicKey: 'key3' }, // invalid port
        { ip: '192.168.1.4', port: 8080 }, // missing publicKey
        { ip: '192.168.1.5', port: 8085, publicKey: 'key5' },
      ]

      const result = sanitizeArchiverList(archivers)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ ip: '192.168.1.1', port: 8080, publicKey: 'key1' })
      expect(result[1]).toEqual({ ip: '192.168.1.5', port: 8085, publicKey: 'key5' })
    })

    it('should log invalid archivers', () => {
      const invalidArchiver = { ip: '', port: 8080, publicKey: 'key' }
      sanitizeArchiverList([invalidArchiver])

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid archiver:'))
    })

    it('should handle empty array', () => {
      const result = sanitizeArchiverList([])
      expect(result).toEqual([])
    })

    it('should return empty array when all archivers are invalid', () => {
      const archivers: any[] = [
        { port: 8080, publicKey: 'key1' }, // missing IP
        { ip: '192.168.1.2', publicKey: 'key2' }, // missing port
        { ip: '192.168.1.3', port: 8083 }, // missing publicKey
      ]

      const result = sanitizeArchiverList(archivers)
      expect(result).toEqual([])
    })
  })

  describe('readConfigFromFile', () => {
    it('should read config from default path', async () => {
      const mockConfig: Config = {
        archivers: [{ ip: '192.168.1.1', port: 8080, publicKey: 'key1' }],
        archiversUrl: 'http://example.com',
      }
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig))

      const result = await readConfigFromFile()

      expect(mockFs.readFileSync).toHaveBeenCalledWith('config.json', 'utf-8')
      expect(result).toEqual(mockConfig)
    })

    it('should read config from custom path', async () => {
      const mockConfig: Config = { customField: 'value' }
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig))

      const result = await readConfigFromFile({ customConfigPath: '/custom/path/config.json' })

      expect(mockFs.readFileSync).toHaveBeenCalledWith('/custom/path/config.json', 'utf-8')
      expect(result).toEqual(mockConfig)
    })

    it('should return empty object when file does not exist', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory')
      })

      const result = await readConfigFromFile()

      expect(result).toEqual({})
    })

    it('should handle invalid JSON', async () => {
      mockFs.readFileSync.mockReturnValue('{ invalid json')

      await expect(readConfigFromFile()).rejects.toThrow()
    })

    it('should return empty config object', async () => {
      mockFs.readFileSync.mockReturnValue('{}')

      const result = await readConfigFromFile()

      expect(result).toEqual({})
    })

    it('should handle config with extra fields', async () => {
      const mockConfig = {
        archivers: [{ ip: '192.168.1.1', port: 8080, publicKey: 'key1' }],
        archiversUrl: 'http://example.com',
        extraField: 'extraValue',
        anotherField: 123,
      }
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig))

      const result = await readConfigFromFile()

      expect(result).toEqual(mockConfig)
    })
  })
})
