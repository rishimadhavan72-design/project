import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/welcome/welcome.component').then(m => m.WelcomeComponent),
    title: 'TrustVault — Your Documents. Your Control.'
  },
  {
    path: 'personal',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/personal-auth/personal-login.component').then(m => m.PersonalLoginComponent),
        title: 'Personal Sign In — TrustVault'
      },
      {
        path: 'register',
        loadComponent: () => import('./features/personal-auth/personal-register.component').then(m => m.PersonalRegisterComponent),
        title: 'Create Personal Account — TrustVault'
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./features/personal-auth/personal-forgot-password.component').then(m => m.PersonalForgotPasswordComponent),
        title: 'Recover Password — TrustVault'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/personal-dashboard/personal-dashboard.component').then(m => m.PersonalDashboardComponent),
        title: 'Personal Vault — TrustVault'
      }
    ]
  },
  {
    path: 'corporate',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/corporate-auth/corporate-login.component').then(m => m.CorporateLoginComponent),
        title: 'Corporate Sign In — TrustVault'
      },
      {
        path: 'register-company',
        loadComponent: () => import('./features/corporate-auth/corporate-register-company.component').then(m => m.CorporateRegisterCompanyComponent),
        title: 'Register Organisation — TrustVault'
      },
      {
        path: 'join-company',
        loadComponent: () => import('./features/corporate-auth/corporate-join-company.component').then(m => m.CorporateJoinCompanyComponent),
        title: 'Join Organisation — TrustVault'
      },
      {
        path: 'accept-invitation',
        loadComponent: () => import('./features/corporate-auth/corporate-accept-invitation.component').then(m => m.CorporateAcceptInvitationComponent),
        title: 'Accept Invitation — TrustVault'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/corporate-dashboard/corporate-dashboard.component').then(m => m.CorporateDashboardComponent),
        title: 'Enterprise Dashboard — TrustVault'
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
