import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { config } from '../shared/config/index.js';
import { layoutPlugin } from './build/layout.js';

const root = dirname(fileURLToPath(import.meta.url));

/** 빌드 대상 = 최종 설정(shared/config)의 pages. 페이지 키 ↔ HTML 파일이 1:1 이다. */
function pageInputs(): Record<string, string> {
  const inputs: Record<string, string> = {};
  for (const p of config.pages) {
    const file = resolve(root, p.path.replace(/^\//, ''), 'index.html');
    if (!existsSync(file)) throw new Error(`[vite] 페이지 파일 없음: ${file} (npm run new-page -- ${p.key})`);
    inputs[p.key] = file;
  }
  return inputs;
}

export default defineConfig({
  root,
  publicDir: resolve(root, 'public'),
  plugins: [layoutPlugin()],
  server: {
    port: Number(process.env.WEB_PORT) || 5190,
    strictPort: true,
    proxy: { '/api': `http://localhost:${process.env.API_PORT || 8797}` },
  },
  preview: {
    proxy: { '/api': `http://localhost:${process.env.API_PORT || 8797}` },
  },
  build: {
    outDir: resolve(root, 'dist'),
    emptyOutDir: true,
    rollupOptions: { input: pageInputs() },
  },
});
