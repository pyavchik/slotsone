package com.slotsone.qa.api;

import com.slotsone.qa.api.dto.AuthResponse;
import io.qameta.allure.*;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static io.restassured.module.jsv.JsonSchemaValidator.matchesJsonSchemaInClasspath;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;

@Epic("API")
@Feature("Authentication")
public class AuthApiTest extends BaseApiTest {

    private final String uniqueEmail = "test_" + UUID.randomUUID().toString().substring(0, 8) + "@slotsone.com";
    private final String password = "SecurePass123!";

    @BeforeClass
    @Override
    public void setupApi() {
        super.setupApi();
    }

    // -----------------------------------------------------------------------
    // Registration
    // -----------------------------------------------------------------------

    @Test(description = "Register a new user returns 201 with access token")
    @Severity(SeverityLevel.BLOCKER)
    @Story("User Registration")
    public void testRegisterNewUser() {
        AuthResponse response = given()
                .spec(baseSpec)
                .body(String.format(
                        "{\"email\":\"%s\",\"password\":\"%s\"}",
                        uniqueEmail, password))
                .when()
                .post("/auth/register")
                .then()
                .statusCode(201)
                .body("access_token", notNullValue())
                .body("token_type", equalTo("Bearer"))
                .body("expires_in", greaterThan(0))
                .extract()
                .as(AuthResponse.class);

        assertThat(response.getAccessToken()).isNotBlank();
        assertThat(response.getTokenType()).isEqualTo("Bearer");
    }

    @Test(description = "Register with duplicate email returns 409",
            dependsOnMethods = "testRegisterNewUser")
    @Severity(SeverityLevel.CRITICAL)
    @Story("User Registration")
    public void testRegisterDuplicateEmail() {
        given()
                .spec(baseSpec)
                .body(String.format(
                        "{\"email\":\"%s\",\"password\":\"%s\"}",
                        uniqueEmail, password))
                .when()
                .post("/auth/register")
                .then()
                .statusCode(409)
                .body("error", notNullValue());
    }

    @Test(description = "Register with short password returns 400")
    @Severity(SeverityLevel.NORMAL)
    @Story("User Registration")
    public void testRegisterShortPassword() {
        String email = "short_" + UUID.randomUUID().toString().substring(0, 8) + "@slotsone.com";

        given()
                .spec(baseSpec)
                .body(String.format(
                        "{\"email\":\"%s\",\"password\":\"abc\"}",
                        email))
                .when()
                .post("/auth/register")
                .then()
                .statusCode(400);
    }

    @Test(description = "Register with invalid email format returns 400")
    @Severity(SeverityLevel.NORMAL)
    @Story("User Registration")
    public void testRegisterInvalidEmail() {
        given()
                .spec(baseSpec)
                .body("{\"email\":\"not-an-email\",\"password\":\"TestPass123!\"}")
                .when()
                .post("/auth/register")
                .then()
                .statusCode(400);
    }

    @Test(description = "Register with extra fields (strict mode) returns 400")
    @Severity(SeverityLevel.NORMAL)
    @Story("User Registration")
    public void testRegisterStrictSchema() {
        String email = "strict_" + UUID.randomUUID().toString().substring(0, 8) + "@slotsone.com";

        given()
                .spec(baseSpec)
                .body(String.format(
                        "{\"email\":\"%s\",\"password\":\"%s\",\"extra_field\":true}",
                        email, password))
                .when()
                .post("/auth/register")
                .then()
                .statusCode(400);
    }

    // -----------------------------------------------------------------------
    // Login
    // -----------------------------------------------------------------------

    @Test(description = "Login with valid credentials returns 200 with token",
            dependsOnMethods = "testRegisterNewUser")
    @Severity(SeverityLevel.BLOCKER)
    @Story("User Login")
    public void testLoginSuccess() {
        AuthResponse response = given()
                .spec(baseSpec)
                .body(String.format(
                        "{\"email\":\"%s\",\"password\":\"%s\"}",
                        uniqueEmail, password))
                .when()
                .post("/auth/login")
                .then()
                .statusCode(200)
                .body("access_token", notNullValue())
                .body("token_type", equalTo("Bearer"))
                .extract()
                .as(AuthResponse.class);

        assertThat(response.getAccessToken()).isNotBlank();
    }

    @Test(description = "Login with wrong password returns 401")
    @Severity(SeverityLevel.CRITICAL)
    @Story("User Login")
    public void testLoginWrongPassword() {
        given()
                .spec(baseSpec)
                .body(String.format(
                        "{\"email\":\"%s\",\"password\":\"WrongPass999!\"}",
                        uniqueEmail))
                .when()
                .post("/auth/login")
                .then()
                .statusCode(401)
                .body("error", notNullValue());
    }

    @Test(description = "Login with non-existent email returns 401")
    @Severity(SeverityLevel.NORMAL)
    @Story("User Login")
    public void testLoginNonExistentUser() {
        given()
                .spec(baseSpec)
                .body("{\"email\":\"ghost@nowhere.com\",\"password\":\"TestPass123!\"}")
                .when()
                .post("/auth/login")
                .then()
                .statusCode(401);
    }

    // -----------------------------------------------------------------------
    // Token validation
    // -----------------------------------------------------------------------

    @Test(description = "Accessing protected endpoint without token returns 401")
    @Severity(SeverityLevel.BLOCKER)
    @Story("Authorization")
    public void testUnauthorizedAccess() {
        given()
                .spec(baseSpec)
                .when()
                .get("/history")
                .then()
                .statusCode(401);
    }

    @Test(description = "Accessing protected endpoint with invalid token returns 401")
    @Severity(SeverityLevel.CRITICAL)
    @Story("Authorization")
    public void testInvalidTokenAccess() {
        given()
                .spec(baseSpec)
                .header("Authorization", "Bearer invalid.jwt.token")
                .when()
                .get("/history")
                .then()
                .statusCode(401);
    }

    @Test(description = "Auth response matches JSON schema",
            dependsOnMethods = "testRegisterNewUser")
    @Severity(SeverityLevel.NORMAL)
    @Story("Schema Validation")
    public void testAuthResponseSchema() {
        given()
                .spec(baseSpec)
                .body(String.format(
                        "{\"email\":\"%s\",\"password\":\"%s\"}",
                        uniqueEmail, password))
                .when()
                .post("/auth/login")
                .then()
                .statusCode(200)
                .body(matchesJsonSchemaInClasspath("schemas/auth-response.json"));
    }
}
