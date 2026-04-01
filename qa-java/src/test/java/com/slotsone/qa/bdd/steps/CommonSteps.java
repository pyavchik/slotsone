package com.slotsone.qa.bdd.steps;

import com.slotsone.qa.config.TestConfig;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

public class CommonSteps {

    private static final TestConfig config = TestConfig.getInstance();
    private final SharedContext ctx;

    public CommonSteps(SharedContext ctx) {
        this.ctx = ctx;
    }

    @Given("the SlotsOne application is running")
    public void theApplicationIsRunning() {
        // Implicitly verified by the first API call
    }

    @Given("I am logged in as a registered player")
    public void iAmLoggedIn() {
        String email = "bdd_" + UUID.randomUUID().toString().substring(0, 8) + "@slotsone.com";

        var regResponse = given()
                .contentType("application/json")
                .body(String.format(
                        "{\"email\":\"%s\",\"password\":\"BddTest123!\"}", email))
                .post(config.baseUrl() + config.apiBasePath() + "/auth/register");

        ctx.accessToken = regResponse.jsonPath().getString("access_token");
    }

    @Given("I am not authenticated")
    public void iAmNotAuthenticated() {
        ctx.accessToken = null;
    }

    @Then("I should receive a {int} status code")
    public void iShouldReceiveStatusCode(int statusCode) {
        assertThat(ctx.lastResponse.statusCode()).isEqualTo(statusCode);
    }
}
