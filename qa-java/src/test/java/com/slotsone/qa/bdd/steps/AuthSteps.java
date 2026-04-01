package com.slotsone.qa.bdd.steps;

import com.slotsone.qa.ui.pages.LoginPage;
import com.slotsone.qa.ui.pages.LobbyPage;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.When;
import io.cucumber.java.en.Then;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

public class AuthSteps {

    private final SharedContext ctx;
    private LoginPage loginPage;
    private LobbyPage lobbyPage;
    private String registeredEmail;
    private String registeredPassword;

    public AuthSteps(SharedContext ctx) {
        this.ctx = ctx;
    }

    @Given("I am on the login page")
    public void iAmOnTheLoginPage() {
        loginPage = new LoginPage().open();
    }

    @Given("I am on the registration page")
    public void iAmOnTheRegistrationPage() {
        loginPage = new LoginPage().openRegister();
    }

    @Given("I have a registered account")
    public void iHaveARegisteredAccount() {
        registeredEmail = "bdd_" + UUID.randomUUID().toString().substring(0, 8) + "@slotsone.com";
        registeredPassword = "BddTest123!";

        loginPage = new LoginPage().openRegister();
        lobbyPage = loginPage.registerAs(registeredEmail, registeredPassword);
        lobbyPage.waitForLoad();

        loginPage = new LoginPage().open();
    }

    @When("I register with a unique email and password {string}")
    public void iRegisterWithUniqueEmail(String password) {
        registeredEmail = "bdd_" + UUID.randomUUID().toString().substring(0, 8) + "@slotsone.com";
        registeredPassword = password;
        loginPage.enterEmail(registeredEmail);
        loginPage.enterPassword(password);
    }

    @When("I confirm I am over 18")
    public void iConfirmAge() {
        loginPage.confirmAge();
    }

    @When("I do not confirm my age")
    public void iDoNotConfirmAge() {
        // Age checkbox intentionally left unchecked
    }

    @When("I submit the form")
    public void iSubmitTheForm() {
        loginPage.submit();
    }

    @When("I login with my credentials")
    public void iLoginWithMyCredentials() {
        lobbyPage = loginPage.loginAs(registeredEmail, registeredPassword);
    }

    @When("I enter email {string} and password {string}")
    public void iEnterCredentials(String email, String password) {
        loginPage.enterEmail(email);
        loginPage.enterPassword(password);
    }

    @Then("I should be redirected to the lobby")
    public void iShouldBeRedirectedToLobby() {
        if (lobbyPage == null) {
            lobbyPage = new LobbyPage();
        }
        lobbyPage.waitForLoad();
        assertThat(lobbyPage.isDisplayed()).isTrue();
    }

    @Then("I should see at least {int} game card")
    public void iShouldSeeGameCards(int count) {
        lobbyPage.verifyGameCount(count);
    }

    @Then("I should see an error message")
    public void iShouldSeeAnError() {
        loginPage.verifyErrorDisplayed();
    }

    @Then("the submit button should be disabled or show an error")
    public void submitShouldBeDisabledOrError() {
        loginPage.verifyErrorDisplayed();
    }
}
