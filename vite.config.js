import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [
    preact(),
    {
      // `npm run dev` serves the Vercel function too, with an in-memory store
      name: 'local-api',
      configureServer(server) {
        server.middlewares.use('/api/ratings', async (req, res) => {
          const mod = await server.ssrLoadModule('/api/ratings.js');
          mod.default(req, res);
        });
      },
    },
  ],
});
