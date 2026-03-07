import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/app/dashboard',
    },
    {
      path: '/auth',
      children: [
        {
          path: 'login',
          name: 'Login',
          component: () => import('../views/auth/LoginView.vue'),
        },
        {
          path: 'register',
          name: 'Register',
          component: () => import('../views/auth/RegisterView.vue'),
        },
      ],
    },
    {
      path: '/app',
      children: [
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: DashboardView,
        },
        {
          path: 'characters',
          name: 'Characters',
          component: () => import('../views/CharactersView.vue'),
        },
        {
          path: 'campaigns',
          name: 'Campaigns',
          component: () => import('../views/CampaignsView.vue'),
        },
        {
          path: 'sessions',
          name: 'Sessions',
          component: () => import('../views/SessionsView.vue'),
        },
        {
          path: 'sessions/:sessionId/lobby',
          name: 'SessionLobby',
          component: () => import('../views/SessionLobbyView.vue'),
          props: true,
        },
        {
          path: 'sessions/:sessionId/play',
          name: 'SessionPlay',
          component: () => import('../views/SessionPlayView.vue'),
          props: true,
        },
      ],
    },
  ],
});
