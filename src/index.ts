import * as crypto from '@shardus/crypto-utils'
import { AxiosRequestConfig } from 'axios'
import { readConfigFromFile, removeDuplicateArchiversByPubKey, sanitizeArchiverList } from './helpers'
import {
  fetchArchiverListFromConfig,
  fetchArchiverListFromEnv,
  fetchArchiverListFromRemoteOrCache,
} from './sources'
import { Archiver } from './types'
import { axiosGet, shuffleList } from './utils'

// init crypto utils
crypto.init('64f152869ca2d473e4ba64ab53f49ccdb2edae22da192c126850970e788af347')

let finalArchiverList: Archiver[] = []

const getArchiverList = async (opts?: { customConfigPath?: string; customArchiverListEnv?: string }) => {
  const config = await readConfigFromFile({ customConfigPath: opts?.customConfigPath })

  const archiverListFromEnv = fetchArchiverListFromEnv({ customEnvName: opts?.customArchiverListEnv })
  const archiverListFromConfig = await fetchArchiverListFromConfig(config)
  const archiverListFromRemote = await fetchArchiverListFromRemoteOrCache(config)

  shuffleList(archiverListFromEnv)
  shuffleList(archiverListFromConfig)
  shuffleList(archiverListFromRemote)

  const combinedArchiverList = [...archiverListFromEnv, ...archiverListFromConfig, ...archiverListFromRemote]
  sanitizeArchiverList(combinedArchiverList)

  if (combinedArchiverList.length === 0) {
    console.log("Couldn't find any archiver")
    throw new Error("Couldn't find any archiver")
  }

  finalArchiverList = removeDuplicateArchiversByPubKey(combinedArchiverList)

  const currentArchiverList = await getFromArchiver<Archiver[]>('archivers')
  if (!currentArchiverList) {
    console.log('No archivers responded when fetching current active archivers')
    throw new Error('No archivers responded')
  }

  finalArchiverList.push(...currentArchiverList)
  finalArchiverList = removeDuplicateArchiversByPubKey(finalArchiverList)
}

// Setup archiver list
getArchiverList()

export const getFromArchiver = async <ResponseType>(
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
      finalArchiverList.unshift(archiver)
      finalArchiverList = removeDuplicateArchiversByPubKey(finalArchiverList)
      return response.data
    } catch (err) {
      console.log(`Failed to fetch data from archiver ${archiver.ip}:${archiver.port}: ${err}`)
    }
  }
  return null
}
