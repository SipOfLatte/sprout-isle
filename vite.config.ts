import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Strict Content Security Policy for production builds. Dev is skipped because
// Vite's hot reload relies on inline scripts.
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  // GitHub API for optional Gist sync; raw host serves large gist files.
  "connect-src 'self' https://api.github.com https://gist.githubusercontent.com",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`),
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Relative paths so the build also works from a GitHub Pages sub-folder.
  base: './',
  plugins: [react(), contentSecurityPolicy()],
  // Keep fonts and images as files: inlined data: URIs would be blocked by font-src 'self'.
  build: { assetsInlineLimit: 0 },
})
