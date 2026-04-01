package com.slotsone.qa.ui;

import com.slotsone.qa.ui.pages.LoginPage;
import com.slotsone.qa.ui.pages.LobbyPage;
import io.qameta.allure.*;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.util.UUID;

import static com.codeborne.selenide.Selenide.clearBrowserCookies;
import static com.codeborne.selenide.Selenide.clearBrowserLocalStorage;
import static com.codeborne.selenide.WebDriverRunner.getWebDriver;
import static org.assertj.core.api.Assertions.assertThat;

@Epic("UI")
@Feature("Authentication")
public class LoginUiTest extends BaseUiTest {

    private LoginPage loginPage;

    @BeforeMethod
    public void openLoginPage() {
        // Kill browser to clear httpOnly cookies and prevent auto-login
        com.codeborne.selenide.Selenide.closeWebDriver();
        loginPage = new LoginPage().open();
    }

    @Test(description = "Login page renders with email and password fields")
    @Severity(SeverityLevel.BLOCKER)
    @Story("Login Page")
    public void testLoginPageRendered() {
        assertThat(loginPage.isDisplayed()).isTrue();
    }

    @Test(description = "Successful registration redirects to lobby")
    @Severity(SeverityLevel.BLOCKER)
    @Story("User Registration")
    public void testSuccessfulRegistration() {
        String email = "uitest_" + UUID.randomUUID().toString().substring(0, 8) + "@slotsone.com";

        loginPage.switchToRegister();
        LobbyPage lobby = loginPage.registerAs(email, "UiTestPass123!");

        lobby.waitForLoad();
        assertThat(lobby.isDisplayed()).isTrue();
    }

    @Test(description = "Login with wrong password shows error")
    @Severity(SeverityLevel.CRITICAL)
    @Story("User Login")
    public void testLoginWrongPasswordShowsError() {
        loginPage
                .enterEmail("nonexistent@slotsone.com")
                .enterPassword("WrongPassword123!")
                .submit();

        loginPage.verifyErrorDisplayed();
    }

    @Test(description = "Tab switching between Login and Register works")
    @Severity(SeverityLevel.NORMAL)
    @Story("Login Page")
    public void testTabSwitching() {
        loginPage.switchToRegister();
        loginPage.switchToLogin();
        assertThat(loginPage.isDisplayed()).isTrue();
    }
}
