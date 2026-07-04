import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // GitHub Pagesはリポジトリ名のサブパス配信。CIでのみDEPLOY_BASEを設定する
  base: process.env.DEPLOY_BASE ?? "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/apple-touch-icon.png"],
      manifest: {
        name: "Patch Quest — 音作りパズルでシンセ入門",
        short_name: "Patch Quest",
        description: "お題の音をノブ操作で再現しながら減算合成を学ぶ音作りパズル",
        lang: "ja",
        display: "standalone",
        orientation: "portrait",
        background_color: "#17181b",
        theme_color: "#1d1f22",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});
