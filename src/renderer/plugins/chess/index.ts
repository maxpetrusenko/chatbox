/// <reference types="vite/client" />
/**
 * Chess plugin registration.
 *
 * Imports the chess UI HTML as a raw string and registers it
 * with the plugin resolver so PluginFrame can load it via blob URL.
 */

import { registerBuiltinManifest } from '@/plugins'
import { registerPluginHtml } from '@/plugins/resolve'
import { chessManifest } from './manifest'
import chessUiHtml from './ui.html?raw'

export function registerChessPlugin(): void {
  registerBuiltinManifest(chessManifest)
  registerPluginHtml('chess', chessUiHtml)
}
