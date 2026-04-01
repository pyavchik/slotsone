@history
Feature: Game History
  As a player I want to view my game history
  so that I can review past rounds, bets, and winnings.

  Background:
    Given the SlotsOne application is running
    And I have completed at least 1 spin

  @smoke
  Scenario: History returns list of played rounds
    When I request my game history
    Then I should see at least 1 round in the response
    And each round contains id, game_id, bet_amount, win_amount, and created_at

  Scenario: History supports pagination
    When I request history with page 1 and per_page 1
    Then the response contains at most 1 round
    And the response includes pagination metadata

  Scenario: Round detail returns full round data
    Given I know the ID of my latest round
    When I request the round detail by ID
    Then the response contains bet_amount and win_amount
    And the response contains the game_id

  Scenario: Round detail for non-existent ID returns 404
    When I request round detail for a random UUID
    Then I should receive a 404 status code

  Scenario: History summary returns aggregate statistics
    When I request the history summary
    Then the response contains total_rounds, total_wagered, and total_won
    And total_rounds is greater than 0

  Scenario: History requires authentication
    Given I am not authenticated
    When I attempt to access history without a token
    Then I should receive a 401 status code
