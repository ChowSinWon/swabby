# Swabby

Swabby is a Discord bot built with Discordeno in Deno that scrubs your channels
clean.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Features](#features)
- [Usage](#usage)
- [License](#license)

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Docker and Docker Compose
- or Deno (version 1.45.5)

## Getting Started

To get started with Swabby, you'll need to:

1. Set up your Discord application to

- Public Bot: `off`
- Requires OAuth2 Code Grant: `off`
- Presence Intent: `on`
- Server Members Intent: `on`
- Message Content Intent: `on`

2. Use the OAuth2-Invite link with at least following settings:

- Scope: `bot`
- Bot Permissions:
  - Send Messages
  - Manage Messages
  - Read Message History

3. Set up your Discord bot token: `cp .env.example .env` and edit the
   `DISCORD_TOKEN` variable
4. Define your Discord servers in `.env` file `SERVER_IDS`

## Features

- `/clean` deletes the last messages in the current channel (default: 10,
  maximum: 50)
- `/set-timezone` set the timezone you are operating in, default: UTC
- `/status` print cronjob channels and set timezone
- Admin Commands:
  - `/register` add channel to daily cronjob
  - `/unregister` remove channel from cronjob
  - `/set-cleanup-time` set the desired cleanup time of day

## Usage

Here's an example of how to use Swabby:

- recommended way:
  ```sh
  docker-compose up --build
  ```
- alternative way:
  ```
  deno task swabby
  ```
