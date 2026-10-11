import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  environments: {
    ssr: {
      build: {
        rollupOptions: {
          input: './server/app.ts',
        },
      },
      // En développement, garde une seule copie de RouterContextProvider :
      // Express et les loaders doivent partager la même instance de classe.
      resolve: {
        noExternal: ['react-router', '@react-router/express', '@react-router/node'],
      },
    },
  },
  plugins: [reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
});
