package com.slotsone.qa.api;

import io.qameta.allure.*;
import io.restassured.response.Response;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;

@Epic("API")
@Feature("Game Spin")
public class SpinApiTest extends BaseApiTest {

    private String sessionId;
    private String gameId;
    private int maxLines;
    private double minBet;

    private String spinBody(String sessionId, String gameId, double amount, int lines) {
        return String.format(
                "{\"session_id\":\"%s\",\"game_id\":\"%s\",\"bet\":{\"amount\":%.2f,\"currency\":\"USD\",\"lines\":%d},\"client_timestamp\":%d}",
                sessionId, gameId, amount, lines, System.currentTimeMillis() / 1000);
    }

    private String defaultSpinBody() {
        return spinBody(sessionId, gameId, minBet, maxLines);
    }

    @BeforeClass
    @Override
    public void setupApi() {
        super.setupApi();
        String email = "spin_" + UUID.randomUUID().toString().substring(0, 8) + "@slotsone.com";
        accessToken = registerAndGetToken(email, "SpinTest123!");

        // Init game session and read config
        Response initResponse = authSpec()
                .body("{\"game_id\":\"slot_time_rewind_001\"}")
                .when()
                .post("/game/init")
                .then()
                .statusCode(200)
                .extract()
                .response();

        sessionId = initResponse.jsonPath().getString("session_id");
        gameId = initResponse.jsonPath().getString("game_id");
        maxLines = initResponse.jsonPath().getInt("config.max_lines");
        minBet = initResponse.jsonPath().getDouble("config.min_bet");
    }

    @Test(description = "Spin returns valid response with outcome and balance")
    @Severity(SeverityLevel.BLOCKER)
    @Story("Spin Execution")
    public void testSpinReturnsValidResponse() {
        Response spin = authSpec()
                .body(defaultSpinBody())
                .when()
                .post("/spin")
                .then()
                .statusCode(200)
                .body("spin_id", notNullValue())
                .body("balance", notNullValue())
                .body("outcome", notNullValue())
                .body("outcome.reel_matrix", notNullValue())
                .extract()
                .response();

        assertThat(spin.jsonPath().getString("spin_id")).isNotBlank();
        assertThat(spin.jsonPath().getDouble("balance.amount")).isGreaterThanOrEqualTo(0);
        assertThat(spin.jsonPath().getList("outcome.reel_matrix")).hasSize(5);
    }

    @Test(description = "Spin deducts bet from balance")
    @Severity(SeverityLevel.CRITICAL)
    @Story("Balance Management")
    public void testSpinDeductsBet() {
        // Get current balance via a fresh init
        double balanceBefore = authSpec()
                .body("{\"game_id\":\"slot_time_rewind_001\"}")
                .post("/game/init")
                .then().statusCode(200)
                .extract().jsonPath().getDouble("balance.amount");

        Response spin = authSpec()
                .body(defaultSpinBody())
                .when()
                .post("/spin")
                .then()
                .statusCode(200)
                .extract()
                .response();

        double balanceAfter = spin.jsonPath().getDouble("balance.amount");
        double winAmount = spin.jsonPath().getDouble("outcome.win.amount");
        double expected = balanceBefore - minBet + winAmount;

        assertThat(balanceAfter).isCloseTo(expected, org.assertj.core.data.Offset.offset(0.01));
    }

    @Test(description = "Spin with invalid session returns error")
    @Severity(SeverityLevel.CRITICAL)
    @Story("Error Handling")
    public void testSpinInvalidSession() {
        authSpec()
                .body(spinBody("non-existent-session", gameId, minBet, maxLines))
                .when()
                .post("/spin")
                .then()
                .statusCode(anyOf(is(400), is(403)))
                .body("error", notNullValue());
    }

    @Test(description = "Spin without authentication returns 401")
    @Severity(SeverityLevel.BLOCKER)
    @Story("Authorization")
    public void testSpinUnauthorized() {
        given()
                .spec(baseSpec)
                .body(defaultSpinBody())
                .when()
                .post("/spin")
                .then()
                .statusCode(401);
    }

    @Test(description = "Spin with negative bet returns 400")
    @Severity(SeverityLevel.NORMAL)
    @Story("Input Validation")
    public void testSpinNegativeBet() {
        authSpec()
                .body(spinBody(sessionId, gameId, -1, maxLines))
                .when()
                .post("/spin")
                .then()
                .statusCode(400);
    }

    @Test(description = "Duplicate spin requests are idempotent")
    @Severity(SeverityLevel.CRITICAL)
    @Story("Idempotency")
    public void testIdempotentSpin() {
        String idempotencyKey = UUID.randomUUID().toString();
        String body = defaultSpinBody();

        String firstSpinId = authSpec()
                .header("Idempotency-Key", idempotencyKey)
                .body(body)
                .when()
                .post("/spin")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath().getString("spin_id");

        String secondSpinId = authSpec()
                .header("Idempotency-Key", idempotencyKey)
                .body(body)
                .when()
                .post("/spin")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath().getString("spin_id");

        assertThat(firstSpinId).isEqualTo(secondSpinId);
    }
}
