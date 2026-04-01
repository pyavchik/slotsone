package com.slotsone.qa.ui.pages;

import com.codeborne.selenide.ElementsCollection;
import com.codeborne.selenide.SelenideElement;
import io.qameta.allure.Step;

import static com.codeborne.selenide.CollectionCondition.sizeGreaterThan;
import static com.codeborne.selenide.Condition.*;
import static com.codeborne.selenide.Selenide.*;

public class LobbyPage {

    private final SelenideElement lobbyContainer = $(".lobby-page");
    private final ElementsCollection gameCards = $$(".game-card");
    private final SelenideElement balanceDisplay = $(".lobby-balance-value");
    private final SelenideElement userMenuButton = $(".lobby-user-btn");

    @Step("Open lobby page")
    public LobbyPage open() {
        com.codeborne.selenide.Selenide.open("/slots");
        return this;
    }

    @Step("Wait for lobby to load")
    public LobbyPage waitForLoad() {
        lobbyContainer.shouldBe(visible);
        gameCards.shouldHave(sizeGreaterThan(0));
        return this;
    }

    @Step("Verify at least {count} games are displayed")
    public LobbyPage verifyGameCount(int count) {
        gameCards.shouldHave(sizeGreaterThan(count - 1));
        return this;
    }

    @Step("Click on game card: {gameName}")
    public GamePage selectGame(String gameName) {
        $x(String.format("//div[contains(@class,'game-card')]//h3[contains(text(),'%s')]", gameName))
                .shouldBe(visible)
                .closest(".game-card")
                .click();
        return new GamePage();
    }

    @Step("Click on first available game card")
    public GamePage selectFirstGame() {
        $(".game-card[data-available='true']").shouldBe(visible).click();
        return new GamePage();
    }

    @Step("Get displayed balance text")
    public String getBalance() {
        return balanceDisplay.shouldBe(visible).getText();
    }

    public boolean isDisplayed() {
        return lobbyContainer.isDisplayed();
    }

    public int getGameCardCount() {
        return gameCards.size();
    }
}
