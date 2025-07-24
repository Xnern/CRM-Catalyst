import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.tsx',
            refresh: true,
        }),
        react(),
    ],
    server: {
        // Ajoute cette ligne pour forcer l'utilisation de l'IPv4 localhost
        host: '127.0.0.1',
    },
});
