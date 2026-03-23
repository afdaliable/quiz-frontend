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
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { UserService } from './services/user.service';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { environment } from '../environments/environment';
import { CategoryComponent } from './category/category.component';
import { AccountComponent } from './account/account.component';
import { AuthCallbackComponent } from './auth-callback/auth-callback.component';
import { SessionManagementComponent } from './session-management/session-management.component';
import { InvalidSessionComponent } from './invalid-session/invalid-session.component';
import { PremiumPlansComponent } from './premium/premium-plans.component';
import { PaymentCallbackComponent } from './premium/payment-callback.component';
import { LicenseActivationComponent } from './premium/license-activation.component';
import { PremiumService } from './services/premium.service';
import { PremiumAccessModalComponent } from './premium/premium-access-modal.component';
import { HistoryComponent } from './history/history.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { BookmarksPageComponent } from './bookmark/bookmarks-page.component';
import { BottomNavComponent } from './bottom-nav/bottom-nav.component';
import { QuestionDiscussionComponent } from './question-discussion/question-discussion.component';
import { AboutComponent } from './about/about.component';
import { SubscriptionComponent } from './subscription/subscription.component';
import { OnboardingComponent } from './onboarding/onboarding.component';
import { PomodoroWidgetComponent } from './pomodoro-widget/pomodoro-widget.component';
import { PomodoroBreakModalComponent } from './pomodoro-break-modal/pomodoro-break-modal.component';

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
    CategoryComponent,
    AccountComponent,
    AuthCallbackComponent,
    SessionManagementComponent,
    InvalidSessionComponent,
    PaymentCallbackComponent,
    HistoryComponent,
    NotFoundComponent,
    BookmarksPageComponent,
    BottomNavComponent,
    QuestionDiscussionComponent,
    AboutComponent,
    SubscriptionComponent,
    OnboardingComponent,
    PomodoroWidgetComponent,
    PomodoroBreakModalComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    PremiumPlansComponent,
    LicenseActivationComponent,
    PremiumAccessModalComponent,
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
    ThemeService,
    PremiumService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
