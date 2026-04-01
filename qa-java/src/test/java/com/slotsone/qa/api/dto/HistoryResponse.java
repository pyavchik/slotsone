package com.slotsone.qa.api.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class HistoryResponse {

    @JsonProperty("rounds")
    private List<Round> rounds;

    @JsonProperty("total")
    private int total;

    @JsonProperty("page")
    private int page;

    @JsonProperty("per_page")
    private int perPage;

    public List<Round> getRounds() { return rounds; }
    public int getTotal() { return total; }
    public int getPage() { return page; }
    public int getPerPage() { return perPage; }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Round {

        @JsonProperty("id")
        private String id;

        @JsonProperty("game_id")
        private String gameId;

        @JsonProperty("bet_amount")
        private double betAmount;

        @JsonProperty("win_amount")
        private double winAmount;

        @JsonProperty("created_at")
        private String createdAt;

        public String getId() { return id; }
        public String getGameId() { return gameId; }
        public double getBetAmount() { return betAmount; }
        public double getWinAmount() { return winAmount; }
        public String getCreatedAt() { return createdAt; }
    }
}
