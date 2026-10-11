import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/accueil.tsx'),
  route('partie/:id', 'routes/partie.tsx'),
] satisfies RouteConfig;
