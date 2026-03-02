import { backendPool } from "./backend-db";

// --- Helpers ---

function centsToFixed(cents: string | number | bigint): string {
  return (Number(cents) / 100).toFixed(2);
}

function isBackendAvailable(): boolean {
  return backendPool !== null;
}

const EMPTY_PAGINATION = (page: number, pageSize: number) => ({
  page,
  pageSize,
  total: 0,
  totalPages: 0,
});

// Whitelist of allowed sort columns to prevent SQL injection
const PLAYER_SORT_COLUMNS: Record<string, string> = {
  registeredAt: "u.created_at",
  email: "u.email",
  balanceReal: "w.balance_cents",
  totalWagered: "total_wagered",
  totalWon: "total_won",
};

const TRANSACTION_SORT_COLUMNS: Record<string, string> = {
  createdAt: "t.created_at",
  amount: "t.amount_cents",
  type: "t.type",
};

// --- Players ---

export interface PlayerListOptions {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export async function getPlayers(opts: PlayerListOptions) {
  if (!isBackendAvailable()) {
    return { data: [], pagination: EMPTY_PAGINATION(opts.page, opts.pageSize) };
  }
  const { page, pageSize, search, sortBy = "registeredAt", sortDir = "desc" } = opts;
  const offset = (page - 1) * pageSize;
  const params: unknown[] = [];
  let whereClause = "";

  if (search) {
    params.push(`%${search}%`);
    whereClause = `WHERE u.email ILIKE $${params.length}`;
  }

  const orderCol = PLAYER_SORT_COLUMNS[sortBy] || "u.created_at";
  const dir = sortDir === "asc" ? "ASC" : "DESC";

