import * as crypto from '@shardus/crypto-utils'
import { AxiosRequestConfig } from 'axios'
import { readConfigFromFile, removeDuplicateArchiversByPubKey, sanitizeArchiverList } from './helpers'
import {
  fetchArchiverListFromConfig,
  fetchArchiverListFromEnv,
  fetchArchiverListFromRemoteOrCache,
} from './sources'
import { Archiver, ArchiverListResponse } from './types'
import { axiosGet, shuffleList } from './utils'

let finalArchiverList: Archiver[] = []

export const getArchiverList = async (opts?: {
  customConfigPath?: string
  customArchiverListEnv?: string
  archiverTimeoutInMilliSeconds?: number
}) => {
  const config = await readConfigFromFile({ customConfigPath: opts?.customConfigPath })

  const archiverListFromEnv = fetchArchiverListFromEnv({ customEnvName: opts?.customArchiverListEnv })
  const archiverListFromConfig = fetchArchiverListFromConfig(config)
  const archiverListFromRemote = await fetchArchiverListFromRemoteOrCache(config)

  shuffleList(archiverListFromEnv)
  shuffleList(archiverListFromConfig)
  shuffleList(archiverListFromRemote)

  let combinedArchiverList = [...archiverListFromEnv, ...archiverListFromConfig, ...archiverListFromRemote]
  combinedArchiverList = sanitizeArchiverList(combinedArchiverList)

  if (combinedArchiverList.length === 0) {
    console.log("Couldn't find any archiver")
    throw new Error("Couldn't find any archiver")
  }

  const finalArchiverList = removeDuplicateArchiversByPubKey(combinedArchiverList)

  const currentArchiverList = await getFromArchiver<ArchiverListResponse>('archivers', {
    timeout: opts?.archiverTimeoutInMilliSeconds,
  })
  if (!currentArchiverList) {
    console.log('No archivers responded when fetching current active archivers')
    throw new Error('No archivers responded')
  }

  finalArchiverList.push(...currentArchiverList.activeArchivers)
  return removeDuplicateArchiversByPubKey(finalArchiverList)
}

/**
 * Sets up the Archiver Discovery component.
 * This function throws an exception if it could not find any archiver across different config sources (or)
 * if no archivers responded when fetching the active archiver list.
 * @async
 * @param {object} opts - The options for setting up Archiver Discovery.
 * @param {string} opts.hashKey - The hash key for crypto utils initialisation.
 * @param {boolean} [opts.disableGlobalArchiverList] - Whether to disable setting the global archiver list (use it with caution).
 */
export const setupArchiverDiscovery = async (opts: {
  hashKey: string
  disableGlobalArchiverList?: boolean
}) => {
  // init crypto utils
  crypto.init(opts.hashKey)
  if (opts.disableGlobalArchiverList === false) {
    console.log('Fetching active archiver list from global archiver list')
    // init active archiver list
    finalArchiverList = await getArchiverList()
  }
}

/**
 * Sends a GET request to an Archiver endpoint and returns the response as a verified SignedObject.
 * @async
 * @template ResponseType - The type of the response data, which should extend crypto.SignedObject.
 * @param {string} endpoint - The Archiver endpoint to query. This should not include a preceding '/'.
 * @param {AxiosRequestConfig} [config] - Optional Axios request configuration.
 * @returns {Promise<ResponseType | null>} A promise that resolves with the response data as a SignedObject, or null if an error occurred.
 */
export const getFromArchiver = async <ResponseType extends crypto.SignedObject>(
  endpoint: string,
  config?: AxiosRequestConfig
): Promise<ResponseType | null> => {
  for (const archiver of finalArchiverList) {
    try {
      const url = `http://${archiver.ip}:${archiver.port}/${endpoint}`
      const response = await axiosGet<ResponseType>(url, config)
      if (response.status < 200 || response.status >= 500 || !response.data) {
        console.log(`Failed to fetch data from archiver ${archiver.ip}:${archiver.port}`)
        continue
      }
      if (!crypto.verifyObj(response.data)) {
        console.log(`Invalid signature when fetching from archiver ${archiver.ip}:${archiver.port}`)
        continue
      }
      finalArchiverList.unshift(archiver)
      finalArchiverList = removeDuplicateArchiversByPubKey(finalArchiverList)
      return response.data
    } catch (err) {
      console.log(`Failed to fetch data from archiver ${archiver.ip}:${archiver.port}: ${err}`)
    }
  }
  return null
}
