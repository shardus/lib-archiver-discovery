import { getArchiverList, setupArchiverDiscovery } from '../../src/index'

test('test getArchiverList with a valid env, invalid config and seed list url', async () => {
  setupArchiverDiscovery({
    disableGlobalArchiverList: true,
  })
  process.env.ARCHIVER_INFO = '10.11.12.13:8080:randomPublicKey1,10.11.12.14:8081:randomPublicKey2'
  try {
    await getArchiverList({ archiverTimeoutInMilliSeconds: 100 })
  } catch (err) {
    console.log(err.message)
    expect(err.message).toBe('No archivers responded')
  }
})

// Enable it when integration testing
test.skip('test getArchiverList with a valid env, invalid config and seed list url', async () => {
  setupArchiverDiscovery({
    disableGlobalArchiverList: true,
  })
  process.env.ARCHIVER_INFO =
    '127.0.0.1:4000:758b1c119412298802cd28dbfa394cdfeecc4074492d60844cc192d632d84de3'
  await getArchiverList({ archiverTimeoutInMilliSeconds: 1000 })
})

test('test getArchiverList with a valid env, valid config and seed list url', async () => {
  setupArchiverDiscovery({
    hashKey: '69fa4195670576c0160d660c3be36556ff8d504725be8a59b5a96509e0c994bc',
  })
  process.env.ARCHIVER_INFO = '10.11.12.13:8080:randomPublicKey1,10.11.12.14:8081:randomPublicKey2'
  try {
    await getArchiverList({ archiverTimeoutInMilliSeconds: 100 })
  } catch (err) {
    console.log(err.message)
    expect(err.message).toBe('No archivers responded')
  }
})
