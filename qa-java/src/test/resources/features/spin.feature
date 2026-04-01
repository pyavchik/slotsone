@game @spin
Feature: Slot Game Spin
  As a registered player I want to spin the slot machine
  so that I can play the game and potentially win credits.

  Background:
    Given the SlotsOne application is running
    And I am logged in as a registered player
    And I have initialized a game session for "time-machine"

  @smoke
  Scenario: Successful spin returns reels and updates balance
    Given my current balance is recorded
    When I perform a spin with bet amount 0.15
    Then the response contains a valid spin_id
    And the response contains a reel matrix
    And my balance is updated correctly

  Scenario: Spin deducts bet from balance
    Given my current balance is recorded
    When I perform a spin with bet amount 0.15
    Then my balance decreased by at least the bet amount minus any win

  Scenario: Spin without authentication is rejected
    Given I am not authenticated
    When I attempt a spin without a token
    Then I should receive a 401 status code

  @negative
  Scenario: Spin rejects negative bet amount
    When I perform a spin with bet amount -1.00
    Then I should receive a 400 status code

  @idempotency
  Scenario: Duplicate spin requests are idempotent
    When I perform a spin with idempotency key "test-key-123"
    And I repeat the same spin with idempotency key "test-key-123"
    Then both responses have the same spin_id
