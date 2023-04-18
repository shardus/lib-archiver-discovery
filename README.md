# Archiver Discovery

## Spec overview

The Archiver Discovery protocol is an important component of Shardus consensus nodes, Explorer nodes, Gateway nodes, Archiver nodes, and other types of nodes that need to query archivers for information. During startup, each node maintains a list of archivers and shuffles them to query data. The node can get information about archivers from environment variables, local and remote JSON config files, or a cache copy of the remote JSON config file. The final list of archivers used by the node is created by concatenating the independent lists obtained from each source. If the final list of archivers is empty, the node logs an error and exits. The first archiver contacted must be from one of the given sources.

## Specs

[Detailed specs](https://docs.google.com/document/d/15OJ6wEmuQAIDrTr52FCiKmnNnUWZTx9xbxcz6hFX0YE/edit)

## Options and defaults

The module aggregates archiver list from three sources in following priority order:

1. Environment variable

   The default ENV variable used is `ARCHIVER_INFO` and the value expected is in the format of `ip1:port1:publicKey1,ip2:port2:publicKey2,ip3:port3:publicKey3,...`

   Optionally, the user can provide a custom ENV variable name by passing the name in the `archiverInfoEnvVar` option to the `setupArchiverDiscovery` function.

   ```ts
   setupArchiverDiscovery({
     archiverInfoEnvVar: '<custom_env_var_name>', // Optional parameter (Default: ARCHIVER_INFO)
   })
   ```

2. Local config

   Archiver list is also picked from the config.json file in the root directory of the node. The config.json file is expected to have the following format:

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

   Optionally, the user can provide a custom path to the config.json file by passing the path in the `archiverInfoLocalConfigPath` option to the `setupArchiverDiscovery` function.

   ```ts
   setupArchiverDiscovery({
     archiverInfoLocalConfigPath: '<path_to_config_json_file>', // Optional parameter (Default: config.json)
   })
   ```

3. Remote config

   Archiver list is finally also picked from a remote config file. The remote config file is expected to have the following format:

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

   The link to the remote config file is picked from the same config.json file in the root directory. The
   config.json file is expected to configure the url in the following format:

   ```json
   {
     "archiverInfoRemoteConfigUrl": ""
   }
   ```

The final list of archivers is created by shuffling and concatenating the independent lists obtained from each source. If the final list of archivers is empty, the node logs an error and exits.

Note: The `setupArchiverDiscovery` function accepts an optional `hashKey` parameter. The `hashKey` is used to initialise the `@shardus/crypto-utils` module. The crypto utils module is used to verify the response from the archiver. If the `hashKey` is not provided, the default hash key is used. (Default `hashKey`: `69fa4195670576c0160d660c3be36556ff8d504725be8a59b5a96509e0c994bc`)

## Usage

1. Install the module
   ```
   npm i @shardus/archiver-discovery
   ```
2. Initialising the module

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

1. Fork the project.
2. Post the implementation of changes, and create a merge request to `dev` branch.
3. The merge request runs to ensure the linting and tests are passing.
4. The merge request is reviewed by the team and merged to `dev` branch.
