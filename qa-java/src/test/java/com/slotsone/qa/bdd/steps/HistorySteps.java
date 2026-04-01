package com.slotsone.qa.bdd.steps;

import com.slotsone.qa.config.TestConfig;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.When;
import io.cucumber.java.en.Then;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

public class HistorySteps {

    private static final TestConfig config = TestConfig.getInstance();
    private final SharedContext ctx;

    private String latestRoundId;

    public HistorySteps(SharedContext ctx) {
        this.ctx = ctx;
    }

    private String spinBody() {
        return String.format(
                "{\"session_id\":\"%s\",\"game_id\":\"%s\",\"bet\":{\"amount\":%.2f,\"currency\":\"USD\",\"lines\":%d},\"client_timestamp\":%d}",
                ctx.sessionId, ctx.gameId, ctx.minBet, ctx.maxLines, System.currentTimeMillis() / 1000);
    }

    @Given("I have completed at least {int} spin")
    public void iHaveCompletedSpins(int count) {
        // Register
        String email = "bdd_hist_" + UUID.randomUUID().toString().substring(0, 8) + "@slotsone.com";
        var reg = given()
                .contentType("application/json")
                .body(String.format(
                        "{\"email\":\"%s\",\"password\":\"BddHist123!\"}", email))
                .post(config.baseUrl() + config.apiBasePath() + "/auth/register");
        ctx.accessToken = reg.jsonPath().getString("access_token");

        // Init
        var init = given()
                .contentType("application/json")
                .header("Authorization", "Bearer " + ctx.accessToken)
                .body(String.format("{\"game_id\":\"%s\"}", ctx.gameId))
                .post(config.baseUrl() + config.apiBasePath() + "/game/init");
        ctx.sessionId = init.jsonPath().getString("session_id");
        ctx.maxLines = init.jsonPath().getInt("config.max_lines");
        ctx.minBet = init.jsonPath().getDouble("config.min_bet");

        // Spin
        for (int i = 0; i < count; i++) {
            given()
                    .contentType("application/json")
                    .header("Authorization", "Bearer " + ctx.accessToken)
                    .body(spinBody())
                    .post(config.baseUrl() + config.apiBasePath() + "/spin");
        }
    }

    @Given("I know the ID of my latest round")
    public void iKnowLatestRoundId() {
        var hist = given()
                .contentType("application/json")
                .header("Authorization", "Bearer " + ctx.accessToken)
                .queryParam("limit", 1)
                .get(config.baseUrl() + config.apiBasePath() + "/history");
        latestRoundId = hist.jsonPath().getString("items[0].spin_id");
    }

    @When("I request my game history")
    public void iRequestHistory() {
        ctx.lastResponse = given()
                .contentType("application/json")
                .header("Authorization", "Bearer " + ctx.accessToken)
                .get(config.baseUrl() + config.apiBasePath() + "/history");
    }

    @When("I request history with page {int} and per_page {int}")
    public void iRequestHistoryPaginated(int page, int perPage) {
        ctx.lastResponse = given()
                .contentType("application/json")
                .header("Authorization", "Bearer " + ctx.accessToken)
                .queryParam("limit", perPage)
                .queryParam("offset", (page - 1) * perPage)
                .get(config.baseUrl() + config.apiBasePath() + "/history");
    }

    @When("I request the round detail by ID")
    public void iRequestRoundDetail() {
        ctx.lastResponse = given()
                .contentType("application/json")
                .header("Authorization", "Bearer " + ctx.accessToken)
                .get(config.baseUrl() + config.apiBasePath() + "/history/" + latestRoundId);
    }

    @When("I request round detail for a random UUID")
    public void iRequestNonExistentRound() {
        ctx.lastResponse = given()
                .contentType("application/json")
                .header("Authorization", "Bearer " + ctx.accessToken)
                .get(config.baseUrl() + config.apiBasePath() + "/history/" + UUID.randomUUID());
    }

    @When("I request the history summary")
    public void iRequestSummary() {
        ctx.lastResponse = given()
                .contentType("application/json")
                .header("Authorization", "Bearer " + ctx.accessToken)
                .get(config.baseUrl() + config.apiBasePath() + "/history/summary");
    }

    @When("I attempt to access history without a token")
    public void iAccessHistoryWithoutToken() {
        ctx.lastResponse = given()
                .contentType("application/json")
                .get(config.baseUrl() + config.apiBasePath() + "/history");
    }

    @Then("I should see at least {int} round in the response")
    public void iShouldSeeRounds(int count) {
        List<?> items = ctx.lastResponse.jsonPath().getList("items");
        assertThat(items).hasSizeGreaterThanOrEqualTo(count);
    }

    @Then("each round contains id, game_id, bet_amount, win_amount, and created_at")
    public void eachRoundContainsRequiredFields() {
        List<Map<String, Object>> items = ctx.lastResponse.jsonPath().getList("items");
        for (Map<String, Object> item : items) {
            assertThat(item).containsKeys("spin_id", "game_id", "bet", "outcome");
        }
    }

    @Then("the response contains at most {int} round")
    public void responseContainsAtMost(int count) {
        List<?> items = ctx.lastResponse.jsonPath().getList("items");
        assertThat(items).hasSizeLessThanOrEqualTo(count);
    }

    @Then("the response includes pagination metadata")
    public void responseIncludesPagination() {
        assertThat((Object) ctx.lastResponse.jsonPath().get("limit")).isNotNull();
        assertThat((Object) ctx.lastResponse.jsonPath().get("offset")).isNotNull();
    }

    @Then("the response contains bet_amount and win_amount")
    public void responseContainsBetAndWin() {
        assertThat((Object) ctx.lastResponse.jsonPath().get("round.bet")).isNotNull();
        assertThat((Object) ctx.lastResponse.jsonPath().get("round.win")).isNotNull();
    }

    @Then("the response contains the game_id")
    public void responseContainsGameId() {
        assertThat(ctx.lastResponse.jsonPath().getString("round.game_id")).isNotBlank();
    }

    @Then("the response contains total_rounds, total_wagered, and total_won")
    public void responseContainsSummaryFields() {
        assertThat((Object) ctx.lastResponse.jsonPath().get("total_rounds")).isNotNull();
        assertThat((Object) ctx.lastResponse.jsonPath().get("total_wagered")).isNotNull();
        assertThat((Object) ctx.lastResponse.jsonPath().get("total_won")).isNotNull();
    }

    @Then("total_rounds is greater than {int}")
    public void totalRoundsGreaterThan(int min) {
        assertThat(ctx.lastResponse.jsonPath().getInt("total_rounds")).isGreaterThan(min);
    }
}
