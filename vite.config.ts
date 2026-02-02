import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, rmSync, readFileSync, writeFileSync } from 'fs';

// Plugin to copy and prepare extension files
function extensionPlugin() {
  return {
    name: 'extension-plugin',
    closeBundle() {
      // Create icons directory if needed
      const iconsDir = resolve(__dirname, 'dist/icons');
      if (!existsSync(iconsDir)) {
        mkdirSync(iconsDir, { recursive: true });
      }
      
      // Copy manifest
      copyFileSync(
        resolve(__dirname, 'public/manifest.json'),
        resolve(__dirname, 'dist/manifest.json')
      );
      
      // Copy icons
      const iconSvg = resolve(__dirname, 'public/icons/icon.svg');
      if (existsSync(iconSvg)) {
        copyFileSync(iconSvg, resolve(__dirname, 'dist/icons/icon.svg'));
      }
      
      // Move HTML from src/popup to popup and fix paths
      const srcPopupDir = resolve(__dirname, 'dist/src/popup');
      const destPopupDir = resolve(__dirname, 'dist/popup');
      if (existsSync(srcPopupDir)) {
        const srcHtml = resolve(srcPopupDir, 'index.html');
        if (existsSync(srcHtml)) {
          let htmlContent = readFileSync(srcHtml, 'utf-8');
          // Fix paths - change relative paths to be relative to popup folder
          htmlContent = htmlContent.replace(/\.\.\/\.\.\/popup\//g, './');
          htmlContent = htmlContent.replace(/\.\/popup\//g, './');
          writeFileSync(resolve(destPopupDir, 'index.html'), htmlContent);
        }
        // Remove src folder
        rmSync(resolve(__dirname, 'dist/src'), { recursive: true, force: true });
      }
      
      console.log('Extension files copied to dist/');
    },
  };
}

export default defineConfig({
  plugins: [react(), extensionPlugin()],
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        content: resolve(__dirname, 'src/content/content.ts'),
        inject: resolve(__dirname, 'src/content/inject.ts'),
        'service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'content') {
            return 'content/content.js';
          }
          if (chunkInfo.name === 'inject') {
            return 'content/inject.js';
          }
          if (chunkInfo.name === 'service-worker') {
            return 'background/service-worker.js';
          }
          return 'popup/[name].js';
        },
        chunkFileNames: 'popup/[name]-[hash].js',
        assetFileNames: 'popup/[name]-[hash].[ext]',
      },
    },
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
