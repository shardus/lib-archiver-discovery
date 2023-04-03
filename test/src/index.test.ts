import {
  fetchArchiverListFromRemoteOrCache,
  fetchArchiverListFromConfig,
  fetchArchiverListFromEnv,
} from '../../src/sources'

test('test fetchArchiverListFromEnv with a valid env set', () => {
  process.env.ARCHIVER_INFO = '10.11.12.13:8080:randomPublicKey1,10.11.12.14:8081:randomPublicKey2'
  const archiverList = fetchArchiverListFromEnv()

  // validations
  expect(archiverList).toHaveLength(2)
  expect(archiverList[0].ip).toBe('10.11.12.13')
  expect(archiverList[0].port).toBe(8080)
  expect(archiverList[0].publicKey).toBe('randomPublicKey1')
  expect(archiverList[1].ip).toBe('10.11.12.14')
  expect(archiverList[1].port).toBe(8081)
  expect(archiverList[1].publicKey).toBe('randomPublicKey2')
})

test('test fetchArchiverListFromEnv with env empty', () => {
  process.env.ARCHIVER_INFO = ''
  const archiverList = fetchArchiverListFromEnv()

  // validations
  expect(archiverList).toHaveLength(0)
})

test('test fetchArchiverListFromConfig with valid input', () => {
  const config = {
    archivers: [
      {
        ip: '10.11.12.13',
        port: 8080,
        publicKey: 'randomPublicKey1',
      },
      {
        ip: '10.11.12.14',
        port: 8081,
        publicKey: 'randomPublicKey2',
      },
    ],
    randomConfig: 'randomConfig',
    randomConfig2: {
      test: 'test',
    },
  }
  const archiverList = fetchArchiverListFromConfig(config)

  // validations
  expect(archiverList).toHaveLength(2)
  expect(archiverList[0].ip).toBe('10.11.12.13')
  expect(archiverList[0].port).toBe(8080)
  expect(archiverList[0].publicKey).toBe('randomPublicKey1')
  expect(archiverList[1].ip).toBe('10.11.12.14')
  expect(archiverList[1].port).toBe(8081)
  expect(archiverList[1].publicKey).toBe('randomPublicKey2')
})

test('test fetchArchiverListFromConfig with config not set', () => {
  const config = {
    randomConfig: 'randomConfig',
    randomConfig2: {
      test: 'test',
    },
  }
  const archiverList = fetchArchiverListFromConfig(config)

  // validations
  expect(archiverList).toHaveLength(0)
})

test('test fetchArchiverListFromRemoteOrCache valid input', async () => {
  const config = {
    archiversUrl:
      'https://raw.githubusercontent.com/ConsenSys/web3studio-bootleg/master/test/src/testArchivers.json',
  }
  const archiverList = await fetchArchiverListFromRemoteOrCache(config)

  // validations
  expect(archiverList).toHaveLength(2)
  expect(archiverList[0].ip).toBe('10.11.12.13')
  expect(archiverList[0].port).toBe(8080)
  expect(archiverList[0].publicKey).toBe('randomPublicKey1')
  expect(archiverList[1].ip).toBe('10.11.12.14')
  expect(archiverList[1].port).toBe(8081)
  expect(archiverList[1].publicKey).toBe('randomPublicKey2')
})
