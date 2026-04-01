package com.slotsone.qa.api;

import io.qameta.allure.*;
import io.restassured.response.Response;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.util.List;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;

@Epic("API")
@Feature("Game History")
public class HistoryApiTest extends BaseApiTest {

    private String sessionId;
    private String gameId;
    private int maxLines;
    private double minBet;

    private String spinBody() {
        return String.format(
                "{\"session_id\":\"%s\",\"game_id\":\"%s\",\"bet\":{\"amount\":%.2f,\"currency\":\"USD\",\"lines\":%d},\"client_timestamp\":%d}",
                sessionId, gameId, minBet, maxLines, System.currentTimeMillis() / 1000);
    }

    @BeforeClass
    @Override
    public void setupApi() {
        super.setupApi();
        String email = "hist_" + UUID.randomUUID().toString().substring(0, 8) + "@slotsone.com";
        accessToken = registerAndGetToken(email, "HistTest123!");

        // Init + read config
        Response init = authSpec()
                .body("{\"game_id\":\"slot_time_rewind_001\"}")
                .post("/game/init")
                .then()
                .statusCode(200)
                .extract()
                .response();

        sessionId = init.jsonPath().getString("session_id");
        gameId = init.jsonPath().getString("game_id");
        maxLines = init.jsonPath().getInt("config.max_lines");
        minBet = init.jsonPath().getDouble("config.min_bet");

        // Perform a spin so history is non-empty
        authSpec()
                .body(spinBody())
                .post("/spin")
                .then()
                .statusCode(200);
    }

    @Test(description = "Get history returns paginated list of rounds")
    @Severity(SeverityLevel.BLOCKER)
    @Story("History Listing")
    public void testGetHistory() {
        Response history = authSpec()
                .queryParam("limit", 10)
                .queryParam("offset", 0)
                .when()
                .get("/history")
                .then()
                .statusCode(200)
                .body("items", notNullValue())
                .body("total", greaterThanOrEqualTo(1))
                .extract()
                .response();

        List<?> items = history.jsonPath().getList("items");
        assertThat(items).isNotEmpty();
        assertThat(history.jsonPath().getString("items[0].spin_id")).isNotBlank();
    }

    @Test(description = "History respects limit pagination parameter")
    @Severity(SeverityLevel.NORMAL)
    @Story("Pagination")
    public void testHistoryPagination() {
        authSpec()
                .queryParam("limit", 1)
                .queryParam("offset", 0)
                .when()
                .get("/history")
                .then()
                .statusCode(200)
                .body("items.size()", lessThanOrEqualTo(1))
                .body("limit", equalTo(1));
    }

    @Test(description = "Get round detail by ID returns full round data")
    @Severity(SeverityLevel.CRITICAL)
    @Story("Round Detail")
    public void testGetRoundDetail() {
        String roundId = authSpec()
                .queryParam("limit", 1)
                .when()
                .get("/history")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .getString("items[0].spin_id");

        authSpec()
                .when()
                .get("/history/" + roundId)
                .then()
                .statusCode(200)
                .body("round", notNullValue())
                .body("round.id", equalTo(roundId))
                .body("round.bet", notNullValue())
                .body("round.win", notNullValue());
    }

    @Test(description = "Get non-existent round returns 404")
    @Severity(SeverityLevel.NORMAL)
    @Story("Round Detail")
    public void testGetRoundNotFound() {
        authSpec()
                .when()
                .get("/history/" + UUID.randomUUID())
                .then()
                .statusCode(404);
    }

    @Test(description = "History without auth returns 401")
    @Severity(SeverityLevel.BLOCKER)
    @Story("Authorization")
    public void testHistoryUnauthorized() {
        given()
                .spec(baseSpec)
                .when()
                .get("/history")
                .then()
                .statusCode(401);
    }

    @Test(description = "History summary returns aggregate stats")
    @Severity(SeverityLevel.NORMAL)
    @Story("Summary Stats")
    public void testHistorySummary() {
        authSpec()
                .when()
                .get("/history/summary")
                .then()
                .statusCode(200)
                .body("total_rounds", greaterThanOrEqualTo(1))
                .body("total_wagered", notNullValue())
                .body("total_won", notNullValue());
    }

    @Test(description = "History includes inline summary")
    @Severity(SeverityLevel.NORMAL)
    @Story("Summary Stats")
    public void testHistoryIncludesSummary() {
        authSpec()
                .when()
                .get("/history")
                .then()
                .statusCode(200)
                .body("summary", notNullValue())
                .body("summary.total_rounds", greaterThanOrEqualTo(1));
    }
}
