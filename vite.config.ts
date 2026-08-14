import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Vite não seta X-Frame-Options por padrão, então embutir via <iframe> já
// funciona em dev sem configuração extra. Em produção, garanta no host de
// deploy que NENHUM header `X-Frame-Options` restritivo ou
// `Content-Security-Policy: frame-ancestors` bloqueador seja adicionado —
// ver README > "Deploy e embed".
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
