package com.slotsone.qa.api;

import com.slotsone.qa.api.dto.AuthResponse;
import com.slotsone.qa.config.TestConfig;
import io.qameta.allure.restassured.AllureRestAssured;
import io.restassured.RestAssured;
import io.restassured.builder.RequestSpecBuilder;
import io.restassured.filter.log.RequestLoggingFilter;
import io.restassured.filter.log.ResponseLoggingFilter;
import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;
import org.testng.annotations.BeforeClass;

import static io.restassured.RestAssured.given;

/**
 * Base class for all REST Assured API tests.
 * Configures base URI, logging, Allure integration, and provides auth helpers.
 */
public abstract class BaseApiTest {

    protected static final TestConfig config = TestConfig.getInstance();
    protected RequestSpecification baseSpec;
    protected String accessToken;

    @BeforeClass(alwaysRun = true)
    public void setupApi() {
        RestAssured.baseURI = config.baseUrl();
        RestAssured.basePath = config.apiBasePath();

        baseSpec = new RequestSpecBuilder()
                .setContentType(ContentType.JSON)
                .addFilter(new AllureRestAssured())
                .addFilter(new RequestLoggingFilter())
                .addFilter(new ResponseLoggingFilter())
                .build();
    }

    /**
     * Register a fresh user and return the access token.
     */
    protected String registerAndGetToken(String email, String password) {
        AuthResponse auth = given()
                .spec(baseSpec)
                .body(String.format(
                        "{\"email\":\"%s\",\"password\":\"%s\"}",
                        email, password))
                .when()
                .post("/auth/register")
                .then()
                .statusCode(201)
                .extract()
                .as(AuthResponse.class);

        return auth.getAccessToken();
    }

    /**
     * Login with existing credentials and return the access token.
     */
    protected String loginAndGetToken(String email, String password) {
        AuthResponse auth = given()
                .spec(baseSpec)
                .body(String.format(
                        "{\"email\":\"%s\",\"password\":\"%s\"}",
                        email, password))
                .when()
                .post("/auth/login")
                .then()
                .statusCode(200)
                .extract()
                .as(AuthResponse.class);

        return auth.getAccessToken();
    }

    /**
     * Build an authenticated request spec with Bearer token.
     */
    protected RequestSpecification authSpec() {
        return given()
                .spec(baseSpec)
                .header("Authorization", "Bearer " + accessToken);
    }
}
