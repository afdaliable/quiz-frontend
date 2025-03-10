import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { WelcomeComponent } from './welcome/welcome.component';
import { QuestionComponent } from './question/question.component';
import { HeaderComponent } from './header/header.component';
import { ChangeBgDirective } from './change-bg.directive';
import { HomeComponent } from './home/home.component';
import { ResultComponent } from './result/result.component';
import { ReviewComponent } from './review/review.component';
import { DaftarSoalComponent } from './daftar-soal/daftar-soal.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { UserService } from './services/user.service';
import { AuthService } from './services/auth.service';
import { SupabaseService } from './services/supabase.service';
import { ThemeService } from './services/theme.service';
import { environment } from '../environments/environment';
import { CategoryComponent } from './category/category.component';
import { VerificationComponent } from './verification/verification.component';

import { AccountComponent } from './account/account.component';

@NgModule({
  declarations: [
    AppComponent,
    WelcomeComponent,
    QuestionComponent,
    HeaderComponent,
    ChangeBgDirective,
    HomeComponent,
    ResultComponent,
    ReviewComponent,
    DaftarSoalComponent,
    LoginComponent,
    RegisterComponent,
    CategoryComponent,
    VerificationComponent,
    AccountComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    RouterModule.forRoot([]),
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
  ],
  providers: [
    {
      provide: 'BASE_API_URL',
      useValue: environment.apiUrl
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    UserService,
    AuthService,
    SupabaseService,
    ThemeService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
