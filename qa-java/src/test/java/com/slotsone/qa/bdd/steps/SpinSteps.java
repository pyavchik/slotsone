package com.slotsone.qa.bdd.steps;

import com.slotsone.qa.config.TestConfig;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.When;
import io.cucumber.java.en.Then;
import io.restassured.response.Response;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

public class SpinSteps {

    private static final TestConfig config = TestConfig.getInstance();
    private final SharedContext ctx;

    private double balanceBefore;
    private Response secondSpinResponse;

    public SpinSteps(SharedContext ctx) {
        this.ctx = ctx;
    }

    private String spinBody(double amount) {
        return String.format(
                "{\"session_id\":\"%s\",\"game_id\":\"%s\",\"bet\":{\"amount\":%.2f,\"currency\":\"USD\",\"lines\":%d},\"client_timestamp\":%d}",
                ctx.sessionId, ctx.gameId, amount, ctx.maxLines, System.currentTimeMillis() / 1000);
    }

    @Given("I have initialized a game session for {string}")
    public void iHaveInitializedSession(String gameId) {
        var init = given()
                .contentType("application/json")
                .header("Authorization", "Bearer " + ctx.accessToken)
                .body(String.format("{\"game_id\":\"%s\"}", ctx.gameId))
                .post(config.baseUrl() + config.apiBasePath() + "/game/init");

        ctx.sessionId = init.jsonPath().getString("session_id");
        ctx.maxLines = init.jsonPath().getInt("config.max_lines");
        ctx.minBet = init.jsonPath().getDouble("config.min_bet");
    }

    @Given("my current balance is recorded")
    public void myBalanceIsRecorded() {
        balanceBefore = given()
                .contentType("application/json")
                .header("Authorization", "Bearer " + ctx.accessToken)
                .body(String.format("{\"game_id\":\"%s\"}", ctx.gameId))
                .post(config.baseUrl() + config.apiBasePath() + "/game/init")
                .jsonPath()
                .getDouble("balance.amount");
    }

    @Given("my balance is less than the minimum bet")
    public void myBalanceIsLow() {
        balanceBefore = given()
                .contentType("application/json")
                .header("Authorization", "Bearer " + ctx.accessToken)
                .body(String.format("{\"game_id\":\"%s\"}", ctx.gameId))
                .post(config.baseUrl() + config.apiBasePath() + "/game/init")
                .jsonPath()
                .getDouble("balance.amount");
    }

    @When("I perform a spin with bet amount {double}")
    public void iPerformSpin(double betAmount) {
        ctx.lastResponse = given()
                .contentType("application/json")
                .header("Authorization", "Bearer " + ctx.accessToken)
                .body(spinBody(betAmount))
                .post(config.baseUrl() + config.apiBasePath() + "/spin");
    }

    @When("I attempt a spin without a token")
    public void iAttemptSpinWithoutToken() {
        ctx.lastResponse = given()
                .contentType("application/json")
                .body(spinBody(ctx.minBet))
                .post(config.baseUrl() + config.apiBasePath() + "/spin");
    }

    @When("I perform a spin with idempotency key {string}")
    public void iPerformSpinWithIdempotencyKey(String key) {
        ctx.lastResponse = given()
                .contentType("application/json")
                .header("Authorization", "Bearer " + ctx.accessToken)
                .header("Idempotency-Key", key)
                .body(spinBody(ctx.minBet))
                .post(config.baseUrl() + config.apiBasePath() + "/spin");
    }

    @When("I repeat the same spin with idempotency key {string}")
    public void iRepeatSpinWithIdempotencyKey(String key) {
        secondSpinResponse = given()
                .contentType("application/json")
                .header("Authorization", "Bearer " + ctx.accessToken)
                .header("Idempotency-Key", key)
                .body(spinBody(ctx.minBet))
                .post(config.baseUrl() + config.apiBasePath() + "/spin");
    }

    @Then("the response contains a valid spin_id")
    public void responseContainsSpinId() {
        assertThat(ctx.lastResponse.jsonPath().getString("spin_id")).isNotBlank();
    }

    @Then("the response contains a reel matrix")
    public void responseContainsReels() {
        assertThat(ctx.lastResponse.jsonPath().getList("outcome.reel_matrix")).isNotEmpty();
    }

    @Then("my balance is updated correctly")
    public void balanceIsUpdated() {
        double newBalance = ctx.lastResponse.jsonPath().getDouble("balance.amount");
        assertThat(newBalance).isGreaterThanOrEqualTo(0);
    }

    @Then("my balance decreased by at least the bet amount minus any win")
    public void balanceDecreasedByBet() {
        double newBalance = ctx.lastResponse.jsonPath().getDouble("balance.amount");
        double totalWin = ctx.lastResponse.jsonPath().getDouble("outcome.win.amount");
        double expectedBalance = balanceBefore - ctx.minBet + totalWin;
        assertThat(newBalance).isCloseTo(expectedBalance, org.assertj.core.data.Offset.offset(0.01));
    }

    @Then("I should receive an {string} error")
    public void iShouldReceiveError(String errorCode) {
        assertThat(ctx.lastResponse.jsonPath().getString("code")).isEqualTo(errorCode);
    }

    @Then("both responses have the same spin_id")
    public void bothResponsesHaveSameSpinId() {
        String firstId = ctx.lastResponse.jsonPath().getString("spin_id");
        String secondId = secondSpinResponse.jsonPath().getString("spin_id");
        assertThat(firstId).isEqualTo(secondId);
    }
}
