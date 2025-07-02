# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Archiver Discovery protocol library for the Shardus ecosystem. It helps various node types (Consensus, Explorer, Gateway, Archiver nodes) discover and connect to archiver nodes. The library aggregates archiver lists from multiple sources, provides secure communication with archivers using cryptographic verification, and maintains archiver lists for load balancing.

## Development Commands

### Building and Compilation
```bash
npm run compile        # Compile TypeScript to JavaScript (dist/)
npm run prepare        # Compile before npm operations
```

### Code Quality
```bash
npm run lint           # Run ESLint on TypeScript files
npm run format-check   # Check code formatting with Prettier
npm run format-fix     # Auto-fix code formatting
```

### Testing
```bash
npm test              # Run Jest tests once
npm run test-watch    # Run tests in watch mode
```

### Release Process
```bash
# Prerelease versions
npm run release:prerelease    # Increment prerelease version

# Production releases
npm run release:patch         # Patch release (1.0.0 -> 1.0.1)
npm run release:minor         # Minor release (1.0.0 -> 1.1.0)
npm run release:major         # Major release (1.0.0 -> 2.0.0)
```

## Architecture

### Core Components

1. **Entry Point** (`src/index.ts`):
   - `setupArchiverDiscovery()` - Initializes the discovery system with crypto utils
   - `getFromArchiver()` - Queries archiver endpoints with signature verification
   - `getArchiverList()` - Aggregates archivers from all sources
   - `getFinalArchiverList()` - Returns the discovered archiver list

2. **Archiver Sources** (`src/sources.ts`):
   - Environment variables (default: `ARCHIVER_INFO`)
   - Local config file (`config.json`)
   - Remote config URL with local caching

3. **Key Features**:
   - Automatic deduplication of archivers by public key
   - List shuffling for load balancing
   - Cryptographic verification of archiver responses
   - Fallback to cached remote config if network fails
   - Prioritized archiver selection (successful archivers moved to front)

### Data Flow

1. During `setupArchiverDiscovery()`:
   - Initialize crypto utils with provided hash key
   - Fetch archivers from env, local config, and remote sources
   - Shuffle and deduplicate the combined list
   - Query active archivers from the discovered list
   - Maintain final archiver list for subsequent queries

2. When calling `getFromArchiver()`:
   - Iterate through archiver list
   - Make HTTP request with optional timeout
   - Verify response signature using crypto utils
   - Prioritize successful archivers for future requests

### Configuration Format

Archiver format across all sources:
```typescript
{
  ip: string
  port: number
  publicKey: string
}
```

Local config.json structure:
```json
{
  "archivers": [...],
  "archiverInfoRemoteConfigUrl": "https://..."
}
```

## Testing Approach

Tests are located in `/test/src/` and use Jest with TypeScript. The test suite covers:
- Archiver list retrieval from various sources
- Configuration merging and deduplication
- Error handling scenarios
- Mock HTTP responses for archiver queries

Run a specific test file:
```bash
npx jest test/src/specific-test.test.ts
```

## Important Notes

- The library uses `@shardeum-foundation/lib-crypto-utils` for signature verification
- Default hash key is provided but should be overridden in production
- All archiver responses must be signed objects (`crypto.SignedObject`)
- The library throws errors if no archivers are found or none respond
- Successful archiver queries move that archiver to the front of the list for better performance