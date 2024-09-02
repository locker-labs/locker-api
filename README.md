# Locker Backend

This repository contains the Locker backend API.

## Quickstart

```sh
# Setup env vars
cp .env.example .env

# Install dependencies
yarn

# Run migrations
yarn migrate
```

### Moralis Stream ID

[Moralis Streams](https://docs.moralis.io/streams-api/evm) are used for getting realtime updates about deposits into Lockers. A single stream is used for processing updates across all chains and addresses. That stream must be created manually and added to your `.env` as `MORALIS_STREAM_ID`. To generate the stream id:

1. Set `LOCKER_BASE_URL` in `.env`.
1. Update `chains`, `description`, and `tag` in `gen-moralis-stream.ts`.
1. Run `yarn stream:create`.

## Advanced

### Migrations

```sh
yarn migration:generate
yarn migrate
```

To generate an empty migration: `yarn migration:blank`

### Adding new chains

1. Before beginning, think about if you want to do a single network or also a testnet.
1. Add to `config.ts`:

```ts
// define variables
lineaRpc: string;
lineaZerodevProjectId;

// RPC
this.lineaRpc = process.env.LINEA_RPC!;

// zerodev
this.lineaZerodevProjectId = process.env.LINEA_ZERODEV_PROJECT_ID!;
```

1. Add ZeroDev project ID to .env

```env
LINEA_RPC=
LINEA_ZERODEV_PROJECT_ID=
```

1. Create ZeroDev project through dashboard.zerodev.app
1. Add project ID to src/config.ts
1. Add to `SUPPORTED_CHAINS` in `src/dependencies/chains.ts`.

```ts
const SUPPORTED_CHAINS: IChainsType = {
	[ChainIds.LINEA]: {
		name: "LINEA",
		native: "ETH",
		blockExplorer: "https://lineascan.build/",
		rpcUrl: config.lineaRpc,
		zerodevProjectId: config.lineaZerodevProjectId,
		bundlerRpcUrl: getBundlerRpcUrl(config.lineaZerodevProjectId),
		paymasterRpcUrl: getPaymasterRpcUrl(config.lineaZerodevProjectId),
		viemChain: linea,
		features: [],
	},
};
```

1. Update Moralis stream script (`gen-moralis-stream.ts`) and Moralis through admin.moralis.io with new chain.
1. Make sure it's supported on Beam: https://docs.beam.ansiblelabs.xyz/v2.0/docs/individuals
1. Update config.ts

```ts

```

### Setting up new environment

-   Supabase: Enable webhooks [here](https://supabase.com/dashboard/project/ijuubunnkytlovenkehk/database/hooks)
-   Update webhook after_execution_update_send_emails with correct API key and host URL from the Supabase UI.

https://www.ssn-verify.com/generate
