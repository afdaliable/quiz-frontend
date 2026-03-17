import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuestionComponent } from './question/question.component';
import { WelcomeComponent } from './welcome/welcome.component';
import { HomeComponent } from './home/home.component';
import { ResultComponent } from './result/result.component';
import { ReviewComponent } from './review/review.component';
import { DaftarSoalComponent } from './daftar-soal/daftar-soal.component';
import { LoginComponent } from './login/login.component';
import { CategoryComponent } from './category/category.component';
import { AccountComponent } from './account/account.component';
import { AuthGuard } from './auth/auth.guard';
import { AuthCallbackComponent } from './auth-callback/auth-callback.component';
import { InvalidSessionComponent } from './invalid-session/invalid-session.component';
import { PremiumPlansComponent } from './premium/premium-plans.component';
import { PaymentCallbackComponent } from './premium/payment-callback.component';
import { LicenseActivationComponent } from './premium/license-activation.component';
import { HistoryComponent } from './history/history.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { BookmarksPageComponent } from './bookmark/bookmarks-page.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    component: HomeComponent,
  },
  {
    path: 'bookmarks',
    component: BookmarksPageComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'welcome',
    component: WelcomeComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'question',
    component: QuestionComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'result',
    component: ResultComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'review',
    component: ReviewComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'daftar-soal',
    component: DaftarSoalComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'account',
    component: AccountComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'history',
    component: HistoryComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'categories',
    component: CategoryComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'paket-soal/:kategori',
    component: DaftarSoalComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'premium-plans',
    component: PremiumPlansComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'payment/callback',
    component: PaymentCallbackComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'aktivasi-berlangganan',
    component: LicenseActivationComponent
  },
  {
    path: 'invalid-session',
    component: InvalidSessionComponent,
  },
  {
    path: 'auth/callback',
    component: AuthCallbackComponent,
  },
  {
    path: '**',
    component: NotFoundComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
