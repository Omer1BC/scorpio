import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { crx } from '@crxjs/vite-plugin'
import manifest from './public/manifest.json'
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
//      babel: {
 //       plugins: [['babel-plugin-react-compiler']],
  //    },
    }),
    crx({ manifest }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
})
