@auth @smoke
Feature: User Authentication
  As a player I want to register and login
  so that I can access the slot games and my game history.

  Background:
    Given the SlotsOne application is running

  Scenario: Successful registration with valid credentials
    Given I am on the registration page
    When I register with a unique email and password "TestPass123!"
    And I confirm I am over 18
    And I submit the form
    Then I should be redirected to the lobby
    And I should see at least 1 game card

  Scenario: Successful login after registration
    Given I have a registered account
    When I login with my credentials
    Then I should be redirected to the lobby

  Scenario: Login with invalid credentials shows error
    Given I am on the login page
    When I enter email "nonexistent@test.com" and password "WrongPass!"
    And I submit the form
    Then I should see an error message

  Scenario: Registration without age confirmation fails
    Given I am on the registration page
    When I register with a unique email and password "TestPass123!"
    And I do not confirm my age
    And I submit the form
    Then the submit button should be disabled or show an error

  Scenario Outline: Registration validates input formats
    Given I am on the registration page
    When I enter email "<email>" and password "<password>"
    And I confirm I am over 18
    And I submit the form
    Then I should see an error message

    Examples:
      | email              | password   |
      | not-an-email       | ValidPass1!|
      | valid@email.com    | short      |
      |                    | ValidPass1!|
      | valid@email.com    |            |
