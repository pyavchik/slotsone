package com.slotsone.qa.api.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class ErrorResponse {

    @JsonProperty("error")
    private String error;

    @JsonProperty("code")
    private String code;

    public String getError() { return error; }
    public String getCode() { return code; }
}
