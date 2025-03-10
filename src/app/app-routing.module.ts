import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuestionComponent } from './question/question.component';
import { WelcomeComponent } from './welcome/welcome.component';
import { HomeComponent } from './home/home.component';
import { ResultComponent } from './result/result.component';
import { ReviewComponent } from './review/review.component';
import { DaftarSoalComponent } from './daftar-soal/daftar-soal.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { CategoryComponent } from './category/category.component';
import { AccountComponent } from './account/account.component';
import { AuthGuard } from './auth/auth.guard';
import { VerificationComponent } from './verification/verification.component';
import { AuthCallbackComponent } from './auth-callback/auth-callback.component';

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
    path: 'register',
    component: RegisterComponent,
  },
  {
    path: 'verification',
    component: VerificationComponent,
  },
  {
    path: 'account',
    component: AccountComponent,
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
    path: 'auth/callback',
    component: AuthCallbackComponent,
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