  const query = `
    SELECT
      u.id,
      u.email,
      u.created_at,
      COALESCE(w.balance_cents, 0) AS balance_cents,
      COALESCE(agg.total_wagered, 0) AS total_wagered,
      COALESCE(agg.total_won, 0) AS total_won
    FROM users u
    LEFT JOIN wallets w ON w.user_id = u.id
    LEFT JOIN (
      SELECT user_id,
             SUM(bet_cents) AS total_wagered,
             SUM(win_cents) AS total_won
      FROM game_rounds
      GROUP BY user_id
    ) agg ON agg.user_id = u.id
    ${whereClause}
    ORDER BY ${orderCol} ${dir}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  params.push(pageSize, offset);

  const [dataResult, countResult] = await Promise.all([
    backendPool!.query(query, params),
    backendPool!.query(
      `SELECT COUNT(*)::int AS total FROM users u ${whereClause}`,
      search ? [`%${search}%`] : []
    ),
  ]);

  const total: number = countResult.rows[0].total;

  return {
    data: dataResult.rows.map((r) => ({
      id: r.id,
      email: r.email,
      username: r.email,
      firstName: null,
      lastName: null,
      status: "ACTIVE",
      role: "PLAYER",
      balanceReal: centsToFixed(r.balance_cents),
      balanceBonus: "0.00",
      totalDeposited: "0.00",
      totalWithdrawn: "0.00",
      totalWagered: centsToFixed(r.total_wagered),
      totalWon: centsToFixed(r.total_won),
      registeredAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.created_at).toISOString(),
      lastLoginAt: null,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

// --- Single Player ---

export async function getPlayerById(id: string) {
  if (!isBackendAvailable()) return null;
  const { rows } = await backendPool!.query(
    `
    SELECT
      u.id,
      u.email,
      u.created_at,
      COALESCE(w.balance_cents, 0) AS balance_cents,
      COALESCE(agg.total_wagered, 0) AS total_wagered,
      COALESCE(agg.total_won, 0) AS total_won
    FROM users u
    LEFT JOIN wallets w ON w.user_id = u.id
    LEFT JOIN (
      SELECT user_id,
             SUM(bet_cents) AS total_wagered,
             SUM(win_cents) AS total_won
      FROM game_rounds
      WHERE user_id = $1
      GROUP BY user_id
    ) agg ON agg.user_id = u.id
    WHERE u.id = $1
    `,
    [id]
  );

  if (rows.length === 0) return null;

  const r = rows[0];
  return {
    id: r.id,
    email: r.email,
    username: r.email,
    firstName: null,
    lastName: null,
    status: "ACTIVE",
    role: "PLAYER",
    balanceReal: centsToFixed(r.balance_cents),
    balanceBonus: "0.00",
    currency: "USD",
    country: null,
    kycVerified: false,
    riskLevel: "LOW",
    totalDeposited: "0.00",
    totalWithdrawn: "0.00",
    totalWagered: centsToFixed(r.total_wagered),
    totalWon: centsToFixed(r.total_won),
    tags: "[]",
    registeredAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.created_at).toISOString(),
    lastLoginAt: null,
  };
}

// --- Player Transactions ---

export async function getPlayerTransactions(userId: string, limit = 50) {
  if (!isBackendAvailable()) return [];
  const { rows } = await backendPool!.query(
    `
    SELECT
      t.id,
      t.round_id,
      t.user_id,
      t.type,
      t.amount_cents,
      t.balance_after_cents,
      t.created_at
    FROM transactions t
    WHERE t.user_id = $1
    ORDER BY t.created_at DESC
    LIMIT $2
    `,
    [userId, limit]
  );

  return rows.map((t) => {
    const amount = centsToFixed(t.amount_cents);
    const balanceAfter = centsToFixed(t.balance_after_cents);
    // Estimate balanceBefore from balanceAfter and amount
    const amountNum = Number(t.amount_cents);
    const afterNum = Number(t.balance_after_cents);
    const beforeNum = t.type === "bet" ? afterNum + amountNum : afterNum - amountNum;
    return {
      id: t.id,
      userId: t.user_id,
      type: t.type.toUpperCase(),
      amount,
      status: "COMPLETED",
      balanceBefore: centsToFixed(beforeNum),
      balanceAfter,
      currency: "USD",
      description: null,
      roundId: t.round_id,
      createdAt: new Date(t.created_at).toISOString(),
      updatedAt: new Date(t.created_at).toISOString(),
    };
  });
}

// --- Player Game Rounds ---

export async function getPlayerGameRounds(userId: string, limit = 50) {
  if (!isBackendAvailable()) return [];
  const { rows } = await backendPool!.query(
    `
    SELECT
      gr.id,
      gr.session_id,
      gr.game_id,
      gr.bet_cents,
      gr.win_cents,
      gr.reel_matrix,
      gr.created_at
    FROM game_rounds gr
    WHERE gr.user_id = $1
    ORDER BY gr.created_at DESC
    LIMIT $2
    `,
    [userId, limit]
  );

  return rows.map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    gameId: r.game_id,
    betAmount: centsToFixed(r.bet_cents),
    winAmount: centsToFixed(r.win_cents),
    roundData: r.reel_matrix,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

// --- All Transactions (for transactions page) ---

export interface TransactionListOptions {
  page: number;
  pageSize: number;
  type?: string;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export async function getAllTransactions(opts: TransactionListOptions) {
  if (!isBackendAvailable()) {
    return { data: [], pagination: EMPTY_PAGINATION(opts.page, opts.pageSize) };
  }
  const { page, pageSize, type, search, sortBy = "createdAt", sortDir = "desc" } = opts;
  const offset = (page - 1) * pageSize;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (type) {
    params.push(type.toLowerCase());
    conditions.push(`t.type = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`u.email ILIKE $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderCol = TRANSACTION_SORT_COLUMNS[sortBy] || "t.created_at";
  const dir = sortDir === "asc" ? "ASC" : "DESC";

  const dataQuery = `
    SELECT
      t.id,
      t.user_id,
      u.email,
      t.type,
      t.amount_cents,
      t.balance_after_cents,
      t.created_at
    FROM transactions t
    JOIN users u ON u.id = t.user_id
    ${whereClause}
    ORDER BY ${orderCol} ${dir}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  const dataParams = [...params, pageSize, offset];

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM transactions t
    JOIN users u ON u.id = t.user_id
    ${whereClause}
  `;

  const [dataResult, countResult] = await Promise.all([
    backendPool!.query(dataQuery, dataParams),
    backendPool!.query(countQuery, params),
  ]);

  const total: number = countResult.rows[0].total;

  return {
    data: dataResult.rows.map((t) => {
      const amountNum = Number(t.amount_cents);
      const afterNum = Number(t.balance_after_cents);
      const beforeNum = t.type === "bet" ? afterNum + amountNum : afterNum - amountNum;
      return {
        id: t.id,
        userId: t.user_id,
        username: t.email,
        email: t.email,
        type: t.type.toUpperCase(),
        amount: centsToFixed(t.amount_cents),
        status: "COMPLETED",
        balanceBefore: centsToFixed(beforeNum),
        balanceAfter: centsToFixed(t.balance_after_cents),
        currency: "USD",
        description: null,
        createdAt: new Date(t.created_at).toISOString(),
      };
    }),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

// --- Dashboard KPIs ---

export async function getDashboardKPIs() {
  if (!isBackendAvailable()) {
    return {
      totalPlayers: 0,
      activePlayers: 0,
      betTotal: 0,
      winTotal: 0,
      ggr: 0,
      pendingKYC: 0,
      highRiskPlayers: 0,
      recentTransactions: [],
      topGames: [],
      revenueData: [],
    };
  }

  const pool = backendPool!;
  const [
    playersResult,
    betsResult,
    winsResult,
    recentLargeResult,
    topGamesResult,
    dailyRevenueResult,
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total FROM users`),
    pool.query(
      `SELECT COALESCE(SUM(amount_cents), 0) AS total FROM transactions WHERE type = 'bet'`
    ),
    pool.query(
      `SELECT COALESCE(SUM(amount_cents), 0) AS total FROM transactions WHERE type = 'win'`
    ),
    pool.query(`
      SELECT t.id, u.email, t.type, t.amount_cents, t.created_at
      FROM transactions t
      JOIN users u ON u.id = t.user_id
      WHERE t.amount_cents >= 100000
      ORDER BY t.created_at DESC
      LIMIT 10
    `),
    pool.query(`
      SELECT
        game_id,
        SUM(bet_cents) AS total_bets,
        SUM(win_cents) AS total_wins,
        COUNT(*)::int AS rounds
      FROM game_rounds
      GROUP BY game_id
      ORDER BY total_bets DESC
      LIMIT 8
    `),
    pool.query(`
      SELECT
        DATE(created_at) AS date,
        SUM(CASE WHEN type = 'bet' THEN amount_cents ELSE 0 END) AS bets,
        SUM(CASE WHEN type = 'win' THEN amount_cents ELSE 0 END) AS wins
      FROM transactions
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `),
  ]);

  const totalPlayers = playersResult.rows[0].total;
  const betTotal = Number(betsResult.rows[0].total) / 100;
  const winTotal = Number(winsResult.rows[0].total) / 100;
  const ggr = betTotal - winTotal;

  const recentTransactions = recentLargeResult.rows.map((t) => ({
    id: t.id,
    username: t.email,
    type: t.type.toUpperCase(),
    amount: Number(t.amount_cents) / 100,
    status: "COMPLETED",
    createdAt: new Date(t.created_at).toISOString(),
  }));

  const topGames = topGamesResult.rows.map((g) => ({
    name: g.game_id,
    bets: Number(g.total_bets) / 100,
    wins: Number(g.total_wins) / 100,
    rounds: g.rounds,
    ggr: (Number(g.total_bets) - Number(g.total_wins)) / 100,
  }));

  const revenueData = dailyRevenueResult.rows.map((row) => ({
    date: new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    bets: Number(row.bets) / 100,
    wins: Number(row.wins) / 100,
    deposits: 0,
    ggr: (Number(row.bets) - Number(row.wins)) / 100,
  }));

  return {
    totalPlayers,
    activePlayers: totalPlayers, // backend has no status concept
    betTotal,
    winTotal,
    ggr,
    pendingKYC: 0,
    highRiskPlayers: 0,
    recentTransactions,
    topGames,
    revenueData,
  };
}

