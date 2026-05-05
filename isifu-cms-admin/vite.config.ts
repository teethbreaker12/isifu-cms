import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const slug = env.VITE_ADMIN_SLUG || 'admin-xyz';

  return {
    base: `/${slug}/`,
    plugins: [
      {
        name: 'admin-slug-trailing-slash',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === `/${slug}`) {
              res.statusCode = 301;
              res.setHeader('Location', `/${slug}/`);
              res.end();
              return;
            }
            next();
          });
        },
      },
      react(),
      tailwindcss(),
    ],
  };
});
