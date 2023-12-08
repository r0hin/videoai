import { defineConfig } from 'vite';
import mkcert from'vite-plugin-mkcert'

export default defineConfig({
  root: './src',
  build: {
    outDir: '../dist',
    minify: false,
    emptyOutDir: true,
  },
  server: {
    https: true,
  },
  plugins: [mkcert()]
});
