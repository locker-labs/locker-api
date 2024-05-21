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

To generate an empty migration: `npx drizzle-kit generate:pg --custom`

### Adding new chains

1. Make sure it's supported on Beam: https://docs.beam.ansiblelabs.xyz/v2.0/docs/individuals
1. Create ZeroDev project through dashboard.zerodev.app
1. Add ZeroDev project ID to .env
1. Add project ID to src/config.ts
1. Add to SUPPORTED_CHAINS src/dependencies/chains.ts

### Setting up new environment

-   Supabase: Enable webhooks [here](https://supabase.com/dashboard/project/ijuubunnkytlovenkehk/database/hooks)
-   Update webhook after_execution_update_send_emails with correct API key and host URL from the Supabase UI.
