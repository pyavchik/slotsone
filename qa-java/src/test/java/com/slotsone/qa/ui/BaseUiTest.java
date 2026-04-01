package com.slotsone.qa.ui;

import com.codeborne.selenide.Configuration;
import com.codeborne.selenide.logevents.SelenideLogger;
import com.slotsone.qa.config.TestConfig;
import io.qameta.allure.selenide.AllureSelenide;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.BeforeSuite;

import static com.codeborne.selenide.Selenide.closeWebDriver;

public abstract class BaseUiTest {

    protected static final TestConfig config = TestConfig.getInstance();

    @BeforeSuite(alwaysRun = true)
    public void setupAllureListener() {
        SelenideLogger.addListener("AllureSelenide",
                new AllureSelenide()
                        .screenshots(true)
                        .savePageSource(true));
    }

    @BeforeClass(alwaysRun = true)
    public void setupBrowser() {
        Configuration.baseUrl = config.baseUrl();
        Configuration.browser = config.browser();
        Configuration.browserSize = config.browserSize();
        Configuration.headless = config.browserHeadless();
        Configuration.timeout = config.defaultTimeout();
        Configuration.pageLoadTimeout = 30_000;

        if (config.selenoidEnabled()) {
            Configuration.remote = config.selenoidUrl();

            DesiredCapabilities capabilities = new DesiredCapabilities();
            capabilities.setCapability("selenoid:options", new java.util.HashMap<String, Object>() {{
                put("enableVNC", config.selenoidVncEnabled());
                put("enableVideo", config.selenoidVideoEnabled());
                put("enableLog", true);
            }});
            Configuration.browserCapabilities = capabilities;
        } else {
            // Local Chrome: add required flags for headless/sandbox
            ChromeOptions chromeOptions = new ChromeOptions();
            chromeOptions.addArguments("--no-sandbox");
            chromeOptions.addArguments("--disable-dev-shm-usage");
            Configuration.browserCapabilities = new DesiredCapabilities();
            Configuration.browserCapabilities.setCapability(ChromeOptions.CAPABILITY, chromeOptions);
        }
    }

    @AfterClass(alwaysRun = true)
    public void tearDown() {
        closeWebDriver();
    }
}
