import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import { useAuthStore } from '../stores/useAuthStore.js';

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
          meta: { public: true },
        },
        {
          path: 'register',
          name: 'Register',
          component: () => import('../views/auth/RegisterView.vue'),
          meta: { public: true },
        },
        {
          path: 'forgot-password',
          name: 'ForgotPassword',
          component: () => import('../views/auth/ForgotPasswordView.vue'),
          meta: { public: true },
        },
        {
          path: 'reset-password',
          name: 'ResetPassword',
          component: () => import('../views/auth/ResetPasswordView.vue'),
          meta: { public: true },
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
          path: 'profile',
          name: 'Profile',
          component: () => import('../views/ProfileView.vue'),
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

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  // Initialize auth state on first navigation if not done yet
  if (authStore.user === null && !authStore.loading) {
    await authStore.init();
  }

  const isPublic = to.meta.public === true;

  if (!isPublic && !authStore.isAuthenticated) {
    return { name: 'Login' };
  }

  // Redirect authenticated users away from auth pages
  if (isPublic && authStore.isAuthenticated) {
    return { name: 'Dashboard' };
  }
});
