package com.slotsone.qa.config;

import org.aeonbits.owner.Config;
import org.aeonbits.owner.Config.Sources;
import org.aeonbits.owner.ConfigFactory;

@Sources({"system:properties", "system:env", "classpath:test.properties"})
public interface TestConfig extends Config {

    @Key("base.url")
    @DefaultValue("http://localhost:3000")
    String baseUrl();

    @Key("api.base.path")
    @DefaultValue("/api/v1")
    String apiBasePath();

    @Key("test.user.email")
    @DefaultValue("testuser@slotsone.com")
    String testUserEmail();

    @Key("test.user.password")
    @DefaultValue("TestPass123!")
    String testUserPassword();

    @Key("selenoid.enabled")
    @DefaultValue("false")
    boolean selenoidEnabled();

    @Key("selenoid.url")
    @DefaultValue("http://localhost:4444/wd/hub")
    String selenoidUrl();

    @Key("selenoid.video.enabled")
    @DefaultValue("true")
    boolean selenoidVideoEnabled();

    @Key("selenoid.vnc.enabled")
    @DefaultValue("true")
    boolean selenoidVncEnabled();

    @Key("browser")
    @DefaultValue("chrome")
    String browser();

    @Key("browser.size")
    @DefaultValue("1920x1080")
    String browserSize();

    @Key("browser.headless")
    @DefaultValue("true")
    boolean browserHeadless();

    @Key("timeout.default")
    @DefaultValue("10000")
    long defaultTimeout();

    @Key("timeout.api")
    @DefaultValue("5000")
    long apiTimeout();

    static TestConfig getInstance() {
        return ConfigFactory.create(TestConfig.class, System.getProperties(), System.getenv());
    }
}
