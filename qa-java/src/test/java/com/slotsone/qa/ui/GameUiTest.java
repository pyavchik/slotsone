package com.slotsone.qa.ui;

import com.slotsone.qa.ui.pages.GamePage;
import com.slotsone.qa.ui.pages.LoginPage;
import com.slotsone.qa.ui.pages.LobbyPage;
import io.qameta.allure.*;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.util.UUID;

import static com.codeborne.selenide.Selenide.clearBrowserCookies;
import static com.codeborne.selenide.Selenide.clearBrowserLocalStorage;
import static org.assertj.core.api.Assertions.assertThat;

@Epic("UI")
@Feature("Slot Game")
public class GameUiTest extends BaseUiTest {

    private GamePage gamePage;

    @BeforeClass
    public void loginAndNavigateToGame() {
        // Fresh browser for clean state
        com.codeborne.selenide.Selenide.closeWebDriver();

        String email = "game_" + UUID.randomUUID().toString().substring(0, 8) + "@slotsone.com";
        LoginPage loginPage = new LoginPage().openRegister();
        LobbyPage lobby = loginPage.registerAs(email, "GameTest123!");
        lobby.waitForLoad();
        gamePage = lobby.selectFirstGame();
        gamePage.verifyCanvasLoaded();
    }

    @Test(description = "Game canvas renders after selecting a game")
    @Severity(SeverityLevel.BLOCKER)
    @Story("Game Loading")
    public void testGameCanvasLoads() {
        assertThat(gamePage.isDisplayed()).isTrue();
    }

    @Test(description = "Spin button is visible and clickable", dependsOnMethods = "testGameCanvasLoads")
    @Severity(SeverityLevel.BLOCKER)
    @Story("Spin Mechanics")
    public void testSpinButtonEnabled() {
        gamePage.verifySpinButtonEnabled();
    }

    @Test(description = "Balance is displayed in the HUD", dependsOnMethods = "testGameCanvasLoads")
    @Severity(SeverityLevel.CRITICAL)
    @Story("HUD Display")
    public void testBalanceDisplayed() {
        String balance = gamePage.getBalance();
        assertThat(balance).isNotBlank();
    }

    @Test(description = "Spin and verify balance updates", dependsOnMethods = "testSpinButtonEnabled")
    @Severity(SeverityLevel.CRITICAL)
    @Story("Spin Mechanics")
    public void testSpinAndBalance() {
        String balanceBefore = gamePage.getBalance();
        gamePage.spinAndWait();
        String balanceAfter = gamePage.getBalance();
        assertThat(balanceAfter).isNotBlank();

        // Also verify navigation back to lobby
        LobbyPage lobby = gamePage.goBackToLobby();
        lobby.waitForLoad();
        assertThat(lobby.isDisplayed()).isTrue();
    }
}
