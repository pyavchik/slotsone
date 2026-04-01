package com.slotsone.qa.ui.pages;

import com.codeborne.selenide.ElementsCollection;
import com.codeborne.selenide.SelenideElement;
import io.qameta.allure.Step;

import static com.codeborne.selenide.CollectionCondition.sizeGreaterThan;
import static com.codeborne.selenide.Condition.*;
import static com.codeborne.selenide.Selenide.*;

public class HistoryPage {

    private final SelenideElement pageContainer = $(".gh-page");
    private final SelenideElement historyTable = $(".gh-table");
    private final ElementsCollection tableRows = $$(".gh-table tbody tr");
    private final SelenideElement summarySection = $(".gh-summary");
    private final ElementsCollection summaryCards = $$(".gh-summary-card");
    private final SelenideElement filtersToggle = $(".gh-filters-toggle");

    @Step("Open history page")
    public HistoryPage open() {
        com.codeborne.selenide.Selenide.open("/history");
        return this;
    }

    @Step("Wait for history to load")
    public HistoryPage waitForLoad() {
        pageContainer.shouldBe(visible);
        return this;
    }

    @Step("Verify history table is displayed")
    public HistoryPage verifyTableDisplayed() {
        historyTable.shouldBe(visible);
        return this;
    }

    @Step("Verify at least {count} rounds in history")
    public HistoryPage verifyRoundCount(int count) {
        tableRows.shouldHave(sizeGreaterThan(count - 1));
        return this;
    }

    @Step("Click on round detail link at index {index}")
    public void clickRound(int index) {
        tableRows.get(index).$(".gh-detail-link").shouldBe(visible).click();
    }

    @Step("Verify summary cards are displayed")
    public HistoryPage verifySummaryCards() {
        summarySection.shouldBe(visible);
        summaryCards.shouldHave(sizeGreaterThan(0));
        return this;
    }

    @Step("Get total wagered text")
    public String getTotalWagered() {
        return $$(".gh-summary-card").get(1).$(".gh-summary-value").getText();
    }

    @Step("Get total won text")
    public String getTotalWon() {
        return $$(".gh-summary-card").get(2).$(".gh-summary-value").getText();
    }

    @Step("Toggle filters panel")
    public HistoryPage toggleFilters() {
        filtersToggle.shouldBe(visible).click();
        return this;
    }

    public int getRowCount() {
        return tableRows.size();
    }

    public boolean isDisplayed() {
        return pageContainer.isDisplayed();
    }
}
