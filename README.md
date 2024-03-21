# Archiver Discovery

The Archiver Discovery protocol is an important component for various node types within the Shardus ecosystem, including Consensus nodes, Explorer nodes, Gateway nodes, Archiver nodes, and others that need to query archivers for information. During startup, each node maintains a list of archivers and shuffles them for querying data. Developers have multiple options for configuring how nodes find archivers, including through environment variables, local or remote JSON config files, or a cached copy of the remote JSON config file. The final list of archivers used by the node is created by concatenating the independent lists obtained from each source. If the final list of archivers is empty, the node logs an error and exits. It's crucial that the first archiver contacted comes from one of the given sources to ensure a reliable network connection.

## Configuration Options

The module aggregates archiver list from three sources in following priority order:

1. **Environment Variable:** The default environment variable used is `ARCHIVER_INFO` and the value expected is in the format of `ip1:port1:publicKey1,ip2:port2:publicKey2,ip3:port3:publicKey3,...` (one or more archivers separated by commas). Optionally, the user can provide a custom environment variable name by passing the name in the `archiverInfoEnvVar` option to the `setupArchiverDiscovery` function.

```ts
setupArchiverDiscovery({
  archiverInfoEnvVar: '<custom_env_var_name>', // Optional parameter (Default: ARCHIVER_INFO)
})
```

2. **Local config:** The archiver list can also be specified in the `config.json` file located the root directory of the node. The `config.json` file is expected to have the following format:

```json
{
  "archivers": [
    {
      "ip": "",
      "port": "",
      "publicKey": ""
    },
    ...
  ]
}
```

Optionally, the user can provide a custom path to the `config.json` file by passing the path as a parameter in the `archiverInfoLocalConfigPath` option within the `setupArchiverDiscovery` function.

```ts
setupArchiverDiscovery({
  archiverInfoLocalConfigPath: '<path_to_config_json_file>', // Optional parameter (Default: config.json)
})
```

3. **Remote config:** The archiver list can also be specified in the remote config file. A local JSON config file will specify the URL of the remote file. The remote config file is expected to have the following format:

```json
[
  {
    "ip": "",
    "port": "",
    "publicKey": ""
  },
  ...
]
```

As mentioned above, the link to the remote config file is picked from the same `config.json` file in the root directory. The `config.json` file is expected to configure the url in the following format:

```json
{
  "archiverInfoRemoteConfigUrl": ""
}
```

The final list of archivers is created by shuffling and concatenating the independent lists obtained from each source. If the final list of archivers is empty, the node logs an error and exits.

> Note: The `setupArchiverDiscovery` function accepts an optional `hashKey` parameter. The `hashKey` paramter is used to initialise the `@shardus/crypto-utils` module. The crypto utils module is used to verify the response from the archiver. If the `hashKey` is not provided, the default hash key is used. (Default `hashKey`: `69fa4195670576c0160d660c3be36556ff8d504725be8a59b5a96509e0c994bc`)

## Usage

### Install the module

```bash
npm i @shardus/archiver-discovery
```

### Initialising the module

```ts
import { setupArchiverDiscovery, getFromArchiver } from '@shardus/archiver-discovery'

// This function throws an exception if it could not find any archiver across different config
// sources (or) if no archivers responded when fetching the active archiver list.
setupArchiverDiscovery({
  hashKey: '<hashKey>', // Optional parameter (Default: '69fa4195670576c0160d660c3be36556ff8d504725be8a59b5a96509e0c994bc')
})

// Sample usage of getFromArchiver to fetch the active archiver list.
// The method returns null if no archivers responded.
const currentArchiverList = await getFromArchiver<ArchiverListResponse>('archivers', {
  timeout: opts?.archiverTimeoutInMilliSeconds,
})
if (!currentArchiverList) {
  console.log('No archivers responded when fetching current active archivers')
  throw new Error('No archivers responded')
}
```

## Contributing

Contributions are very welcome! Everyone interacting in our codebases, issue trackers, and any other form of communication, including chat rooms and mailing lists, is expected to follow our code of conduct so we can all enjoy the effort we put into this project.
