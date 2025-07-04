// Must mock modules before any imports
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}))

jest.mock('axios', () => ({
  get: jest.fn(),
}))

jest.mock('@shardeum-foundation/lib-crypto-utils', () => ({
  init: jest.fn(),
  verifyObj: jest.fn(),
  SignedObject: jest.fn(),
}))

// Import after mocking
import { getArchiverList, setupArchiverDiscovery, getFromArchiver, getFinalArchiverList } from '../../src/index'
import * as crypto from '@shardeum-foundation/lib-crypto-utils'
import { axiosGet, shuffleList } from '../../src/utils'
import { Archiver, ArchiverListResponse } from '../../src/types'
import * as fs from 'fs'

// Mock the utils module
jest.mock('../../src/utils', () => ({
  ...jest.requireActual('../../src/utils'),
  axiosGet: jest.fn(),
  shuffleList: jest.fn((list) => list),
}))

// Store original env
const originalEnv = process.env

describe('index tests', () => {
  const mockFs = fs as jest.Mocked<typeof fs>
  const mockCrypto = crypto as jest.Mocked<typeof crypto>
  const mockAxiosGet = axiosGet as jest.MockedFunction<typeof axiosGet>
  const mockShuffleList = shuffleList as jest.MockedFunction<typeof shuffleList>
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()
    // Reset environment
    process.env = { ...originalEnv }
    
    // Setup default mocks
    mockFs.readFileSync.mockReturnValue(JSON.stringify({}))
    mockAxiosGet.mockRejectedValue(new Error('Not mocked'))
    mockShuffleList.mockImplementation((list) => list)
    mockCrypto.init.mockImplementation(() => {})
    mockCrypto.verifyObj.mockReturnValue(false)
  })

  afterEach(() => {
    // Restore original env
    process.env = originalEnv
    delete process.env.ARCHIVER_INFO
  })

  test('test getArchiverList with a valid env, invalid config and seed list url', async () => {
    await setupArchiverDiscovery({
      disableGlobalArchiverList: true,
    })
    process.env.ARCHIVER_INFO = '10.11.12.13:8080:randomPublicKey1,10.11.12.14:8081:randomPublicKey2'
    try {
      await getArchiverList({ archiverTimeoutInMilliSeconds: 100 })
    } catch (err: any) {
      expect(err.message).toBe('No archivers responded')
    }
  })

  test('test getArchiverList with a valid env, valid config and seed list url', async () => {
    process.env.ARCHIVER_INFO = '10.11.12.13:8080:randomPublicKey1,10.11.12.14:8081:randomPublicKey2'
    try {
      await setupArchiverDiscovery({
        hashKey: '69fa4195670576c0160d660c3be36556ff8d504725be8a59b5a96509e0c994bc',
        archiverTimeoutInMilliSeconds: 100,
      })
    } catch (err: any) {
      expect(err.message).toBe('No archivers responded')
    }
  })

  describe('getFromArchiver', () => {
    beforeEach(() => {
      jest.clearAllMocks()
      mockCrypto.verifyObj.mockReturnValue(false)
    })

    it('should return data from first archiver that responds successfully', async () => {
      // Setup archivers
      const mockArchivers: Archiver[] = [
        { ip: '192.168.1.1', port: 8080, publicKey: 'key1' },
        { ip: '192.168.1.2', port: 8081, publicKey: 'key2' },
      ]
      
      const mockResponse: ArchiverListResponse = {
        activeArchivers: [],
        sign: { owner: '', sig: '' },
      }

      // Mock successful responses
      mockAxiosGet
        .mockResolvedValueOnce({
          status: 200,
          data: mockResponse,
        } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: mockResponse,
        } as any)
      
      mockCrypto.verifyObj.mockReturnValue(true)
      
      await setupArchiverDiscovery({
        disableGlobalArchiverList: false,
        customArchiverList: mockArchivers,
      })

      const result = await getFromArchiver<ArchiverListResponse>('test-endpoint')

      expect(result).toEqual(mockResponse)
      expect(mockAxiosGet).toHaveBeenCalledWith(
        'http://192.168.1.1:8080/test-endpoint',
        undefined
      )
      expect(mockCrypto.verifyObj).toHaveBeenCalledWith(mockResponse)
    })

    it('should try next archiver if first fails', async () => {
      const mockArchivers: Archiver[] = [
        { ip: '192.168.1.1', port: 8080, publicKey: 'key1' },
        { ip: '192.168.1.2', port: 8081, publicKey: 'key2' },
      ]
      
      const mockResponse: ArchiverListResponse = {
        activeArchivers: [],
        sign: { owner: '', sig: '' },
      }

      // Setup call during initialization
      mockAxiosGet.mockResolvedValueOnce({
        status: 200,
        data: mockResponse,
      } as any)
      mockCrypto.verifyObj.mockReturnValueOnce(true)

      // First archiver fails
      mockAxiosGet.mockRejectedValueOnce(new Error('Network error'))
      
      // Second archiver succeeds
      mockAxiosGet.mockResolvedValueOnce({
        status: 200,
        data: mockResponse,
      } as any)
      mockCrypto.verifyObj.mockReturnValueOnce(true)
      
      await setupArchiverDiscovery({
        disableGlobalArchiverList: false,
        customArchiverList: mockArchivers,
      })

      const result = await getFromArchiver<ArchiverListResponse>('test-endpoint')

      expect(result).toEqual(mockResponse)
      expect(mockAxiosGet).toHaveBeenCalledTimes(3) // 1 for setup + 2 for getFromArchiver
    })

    it('should return null if all archivers fail', async () => {
      const mockArchivers: Archiver[] = [
        { ip: '192.168.1.1', port: 8080, publicKey: 'key1' },
        { ip: '192.168.1.2', port: 8081, publicKey: 'key2' },
      ]
      
      // Setup call
      mockAxiosGet.mockResolvedValueOnce({
        status: 200,
        data: { activeArchivers: [], sign: { owner: '', sig: '' } },
      } as any)
      mockCrypto.verifyObj.mockReturnValueOnce(true)

      // Both archivers fail
      mockAxiosGet.mockRejectedValue(new Error('Network error'))
      
      await setupArchiverDiscovery({
        disableGlobalArchiverList: false,
        customArchiverList: mockArchivers,
      })

      const result = await getFromArchiver<ArchiverListResponse>('test-endpoint')

      expect(result).toBeNull()
    })

    it('should skip archiver with invalid signature', async () => {
      const mockArchivers: Archiver[] = [
        { ip: '192.168.1.1', port: 8080, publicKey: 'key1' },
        { ip: '192.168.1.2', port: 8081, publicKey: 'key2' },
      ]
      
      const mockResponse: ArchiverListResponse = {
        activeArchivers: [],
        sign: { owner: '', sig: '' },
      }

      // Setup call
      mockAxiosGet.mockResolvedValueOnce({
        status: 200,
        data: mockResponse,
      } as any)
      mockCrypto.verifyObj.mockReturnValueOnce(true)

      // First archiver has invalid signature
      mockAxiosGet.mockResolvedValueOnce({
        status: 200,
        data: mockResponse,
      } as any)
      mockCrypto.verifyObj.mockReturnValueOnce(false)

      // Second archiver succeeds
      mockAxiosGet.mockResolvedValueOnce({
        status: 200,
        data: mockResponse,
      } as any)
      mockCrypto.verifyObj.mockReturnValueOnce(true)
      
      await setupArchiverDiscovery({
        disableGlobalArchiverList: false,
        customArchiverList: mockArchivers,
      })

      const result = await getFromArchiver<ArchiverListResponse>('test-endpoint')

      expect(result).toEqual(mockResponse)
      expect(mockCrypto.verifyObj).toHaveBeenCalledTimes(3)
    })

    it('should skip archiver with status >= 500', async () => {
      const mockArchivers: Archiver[] = [
        { ip: '192.168.1.1', port: 8080, publicKey: 'key1' },
        { ip: '192.168.1.2', port: 8081, publicKey: 'key2' },
      ]
      
      const mockResponse: ArchiverListResponse = {
        activeArchivers: [],
        sign: { owner: '', sig: '' },
      }

      // Setup call
      mockAxiosGet.mockResolvedValueOnce({
        status: 200,
        data: mockResponse,
      } as any)
      mockCrypto.verifyObj.mockReturnValueOnce(true)

      // First archiver returns 500
      mockAxiosGet.mockResolvedValueOnce({
        status: 500,
        data: null,
      } as any)

      // Second archiver succeeds
      mockAxiosGet.mockResolvedValueOnce({
        status: 200,
        data: mockResponse,
      } as any)
      mockCrypto.verifyObj.mockReturnValueOnce(true)
      
      await setupArchiverDiscovery({
        disableGlobalArchiverList: false,
        customArchiverList: mockArchivers,
      })

      const result = await getFromArchiver<ArchiverListResponse>('test-endpoint')

      expect(result).toEqual(mockResponse)
    })

    it('should pass config to axiosGet', async () => {
      const mockArchivers: Archiver[] = [
        { ip: '192.168.1.1', port: 8080, publicKey: 'key1' },
      ]
      
      const mockResponse: ArchiverListResponse = {
        activeArchivers: [],
        sign: { owner: '', sig: '' },
      }

      // Setup call
      mockAxiosGet.mockResolvedValueOnce({
        status: 200,
        data: mockResponse,
      } as any)
      mockCrypto.verifyObj.mockReturnValueOnce(true)

      // Test call with config
      mockAxiosGet.mockResolvedValueOnce({
        status: 200,
        data: mockResponse,
      } as any)
      mockCrypto.verifyObj.mockReturnValueOnce(true)
      
      await setupArchiverDiscovery({
        disableGlobalArchiverList: false,
        customArchiverList: mockArchivers,
      })

      const config = { timeout: 5000, headers: { 'X-Custom': 'test' } }
      await getFromArchiver<ArchiverListResponse>('test-endpoint', config)

      expect(mockAxiosGet).toHaveBeenCalledWith(
        'http://192.168.1.1:8080/test-endpoint',
        config
      )
    })

    it('should reorder archivers putting successful one first', async () => {
      const mockArchivers: Archiver[] = [
        { ip: '192.168.1.1', port: 8080, publicKey: 'key1' },
        { ip: '192.168.1.2', port: 8081, publicKey: 'key2' },
        { ip: '192.168.1.3', port: 8082, publicKey: 'key3' },
      ]
      
      const mockResponse: ArchiverListResponse = {
        activeArchivers: [],
        sign: { owner: '', sig: '' },
      }

      // Setup call
      mockAxiosGet.mockResolvedValueOnce({
        status: 200,
        data: mockResponse,
      } as any)
      mockCrypto.verifyObj.mockReturnValueOnce(true)

      // First archiver fails
      mockAxiosGet.mockRejectedValueOnce(new Error('Network error'))
      
      // Second archiver succeeds
      mockAxiosGet.mockResolvedValueOnce({
        status: 200,
        data: mockResponse,
      } as any)
      mockCrypto.verifyObj.mockReturnValueOnce(true)
      
      await setupArchiverDiscovery({
        disableGlobalArchiverList: false,
        customArchiverList: mockArchivers,
      })

      await getFromArchiver<ArchiverListResponse>('test-endpoint')

      const finalList = getFinalArchiverList()
      expect(finalList[0]).toEqual({ ip: '192.168.1.2', port: 8081, publicKey: 'key2' })
    })
  })

  describe('setupArchiverDiscovery errors', () => {
    it('should throw error when no archivers are found from any source', async () => {
      // Mock all sources to return empty arrays
      mockFs.readFileSync.mockReturnValue(JSON.stringify({})) // No config
      delete process.env.ARCHIVER_INFO // No env
      mockAxiosGet.mockRejectedValue(new Error('Network error')) // No remote

      await expect(setupArchiverDiscovery({
        disableGlobalArchiverList: false, // Changed to false to trigger getArchiverList
      })).rejects.toThrow("Couldn't find any archiver")
    })
  })

  describe('getFinalArchiverList', () => {
    beforeEach(() => {
      jest.clearAllMocks()
      // Clear module cache to reset global state
      jest.isolateModules(() => {
        jest.resetModules()
      })
    })

    it('should return archiver list after initialization', async () => {
      const mockArchivers: Archiver[] = [
        { ip: '192.168.1.1', port: 8080, publicKey: 'key1' },
        { ip: '192.168.1.2', port: 8081, publicKey: 'key2' },
      ]

      mockAxiosGet.mockResolvedValueOnce({
        status: 200,
        data: {
          activeArchivers: [
            { ip: '192.168.1.3', port: 8082, publicKey: 'key3' },
          ],
          sign: { owner: '', sig: '' },
        },
      } as any)
      mockCrypto.verifyObj.mockReturnValueOnce(true)

      await setupArchiverDiscovery({
        customArchiverList: mockArchivers,
      })

      const list = getFinalArchiverList()
      expect(list.length).toBeGreaterThan(0)
      expect(list).toContainEqual({ ip: '192.168.1.1', port: 8080, publicKey: 'key1' })
      expect(list).toContainEqual({ ip: '192.168.1.2', port: 8081, publicKey: 'key2' })
      expect(list).toContainEqual({ ip: '192.168.1.3', port: 8082, publicKey: 'key3' })
    })

    it('should return empty array when disableGlobalArchiverList is true', async () => {
      // Run this test in isolation to ensure clean global state
      await jest.isolateModulesAsync(async () => {
        jest.resetModules()
        
        // Re-import the functions with fresh state
        const { setupArchiverDiscovery: setupFresh, getFinalArchiverList: getFinalFresh } = 
          require('../../src/index')
        
        // Re-setup mocks for the fresh modules
        const freshCrypto = require('@shardeum-foundation/lib-crypto-utils')
        freshCrypto.init = jest.fn()
        freshCrypto.verifyObj = jest.fn()
        
        await setupFresh({
          disableGlobalArchiverList: true,
        })

        const list = getFinalFresh()
        expect(list).toEqual([])
      })
    })
  })
})