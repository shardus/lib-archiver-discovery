import * as fs from 'fs'
import axios from 'axios'
import { isValidIPv4, downloadAndSaveJsonFile, shuffleList, axiosGet } from '../../src/utils'

jest.mock('fs')
jest.mock('axios')

describe('utils', () => {
  const mockFs = fs as jest.Mocked<typeof fs>
  const mockAxios = axios as jest.Mocked<typeof axios>

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('isValidIPv4', () => {
    it('should return true for valid IPv4 addresses', () => {
      expect(isValidIPv4('192.168.1.1')).toBe(true)
      expect(isValidIPv4('0.0.0.0')).toBe(true)
      expect(isValidIPv4('255.255.255.255')).toBe(true)
      expect(isValidIPv4('10.0.0.1')).toBe(true)
      expect(isValidIPv4('172.16.0.1')).toBe(true)
    })

    it('should return true for localhost', () => {
      expect(isValidIPv4('localhost')).toBe(true)
    })

    it('should return true for 127.0.0.1', () => {
      expect(isValidIPv4('127.0.0.1')).toBe(true)
    })

    it('should return false for invalid IPv4 addresses', () => {
      expect(isValidIPv4('256.256.256.256')).toBe(false)
      expect(isValidIPv4('192.168.1.256')).toBe(false)
      expect(isValidIPv4('192.168.1')).toBe(false)
      expect(isValidIPv4('192.168.1.1.1')).toBe(false)
      expect(isValidIPv4('192.168.-1.1')).toBe(false)
      expect(isValidIPv4('192.168.1.1a')).toBe(false)
      expect(isValidIPv4('a.b.c.d')).toBe(false)
      expect(isValidIPv4('')).toBe(false)
      expect(isValidIPv4('192.168..1')).toBe(false)
    })

    it('should return false for hostnames other than localhost', () => {
      expect(isValidIPv4('example.com')).toBe(false)
      expect(isValidIPv4('google.com')).toBe(false)
      expect(isValidIPv4('my-server')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isValidIPv4('0.0.0.0')).toBe(true)
      expect(isValidIPv4('255.255.255.255')).toBe(true)
      expect(isValidIPv4('01.01.01.01')).toBe(true) // Leading zeros
    })
  })

  describe('downloadAndSaveJsonFile', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

    it('should download and save JSON file successfully', async () => {
      const mockData = { key: 'value', nested: { data: 123 } }
      mockAxios.get.mockResolvedValueOnce({ data: mockData })

      await downloadAndSaveJsonFile('http://example.com/data.json', '/path/to/file.json')

      expect(mockAxios.get).toHaveBeenCalledWith('http://example.com/data.json')
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/path/to/file.json',
        JSON.stringify(mockData, null, 2),
        'utf-8'
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        'Downloaded JSON data from URL http://example.com/data.json and saved to file /path/to/file.json'
      )
    })

    it('should handle download errors', async () => {
      const error = new Error('Network error')
      mockAxios.get.mockRejectedValueOnce(error)

      await downloadAndSaveJsonFile('http://example.com/data.json', '/path/to/file.json')

      expect(mockAxios.get).toHaveBeenCalledWith('http://example.com/data.json')
      expect(mockFs.writeFileSync).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to download and save JSON data from URL http://example.com/data.json to file /path/to/file.json: Error: Network error'
      )
    })

    it('should handle file write errors', async () => {
      const mockData = { key: 'value' }
      mockAxios.get.mockResolvedValueOnce({ data: mockData })
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Permission denied')
      })

      await downloadAndSaveJsonFile('http://example.com/data.json', '/path/to/file.json')

      expect(mockAxios.get).toHaveBeenCalledWith('http://example.com/data.json')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to download and save JSON data')
      )
    })

    it('should handle empty response data', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: null })

      await downloadAndSaveJsonFile('http://example.com/data.json', '/path/to/file.json')

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/path/to/file.json',
        'null',
        'utf-8'
      )
    })

    it('should format JSON with proper indentation', async () => {
      const mockData = { a: 1, b: { c: 2 } }
      mockAxios.get.mockResolvedValueOnce({ data: mockData })

      await downloadAndSaveJsonFile('http://example.com/data.json', '/path/to/file.json')

      const expectedJson = JSON.stringify(mockData, null, 2)
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/path/to/file.json',
        expectedJson,
        'utf-8'
      )
    })
  })

  describe('shuffleList', () => {
    it('should return a new array with same elements', () => {
      const original = [1, 2, 3, 4, 5]
      const shuffled = shuffleList(original)

      expect(shuffled).toHaveLength(original.length)
      expect(shuffled.sort()).toEqual(original.sort())
      expect(shuffled).not.toBe(original) // Different array instance
    })

    it('should handle empty array', () => {
      const result = shuffleList([])
      expect(result).toEqual([])
    })

    it('should handle single element array', () => {
      const result = shuffleList([42])
      expect(result).toEqual([42])
    })

    it('should handle array with duplicate values', () => {
      const original = [1, 2, 2, 3, 3, 3]
      const shuffled = shuffleList(original)

      expect(shuffled).toHaveLength(6)
      expect(shuffled.filter(x => x === 1)).toHaveLength(1)
      expect(shuffled.filter(x => x === 2)).toHaveLength(2)
      expect(shuffled.filter(x => x === 3)).toHaveLength(3)
    })

    it('should work with different types', () => {
      const strings = ['a', 'b', 'c']
      const shuffledStrings = shuffleList(strings)
      expect(shuffledStrings.sort()).toEqual(strings.sort())

      const objects = [{ id: 1 }, { id: 2 }, { id: 3 }]
      const shuffledObjects = shuffleList(objects)
      expect(shuffledObjects).toHaveLength(3)
      expect(shuffledObjects).toContainEqual({ id: 1 })
      expect(shuffledObjects).toContainEqual({ id: 2 })
      expect(shuffledObjects).toContainEqual({ id: 3 })
    })

    it('should produce different arrangements (statistical test)', () => {
      // This test may rarely fail due to randomness
      const original = [1, 2, 3, 4, 5]
      const results = new Set()
      
      // Run shuffle multiple times
      for (let i = 0; i < 20; i++) {
        const shuffled = shuffleList(original)
        results.add(JSON.stringify(shuffled))
      }

      // We should get at least 2 different arrangements in 20 tries
      expect(results.size).toBeGreaterThan(1)
    })

    it('should not modify the original array', () => {
      const original = [1, 2, 3, 4, 5]
      const originalCopy = [...original]
      
      shuffleList(original)
      
      expect(original).toEqual(originalCopy)
    })
  })

  describe('axiosGet', () => {
    it('should make GET request with URL only', async () => {
      const mockResponse = { data: { result: 'success' }, status: 200 }
      mockAxios.get.mockResolvedValueOnce(mockResponse)

      const result = await axiosGet('http://example.com/api')

      expect(mockAxios.get).toHaveBeenCalledWith('http://example.com/api', undefined)
      expect(result).toEqual(mockResponse)
    })

    it('should make GET request with config', async () => {
      const mockResponse = { data: { result: 'success' }, status: 200 }
      const config = { 
        timeout: 5000, 
        headers: { 'X-Custom': 'test' } 
      }
      mockAxios.get.mockResolvedValueOnce(mockResponse)

      const result = await axiosGet('http://example.com/api', config)

      expect(mockAxios.get).toHaveBeenCalledWith('http://example.com/api', config)
      expect(result).toEqual(mockResponse)
    })

    it('should handle type safety with generics', async () => {
      interface ApiResponse {
        id: number
        name: string
      }
      
      const mockResponse = { 
        data: { id: 1, name: 'test' } as ApiResponse, 
        status: 200 
      }
      mockAxios.get.mockResolvedValueOnce(mockResponse)

      const result = await axiosGet<ApiResponse>('http://example.com/api')

      expect(result.data.id).toBe(1)
      expect(result.data.name).toBe('test')
    })

    it('should propagate axios errors', async () => {
      const error = new Error('Network error')
      mockAxios.get.mockRejectedValueOnce(error)

      await expect(axiosGet('http://example.com/api')).rejects.toThrow('Network error')
    })

    it('should handle different response types', async () => {
      // Array response
      const arrayResponse = { data: [1, 2, 3], status: 200 }
      mockAxios.get.mockResolvedValueOnce(arrayResponse)
      
      const arrayResult = await axiosGet<number[]>('http://example.com/array')
      expect(arrayResult.data).toEqual([1, 2, 3])

      // Null response
      const nullResponse = { data: null, status: 200 }
      mockAxios.get.mockResolvedValueOnce(nullResponse)
      
      const nullResult = await axiosGet('http://example.com/null')
      expect(nullResult.data).toBeNull()
    })

    it('should pass through all axios config options', async () => {
      const mockResponse = { data: 'test', status: 200 }
      const complexConfig = {
        timeout: 10000,
        headers: {
          'Authorization': 'Bearer token',
          'Content-Type': 'application/json',
        },
        params: { page: 1, limit: 10 },
        responseType: 'json' as const,
      }
      mockAxios.get.mockResolvedValueOnce(mockResponse)

      await axiosGet('http://example.com/api', complexConfig)

      expect(mockAxios.get).toHaveBeenCalledWith('http://example.com/api', complexConfig)
    })
  })
})