// --- Reports ---

export async function getFinancialReport(days: number) {
  if (!isBackendAvailable()) return { summary: [], daily: [] };
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [summaryResult, dailyResult] = await Promise.all([
    backendPool!.query(
      `
      SELECT type, COALESCE(SUM(amount_cents), 0) AS total, COUNT(*)::int AS count
      FROM transactions
      WHERE created_at >= $1
      GROUP BY type
      `,
      [startDate]
    ),
    backendPool!.query(
      `
      SELECT
        DATE(created_at) AS date,
        type,
        COALESCE(SUM(amount_cents), 0) AS total,
        COUNT(*)::int AS count
      FROM transactions
      WHERE created_at >= $1
      GROUP BY DATE(created_at), type
      ORDER BY date ASC
      `,
      [startDate]
    ),
  ]);

  return {
    summary: summaryResult.rows.map((s) => ({
      type: s.type.toUpperCase(),
      total: centsToFixed(s.total),
      count: s.count,
    })),
    daily: dailyResult.rows.map((d) => ({
      date: new Date(d.date).toISOString().split("T")[0],
      type: d.type.toUpperCase(),
      total: centsToFixed(d.total),
      count: d.count,
    })),
  };
}

export async function getPlayersReport(days: number) {
  if (!isBackendAvailable()) {
    return {
      newPlayers: [],
      statusBreakdown: [{ status: "ACTIVE", count: 0 }],
      countryBreakdown: [],
    };
  }
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [newPlayersResult] = await Promise.all([
    backendPool!.query(
      `
      SELECT DATE(created_at) AS date, COUNT(*)::int AS count
      FROM users
      WHERE created_at >= $1
      GROUP BY DATE(created_at)
      ORDER BY date ASC
      `,
      [startDate]
    ),
  ]);

  return {
    newPlayers: newPlayersResult.rows.map((d) => ({
      date: new Date(d.date).toISOString().split("T")[0],
      count: d.count,
    })),
    statusBreakdown: [{ status: "ACTIVE", count: 0 }],
    countryBreakdown: [],
  };
}

