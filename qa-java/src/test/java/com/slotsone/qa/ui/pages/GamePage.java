package com.slotsone.qa.ui.pages;

import com.codeborne.selenide.SelenideElement;
import io.qameta.allure.Step;

import static com.codeborne.selenide.Condition.*;
import static com.codeborne.selenide.Selenide.$;
import static com.codeborne.selenide.Selenide.$x;

public class GamePage {

    private final SelenideElement slotsShell = $(".slots-shell");
    private final SelenideElement spinButton = $("button.spin-button");
    private final SelenideElement balanceDisplay = $(".hud-card-left .hud-value-main");
    private final SelenideElement betDisplay = $(".hud-card-right .hud-value-main");
    private final SelenideElement gameCanvas = $(".slots-shell canvas");
    private final SelenideElement lobbyButton = $x("//button[contains(@class,'hud-action-btn') and @aria-label='Back to Lobby']");
    private final SelenideElement historyButton = $x("//button[contains(@class,'hud-action-btn') and @aria-label='Game History']");

    @Step("Verify game canvas is loaded")
    public GamePage verifyCanvasLoaded() {
        // PixiJS canvas + game init may take long on slow connections / headless
        // Wait for the spin button which only appears after full game load
        spinButton.shouldBe(visible, java.time.Duration.ofSeconds(120));
        return this;
    }

    @Step("Verify spin button is visible and enabled")
    public GamePage verifySpinButtonEnabled() {
        spinButton.shouldBe(visible, enabled);
        return this;
    }

    @Step("Click spin button")
    public GamePage clickSpin() {
        spinButton.shouldBe(enabled).click();
        return this;
    }

    @Step("Wait for spin animation to complete")
    public GamePage waitForSpinComplete() {
        // Spin button gets re-enabled after animation; animation can be slow in headless
        spinButton.shouldBe(enabled, java.time.Duration.ofSeconds(60));
        return this;
    }

    @Step("Get current balance text")
    public String getBalance() {
        return balanceDisplay.shouldBe(visible).getText();
    }

    @Step("Get current bet display text")
    public String getBetAmount() {
        return betDisplay.shouldBe(visible).getText();
    }

    @Step("Select quick bet level")
    public GamePage selectQuickBet(String value) {
        $x(String.format("//button[contains(@class,'bet-quick') and text()='%s']", value))
                .shouldBe(visible, enabled).click();
        return this;
    }

    @Step("Navigate back to lobby")
    public LobbyPage goBackToLobby() {
        lobbyButton.shouldBe(visible).click();
        return new LobbyPage();
    }

    @Step("Navigate to history")
    public HistoryPage goToHistory() {
        historyButton.shouldBe(visible).click();
        return new HistoryPage();
    }

    @Step("Perform spin and wait for result")
    public GamePage spinAndWait() {
        clickSpin();
        waitForSpinComplete();
        return this;
    }

    public boolean isDisplayed() {
        return slotsShell.isDisplayed();
    }
}
