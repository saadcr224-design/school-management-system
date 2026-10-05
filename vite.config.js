import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), {
    name: 'complete-offline-shell',
    closeBundle() {
      const files = [];
      const walk = (dir, prefix = '') => {
        for (const item of readdirSync(dir, { withFileTypes: true })) {
          const name = prefix + item.name;
          if (item.isDirectory()) walk(`${dir}/${item.name}`, `${name}/`);
          else if (!['sw.js', '_redirects', '_headers'].includes(name)) files.push(name);
        }
      };
      walk('dist');
      files.sort();
      const hash = createHash('sha256');
      for (const file of files) hash.update(readFileSync(`dist/${file}`));
      const template = readFileSync('public/sw.js', 'utf8');
      writeFileSync('dist/sw.js', template.replace('__BUILD_ID__', hash.digest('hex').slice(0, 16))
        .replace('__PRECACHE_ASSETS__', JSON.stringify(files.map(file => '/' + file))));
    }
  }],
  server: {
    host: '0.0.0.0',
    port: 5173,
    cors: true,
    watch: {
      ignored: ['**/*.zip', '**/mingit/**', '**/.git/**']
    }
  }
})


