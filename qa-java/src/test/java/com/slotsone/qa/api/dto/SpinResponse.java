package com.slotsone.qa.api.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class SpinResponse {

    @JsonProperty("spin_id")
    private String spinId;

    @JsonProperty("reels")
    private List<List<Integer>> reels;

    @JsonProperty("win_amount")
    private double winAmount;

    @JsonProperty("balance")
    private double balance;

    @JsonProperty("paylines")
    private List<Object> paylines;

    @JsonProperty("total_win")
    private double totalWin;

    public String getSpinId() { return spinId; }
    public List<List<Integer>> getReels() { return reels; }
    public double getWinAmount() { return winAmount; }
    public double getBalance() { return balance; }
    public List<Object> getPaylines() { return paylines; }
    public double getTotalWin() { return totalWin; }
}
