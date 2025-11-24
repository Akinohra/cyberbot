# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commonly Used Commands

```bash
# Install dependencies
npm install

# Development mode with tsx
npm run dev

# Build TypeScript to JavaScript
npm run build

# Start production mode (after build)
npm run start

# Test (currently not implemented)
npm run test
```

## High-Level Architecture

CyberBot Next is a QQ bot framework built on TypeScript and NapCatQQ with a plugin-based architecture:

### Core Components

1. **App Entry**: `app.ts`
   - Initializes NapCat connection
   - Loads configuration
   - Boots the plugin manager

2. **Core Module**: `core/`
   - `index.ts`: Main exports including NapCat instance, pluginManager, and event system
   - `event.ts`: Event handling system for QQ messages, notices, and requests
   - `pluginManager.ts`: Plugin lifecycle management (load, unload, reload)
   - `logger.ts`: Pino-based logging system with rotation

3. **Plugin System**: `plugins/`
   - Each plugin is a directory under `plugins/` with an `index.ts` entry point
   - Plugins must implement the `Plugin` interface defined in `pluginManager.ts`
   - Supports event handlers, onLoad/onUnload lifecycle hooks, and cron jobs
   - Includes both system plugins (cannot be unloaded) and user plugins

4. **Configuration**: `cyberbot.json`
   - NapCat connection settings (baseUrl, accessToken)
   - Bot and master/ admin QQ numbers
   - Plugin configuration (system/user plugins)
   - Logging settings

### Plugin Development

Plugins can handle three main event types:
- `message`: QQ messages
- `notice`: Notifications (friend/ group changes, etc.)
- `request`: Requests (friend/ group invitations, etc.)

Plugins can also register cron jobs using the `crons` field.

## Key Files to Know

- `app.ts`: Entry point
- `core/pluginManager.ts`: Plugin architecture definition
- `cyberbot.json`: Configuration
- `README.md`: Complete documentation including plugin development guide

## Plugin Example

A minimal plugin:

```typescript
import { type Plugin } from "../../core/index.js";

const plugin: Plugin = {
  name: 'your-plugin-name',
  version: '1.0.0',
  description: 'Your plugin description',

  handlers: {
    message: async (context) => {
      // Handle messages
    }
  }
};

export default plugin;
```

