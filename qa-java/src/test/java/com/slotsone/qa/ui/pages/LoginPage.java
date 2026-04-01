package com.slotsone.qa.ui.pages;

import com.codeborne.selenide.SelenideElement;
import io.qameta.allure.Step;

import static com.codeborne.selenide.Condition.*;
import static com.codeborne.selenide.Selenide.*;

public class LoginPage {

    private final SelenideElement authCard = $(".auth-card");
    private final SelenideElement emailInput = $("#auth-email");
    private final SelenideElement passwordInput = $("#auth-password");
    private final SelenideElement submitButton = $("button.auth-submit");
    private final SelenideElement registerTab = $("button.auth-tab:nth-child(2)");
    private final SelenideElement loginTab = $("button.auth-tab:nth-child(1)");
    private final SelenideElement ageCheckbox = $("#auth-age");
    private final SelenideElement errorMessage = $(".auth-error");

    @Step("Open login page")
    public LoginPage open() {
        com.codeborne.selenide.Selenide.open("/login");
        authCard.shouldBe(visible);
        return this;
    }

    @Step("Open register page")
    public LoginPage openRegister() {
        com.codeborne.selenide.Selenide.open("/register");
        authCard.shouldBe(visible);
        return this;
    }

    @Step("Switch to Register tab")
    public LoginPage switchToRegister() {
        registerTab.click();
        return this;
    }

    @Step("Switch to Login tab")
    public LoginPage switchToLogin() {
        loginTab.click();
        return this;
    }

    @Step("Enter email: {email}")
    public LoginPage enterEmail(String email) {
        emailInput.clear();
        emailInput.setValue(email);
        return this;
    }

    @Step("Enter password")
    public LoginPage enterPassword(String password) {
        passwordInput.clear();
        passwordInput.setValue(password);
        return this;
    }

    @Step("Confirm age checkbox")
    public LoginPage confirmAge() {
        if (!ageCheckbox.isSelected()) {
            ageCheckbox.click();
        }
        return this;
    }

    @Step("Click submit button")
    public LoginPage submit() {
        submitButton.click();
        return this;
    }

    @Step("Login as {email}")
    public LobbyPage loginAs(String email, String password) {
        enterEmail(email);
        enterPassword(password);
        submit();
        return new LobbyPage();
    }

    @Step("Register as {email}")
    public LobbyPage registerAs(String email, String password) {
        switchToRegister();
        enterEmail(email);
        enterPassword(password);
        confirmAge();
        submit();
        return new LobbyPage();
    }

    @Step("Verify error message is displayed")
    public LoginPage verifyErrorDisplayed() {
        errorMessage.shouldBe(visible);
        return this;
    }

    @Step("Verify error contains text: {text}")
    public LoginPage verifyErrorContains(String text) {
        errorMessage.shouldHave(text(text));
        return this;
    }

    public boolean isDisplayed() {
        return authCard.isDisplayed();
    }
}
