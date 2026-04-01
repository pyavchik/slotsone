package com.slotsone.qa.ui;

import com.slotsone.qa.ui.pages.GamePage;
import com.slotsone.qa.ui.pages.HistoryPage;
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
@Feature("Game History")
public class HistoryUiTest extends BaseUiTest {

    private HistoryPage historyPage;

    @BeforeClass
    public void loginSpinAndOpenHistory() {
        // Fresh browser for clean state
        com.codeborne.selenide.Selenide.closeWebDriver();

        String email = "histui_" + UUID.randomUUID().toString().substring(0, 8) + "@slotsone.com";
        LoginPage loginPage = new LoginPage().openRegister();
        LobbyPage lobby = loginPage.registerAs(email, "HistUi123!");
        lobby.waitForLoad();

        // Play a spin
        GamePage game = lobby.selectFirstGame();
        game.verifyCanvasLoaded();
        game.spinAndWait();
        game.goBackToLobby().waitForLoad();

        // Open history via direct navigation
        historyPage = new HistoryPage().open();
        historyPage.waitForLoad();
    }

    @Test(description = "History page renders with table", priority = 1)
    @Severity(SeverityLevel.BLOCKER)
    @Story("History Display")
    public void testHistoryPageRendered() {
        historyPage.verifyTableDisplayed();
        assertThat(historyPage.isDisplayed()).isTrue();
    }

    @Test(description = "History shows at least 1 round after playing", priority = 2)
    @Severity(SeverityLevel.CRITICAL)
    @Story("History Display")
    public void testHistoryHasRounds() {
        historyPage.verifyRoundCount(1);
    }

    @Test(description = "Summary cards show wagered and won totals", priority = 3)
    @Severity(SeverityLevel.NORMAL)
    @Story("Summary Stats")
    public void testSummaryCardsDisplayed() {
        historyPage.verifySummaryCards();
        String wagered = historyPage.getTotalWagered();
        assertThat(wagered).isNotBlank();
    }

    @Test(description = "Clicking a round row navigates to round detail", priority = 10)
    @Severity(SeverityLevel.CRITICAL)
    @Story("Round Detail")
    public void testClickRoundNavigatesToDetail() {
        historyPage.clickRound(0);
        // Wait for SPA navigation — URL should change to /round/<uuid>
        com.codeborne.selenide.Selenide.Wait()
                .withTimeout(java.time.Duration.ofSeconds(10))
                .until(d -> d.getCurrentUrl().contains("/round/"));
    }
}
