import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' keeps asset paths relative, so the build works on Vercel
// and on GitHub Pages (https://<user>.github.io/<repo>/) without changes.
export default defineConfig({
  plugins: [react()],
  base: './',
})
