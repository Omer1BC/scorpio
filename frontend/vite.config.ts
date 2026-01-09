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
  ],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'
        },
      },
    },
  },
})
