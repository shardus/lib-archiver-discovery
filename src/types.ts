export interface Archiver {
  ip: string
  port: number
  publicKey: string
}

export interface Config {
  archivers?: Archiver[]
  archiversUrl?: string
  [key: string]: unknown
}
