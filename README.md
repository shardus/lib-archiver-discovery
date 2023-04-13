# Archiver Discovery

## Spec overview

The Archiver Discovery protocol is an important component of Shardus consensus nodes, Explorer nodes, Gateway nodes, Archiver nodes, and other types of nodes that need to query archivers for information. During startup, each node maintains a list of archivers and shuffles them to query data. The node can get information about archivers from environment variables, local and remote JSON config files, or a cache copy of the remote JSON config file. The final list of archivers used by the node is created by concatenating the independent lists obtained from each source. If the final list of archivers is empty, the node logs an error and exits. The first archiver contacted must be from one of the given sources.

[Detailed specs](https://docs.google.com/document/d/15OJ6wEmuQAIDrTr52FCiKmnNnUWZTx9xbxcz6hFX0YE/edit)

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
     hashKey: '<hash_key>',
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
