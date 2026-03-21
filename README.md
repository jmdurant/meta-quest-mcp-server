# Meta Quest MCP Server

An MCP (Model Context Protocol) server that provides Claude Code with direct access to the Meta Quest Store. Wraps the `ovr-platform-util` CLI for build uploads, downloads, and release channel management, and uses the `graph.oculus.com` REST API for entitlement checks, leaderboards, and IAP queries.

Supports multiple apps via a single config file.

## Setup

### 1. Get Your App Credentials

For each app you want to manage:

1. Go to the [Oculus Developer Dashboard](https://developer.oculus.com/manage/)
2. Select your app
3. Navigate to **Development → API**
4. Copy the **App ID** and **App Secret** (requires admin access)

### 2. Create a Config File

Create `~/meta-quest-config.json` (or wherever you prefer):

```json
{
  "apps": {
    "my-vr-game": {
      "appId": "123456789",
      "appSecret": "abc123..."
    },
    "my-other-app": {
      "appId": "987654321",
      "appSecret": "def456..."
    }
  }
}
```

The keys (`my-vr-game`, `my-other-app`) are friendly names you'll use in tool calls.

### 3. Install ovr-platform-util

Download the Oculus Platform Utility for your OS from the [Meta developer downloads](https://developer.oculus.com/downloads/) page. This is required for build upload/download and release channel operations.

### 4. Install

```bash
cd meta-quest-mcp-server
npm install
npm run build
```

### 5. Configure Claude Code

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "meta-quest": {
      "command": "node",
      "args": ["/path/to/meta-quest-mcp-server/dist/index.js"],
      "env": {
        "META_QUEST_CONFIG": "/path/to/meta-quest-config.json",
        "OVR_PLATFORM_UTIL_PATH": "/path/to/ovr-platform-util"
      }
    }
  }
}
```

`OVR_PLATFORM_UTIL_PATH` is optional if `ovr-platform-util` is already on your system PATH.

Restart Claude Code to pick up the new MCP server.

## Available Tools

### App Management
| Tool | Description |
|---|---|
| `list_apps` | List all configured apps from your config file |

### Builds
| Tool | Description |
|---|---|
| `upload_build` | Upload an APK to a release channel (default: ALPHA) |
| `download_build` | Download a build by ID to a local directory |
| `upload_debug_symbols` | Attach debug symbols to a previously uploaded build |

### Release Channels
| Tool | Description |
|---|---|
| `set_release_channel` | Promote a build between channels (e.g. ALPHA → BETA → RC → Production) |

### Add-ons
| Tool | Description |
|---|---|
| `upload_addon` | Upload DLC or add-on assets to a release channel |

### Graph API
| Tool | Description |
|---|---|
| `verify_entitlement` | Check if a user owns the app |
| `get_leaderboards` | List leaderboards for the app |
| `get_iap_items` | List in-app purchase items |

All tools (except `list_apps`) take an `appName` parameter — the friendly name from your config file.

## Release Channel Workflow

Meta Quest uses release channels for beta testing. Every app gets four default channels:

| Channel | Visibility |
|---|---|
| **ALPHA** | Invite-only |
| **BETA** | Invite-only |
| **RC** | Invite-only |
| **Store** | Public |

Typical flow:

1. `upload_build` — push APK to ALPHA
2. Add testers via the [Developer Dashboard](https://developer.oculus.com/manage/) (up to 200 per channel)
3. `set_release_channel` — promote ALPHA → BETA → RC → Store

Tester management is currently dashboard-only (no API available).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `META_QUEST_CONFIG` | Yes | Path to JSON config file with app credentials |
| `OVR_PLATFORM_UTIL_PATH` | No | Path to `ovr-platform-util` binary (if not on PATH) |
