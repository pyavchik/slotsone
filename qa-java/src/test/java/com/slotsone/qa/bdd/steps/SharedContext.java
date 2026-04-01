package com.slotsone.qa.bdd.steps;

import io.restassured.response.Response;

/**
 * Shared state between Cucumber step definition classes.
 * Cucumber creates one instance per scenario, and PicoContainer
 * injects the same instance into all step classes.
 */
public class SharedContext {
    public String accessToken;
    public String sessionId;
    public String gameId = "slot_time_rewind_001";
    public int maxLines;
    public double minBet;
    public Response lastResponse;
}
