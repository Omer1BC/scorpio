# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome extension built with React, TypeScript, and Vite using the CRXJS plugin. The extension provides a popup interface, side panel, content scripts, and a background service worker.

## Development Commands

- **Install dependencies**: `npm install`
- **Start dev server**: `npm run dev` - Runs Vite with HMR for development
- **Build for production**: `npm run build` - Compiles TypeScript and bundles with Vite
- **Preview production build**: `npm run preview` - Serves the production build locally

## Architecture Overview

### Extension Structure

The extension has multiple UI surfaces:

1. **Popup** (`src/popup/`): The interface shown when clicking the extension icon
   - `main.tsx`: React entry point
   - `App.tsx`: Main popup component
   - Configured via `action` in manifest

2. **Side Panel** (`src/sidepanel/`): A persistent sidebar opened from the background script
   - `main.tsx`: React entry point
   - `App.tsx`: Main side panel component
   - Configured via `side_panel` in manifest

3. **Content Script** (`src/content/`): Injected into web pages
   - `main.tsx`: React entry point that creates a container and mounts the app
   - `views/App.tsx`: Content script UI component
   - Matches all HTTPS sites (`https://*/*`)
   - Creates a DOM container with id `crxjs-app` and renders React into it

4. **Background Service Worker** (`src/background.ts`): Persistent background script
   - Handles extension events (e.g., `chrome.action.onClicked`)
   - Opens the side panel when extension icon is clicked
   - No React - plain TypeScript

### Build & Plugin Setup

- **CRXJS Vite Plugin**: Handles manifest generation and extension bundling automatically
- **Manifest Config** (`manifest.config.ts`): Declarative manifest configuration
- **Vite Alias**: `@` resolves to `src/` directory
- **Output**: Builds to `dist/` directory; also creates a zip file in `release/` with CRXJS plugin

### TypeScript Configuration

- Target: ES2020 for source code, ES2022 for build tools
- Strict mode enabled with `noUnusedLocals` and `noUnusedParameters`
- Path alias `@/*` points to `src/*`
- Chrome types available via `@types/chrome`
- Separate configs: `tsconfig.app.json` (source) and `tsconfig.node.json` (build files)

### Chrome APIs Used

Based on manifest permissions:
- `sidePanel`: Opens side panel UI
- `contentSettings`: Content script configuration
- `tabs`: Tab management
- `userScripts`: User script execution

Message passing between popup and content script uses `chrome.runtime.onMessage` listener pattern (see `src/content/views/App.tsx:20-34`).

## Key Implementation Details

- **Hot Module Replacement (HMR)**: Vite's dev server with CORS configured for `chrome-extension://` scheme
- **Vite Plugin Chain**: React plugin for JSX, CRXJS for extension bundling, zip plugin for release packaging
- **Extension Loading**: After building, load unpacked extension from `dist/` directory at `chrome://extensions/`

## Development Workflow

1. Run `npm run dev` to start the Vite dev server
2. Load the extension from `dist/` at `chrome://extensions/` (enable "Developer mode")
3. Changes to `src/` files auto-update in the extension
4. Check Chrome DevTools for content script and background service worker console logs
5. Verify message passing between popup/sidepanel and content script during testing

## Manifest & Extension Configuration

- Manifest version 3 (Chrome's current standard)
- Extension icon: `public/logo.png` (48x48)
- Content scripts run on all HTTPS pages
- Background service worker runs continuously
- Side panel provides persistent UI alongside web pages
