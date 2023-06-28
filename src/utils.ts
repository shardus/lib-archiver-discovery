import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import * as fs from 'fs'

export const isValidIPv4 = (ip: string): boolean => {
  if (ip === 'localhost') {
    return true
  }
  const parts = ip.split('.')
  if (parts.length !== 4) {
    return false
  }
  return parts.every((part) => {
    const num = parseInt(part, 10)
    return num >= 0 && num <= 255
  })
}

export const downloadAndSaveJsonFile = async (url: string, filePath: string) => {
  try {
    const response = await axios.get(url)
    const jsonData = response.data
    const jsonString = JSON.stringify(jsonData, null, 2)
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.writeFileSync(filePath, jsonString, 'utf-8')
    console.log(`Downloaded JSON data from URL ${url} and saved to file ${filePath}`)
  } catch (error) {
    console.error(`Failed to download and save JSON data from URL ${url} to file ${filePath}: ${error}`)
  }
}

/* eslint-disable security/detect-object-injection */
export function shuffleList<T>(list: T[]): T[] {
  const shuffledList = [...list]
  for (let i = shuffledList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffledList[i], shuffledList[j]] = [shuffledList[j], shuffledList[i]]
  }
  return shuffledList
}
/* eslint-enable security/detect-object-injection */

export const axiosGet = async <ResponseType>(
  url: string,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<ResponseType>> => {
  const response = axios.get<ResponseType>(url, config)
  return response
}
