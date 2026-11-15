import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' keeps asset paths relative, so the build works on Vercel
// and on GitHub Pages (https://<user>.github.io/<repo>/) without changes.
export default defineConfig({
  plugins: [react()],
  base: './',
  // Allow Cloudflare quick-tunnel links (cloudflared tunnel --url http://localhost:5173)
  // so teammates can open the dev server. The leading dot matches any subdomain.
  server: { allowedHosts: ['.trycloudflare.com'] },
  preview: { allowedHosts: ['.trycloudflare.com'] },
})
