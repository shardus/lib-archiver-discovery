import * as fs from 'fs'
import { Archiver, Config } from './types'
import { isValidIPv4 } from './utils'

// remove duplicates based on public key
// remove later duplicates
// Example: [A, B, C, D, B, E] becomes [A, B, C, D, E] and not [A, C, D, B, E]
export const removeDuplicateArchiversByPubKey = (archiverList: Archiver[]): Archiver[] => {
  const uniqueArchiverPubKeyList = new Set<string>()
  return archiverList.filter((archiver) => {
    const isUnique = !uniqueArchiverPubKeyList.has(archiver.publicKey)
    if (isUnique) {
      uniqueArchiverPubKeyList.add(archiver.publicKey)
    }
    return isUnique
  })
}

export const validateArchiver = (archiver: Archiver) => {
  if (!archiver.ip) {
    throw new Error('Archiver ip is not defined')
  }
  if (!isValidIPv4(archiver.ip)) {
    throw new Error('Archiver ip is invalid')
  }
  if (!archiver.port) {
    throw new Error('Archiver port is not defined')
  }
  if (archiver.port < 0 || archiver.port > 65535) {
    throw new Error('Archiver port is invalid')
  }
  if (!archiver.publicKey) {
    throw new Error('Archiver publicKey is not defined')
  }
}

export const sanitizeArchiverList = (archivers: Archiver[]): Archiver[] => {
  const result: Archiver[] = []
  for (const archiver of archivers) {
    try {
      validateArchiver(archiver)
      result.push(archiver)
    } catch (err) {
      console.log(`Invalid archiver: ${archiver}`)
    }
  }
  return result
}

export const readConfigFromFile = async (opts?: { customConfigPath?: string }): Promise<Config> => {
  const path = opts?.customConfigPath || 'config.json'
  let jsonData = ''
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    jsonData = fs.readFileSync(path, 'utf-8')
  } catch (err) {
    console.log(`Unable to read from local config file: ${path} err: ${err}}`)
    return {}
  }
  return JSON.parse(jsonData) as Config
}
