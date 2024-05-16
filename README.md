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

## Regenerate migrations

```sh
yarn migration:generate
yarn migrate
```

### Moralis Stream ID

[Moralis Streams](https://docs.moralis.io/streams-api/evm) are used for getting realtime updates about deposits into Lockers. A single stream is used for processing updates across all chains and addresses. That stream must be created manually and added to your `.env` as `MORALIS_STREAM_ID`. To generate the stream id:

1. Set `LOCKER_BASE_URL` in `.env`.
1. Update `chains`, `description`, and `tag` in `gen-moralis-stream.ts`.
1. Run `yarn stream:create`.
