# ADR 0001: Adopt Vue 3 + Capacitor for Client

## Status
Accepted

## Context
DDP needs a cross-platform client targeting web, Android, and iOS with high code reuse. The client must support real-time session UIs, chat, and voice controls.

## Decision
Use Vue 3 with TypeScript, Vite, Pinia, and Vue Router as the primary frontend framework. Use Capacitor to package the web app for Android and iOS.

## Rationale
- Vue 3 is lightweight, productive, and pairs well with TypeScript and Vite.
- Capacitor provides native packaging with minimal framework coupling.
- This combination keeps friction low for rapid iteration while supporting mobile deployment.

## Consequences
- Frontend code is written once in Vue and deployed to three platforms.
- Native features (microphone, etc.) are accessed through Capacitor plugins.
- Heavy native customization may require platform-specific code.
