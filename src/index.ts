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
