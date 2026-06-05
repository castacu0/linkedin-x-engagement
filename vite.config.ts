import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' keeps asset + data paths relative so the built site works from
// GitHub Pages, a sub-path, or `vite preview` without extra config.
export default defineConfig({
  plugins: [react()],
  base: './',
})
