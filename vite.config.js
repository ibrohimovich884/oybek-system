<<<<<<< HEAD
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
=======
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
>>>>>>> 27a690c7f42848b88163d7519b4fbcd3a5c95b8a

export default defineConfig({
<<<<<<< HEAD
  plugins: [react()],
  server: {
    port: 5173,
  },
});
=======
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: 'all',
  },
})

>>>>>>> 27a690c7f42848b88163d7519b4fbcd3a5c95b8a