export async function getGamesReport(days: number) {
  if (!isBackendAvailable()) return { games: [] };
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { rows } = await backendPool!.query(
    `
    SELECT
      game_id,
      COUNT(*)::int AS rounds,
      COALESCE(SUM(bet_cents), 0) AS total_bets,
      COALESCE(SUM(win_cents), 0) AS total_wins
    FROM game_rounds
    WHERE created_at >= $1
    GROUP BY game_id
    ORDER BY total_bets DESC
    LIMIT 50
    `,
    [startDate]
  );

  return {
    games: rows.map((gs) => {
      const bets = Number(gs.total_bets) / 100;
      const wins = Number(gs.total_wins) / 100;
      return {
        gameId: gs.game_id,
        name: gs.game_id,
        provider: "-",
        category: "-",
        rtp: "-",
        rounds: gs.rounds,
        totalBets: bets.toFixed(2),
        totalWins: wins.toFixed(2),
        ggr: (bets - wins).toFixed(2),
        margin: bets > 0 ? (((bets - wins) / bets) * 100).toFixed(2) : "0.00",
      };
    }),
  };
}

// --- Games (aggregated from game_rounds) ---

export interface GameListOptions {
  page: number;
  pageSize: number;
  search?: string;
}

export async function getGames(opts: GameListOptions) {
  if (!isBackendAvailable()) {
    return { data: [], pagination: EMPTY_PAGINATION(opts.page, opts.pageSize) };
  }
  const { page, pageSize, search } = opts;
  const offset = (page - 1) * pageSize;
  const params: unknown[] = [];
  let havingClause = "";

  if (search) {
    params.push(`%${search}%`);
    havingClause = `HAVING game_id ILIKE $${params.length}`;
  }

  const dataQuery = `
    SELECT
      game_id,
      COUNT(*)::int AS rounds,
      COUNT(DISTINCT session_id)::int AS sessions,
      COALESCE(SUM(bet_cents), 0) AS total_bets,
      COALESCE(SUM(win_cents), 0) AS total_wins,
      MIN(created_at) AS first_played
    FROM game_rounds
    GROUP BY game_id
    ${havingClause}
    ORDER BY total_bets DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  params.push(pageSize, offset);

  const countParams: unknown[] = [];
  let countHaving = "";
  if (search) {
    countParams.push(`%${search}%`);
    countHaving = `HAVING game_id ILIKE $1`;
  }

  const countQuery = `
    SELECT COUNT(*)::int AS total FROM (
      SELECT game_id FROM game_rounds GROUP BY game_id ${countHaving}
    ) sub
  `;

  const [dataResult, countResult] = await Promise.all([
    backendPool!.query(dataQuery, params),
    backendPool!.query(countQuery, countParams),
  ]);

  const total: number = countResult.rows[0].total;

  return {
    data: dataResult.rows.map((g) => {
      const bets = Number(g.total_bets) / 100;
      const wins = Number(g.total_wins) / 100;
      return {
        id: g.game_id,
        slug: g.game_id,
        name: g.game_id,
        provider: "-",
        category: "SLOTS",
        rtp: "-",
        isActive: true,
        isFeatured: false,
        minBet: "0.00",
        maxBet: "0.00",
        totalRounds: g.rounds,
        totalSessions: g.sessions,
        totalBets: bets.toFixed(2),
        totalWins: wins.toFixed(2),
        ggr: (bets - wins).toFixed(2),
        createdAt: new Date(g.first_played).toISOString(),
      };
    }),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
