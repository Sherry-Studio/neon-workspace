import type {
  BlogPost,
  Game,
  NotificationRecord,
  Role,
  Score,
  User,
  UserStatus,
} from "@/lib/types";

/**
 * In-memory mock data store for the NEON ARCADE admin panel.
 *
 * This exists ONLY so the admin runs end-to-end before `Neon-Arcade-Backend`
 * exposes its REST API. It is not a persistence layer: data resets when the dev
 * server restarts. Swap `NEXT_PUBLIC_API_BASE_URL` to the real backend to retire it.
 */

export interface MockDB {
  users: User[];
  games: Game[];
  scores: Score[];
  blog: BlogPost[];
  notifications: NotificationRecord[];
  credentials: Record<string, { password: string; userId: string }>;
  seededAt: string;
}

const g = globalThis as unknown as { __NA_MOCK_DB__?: MockDB };

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400_000).toISOString();
}
function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const FIRST = [
  "Nova", "Rex", "Kira", "Jax", "Luna", "Zane", "Mika", "Orion", "Vera", "Cy",
  "Neo", "Ada", "Kai", "Riven", "Echo", "Pax", "Iris", "Dex", "Nyx", "Lio",
];
const LAST = [
  "Vale", "Cross", "Reyes", "Stone", "Wolfe", "Kane", "Frost", "Vex", "Quill",
  "Marsh", "Drake", "Sol", "Bright", "Hale", "Nash", "Pike", "Ash", "Rhodes",
];

const GAME_SEED: Array<Partial<Game> & { title: string }> = [
  {
    title: "Neon Runner",
    category: "Platformer",
    shortDescription: "Sprint through a collapsing neon skyline.",
    status: "PUBLISHED",
    featured: true,
    plays: 48213,
  },
  {
    title: "Neon Space Shooter",
    category: "Shooter",
    shortDescription: "Twin-stick bullet hell in deep synthwave space.",
    status: "PUBLISHED",
    featured: true,
    plays: 39187,
  },
  {
    title: "Neon Drift Racer",
    category: "Racing",
    shortDescription: "Hand-brake your way through rain-slick arcologies.",
    status: "PUBLISHED",
    featured: false,
    plays: 27540,
  },
  {
    title: "Grid Wars",
    category: "Arcade",
    shortDescription: "Reclaim the grid one glowing tile at a time.",
    status: "DRAFT",
    featured: false,
    plays: 0,
  },
  {
    title: "Pixel Blaster",
    category: "Action",
    shortDescription: "Retro run-and-gun with a modern combo system.",
    status: "ARCHIVED",
    featured: false,
    plays: 8123,
  },
];

const BLOG_SEED: Array<Partial<BlogPost> & { title: string }> = [
  {
    title: "How Browser Gaming Changed the Internet",
    category: "Game History",
    status: "PUBLISHED",
    tags: ["web", "history", "flash"],
    views: 12894,
  },
  {
    title: "The Golden Age of Arcade Machines",
    category: "Gaming Culture",
    status: "PUBLISHED",
    tags: ["arcade", "retro"],
    views: 9420,
  },
  {
    title: "Building Neon Drift Racer's Handling Model",
    category: "Game Development",
    status: "PUBLISHED",
    tags: ["devlog", "physics"],
    views: 4133,
  },
  {
    title: "Patch 1.4 — What's Coming to Neon Runner",
    category: "Gaming News",
    status: "DRAFT",
    tags: ["patch-notes"],
    views: 0,
  },
  {
    title: "Five Habits of High-Score Chasers",
    category: "Tips & Tricks",
    status: "PUBLISHED",
    tags: ["guide", "leaderboard"],
    views: 2277,
  },
];

function lorem(paras: number): string {
  const p =
    "The arcade never really closed — it just moved into the browser. What follows is a look at how a generation of players kept the lights on, one quarter and one URL at a time.";
  return Array.from({ length: paras }, () => p).join("\n\n");
}

function buildSeed(): MockDB {
  const superEmail = process.env.MOCK_SUPER_ADMIN_EMAIL || "admin@neonarcade.dev";
  const superPassword =
    process.env.MOCK_SUPER_ADMIN_PASSWORD || "ChangeMe_Str0ng!Pass";

  const users: User[] = [];
  const credentials: MockDB["credentials"] = {};

  // Baked-in staff accounts.
  const staff: Array<{ username: string; email: string; role: Role; pw: string }> = [
    { username: "neonadmin", email: superEmail, role: "SUPER_ADMIN", pw: superPassword },
    { username: "editor_kira", email: "kira@neonarcade.dev", role: "ADMIN", pw: "Admin_Str0ng!Pass" },
  ];
  staff.forEach((s, i) => {
    const id = `usr_staff_${i + 1}`;
    users.push({
      id,
      username: s.username,
      email: s.email,
      role: s.role,
      status: "ACTIVE",
      avatar: null,
      gamesPlayed: randInt(20, 120),
      totalScore: randInt(50_000, 400_000),
      highestScore: randInt(8_000, 40_000),
      achievements: ["Founder", "Curator"],
      createdAt: daysAgo(400 - i * 20),
      lastLoginAt: daysAgo(randInt(0, 3)),
    });
    credentials[s.email.toLowerCase()] = { password: s.pw, userId: id };
  });

  // Player accounts.
  const statuses: UserStatus[] = [
    "ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "SUSPENDED", "PENDING",
  ];
  for (let i = 0; i < 60; i++) {
    const first = rand(FIRST);
    const last = rand(LAST);
    const username = `${first}${last}${randInt(1, 99)}`.toLowerCase();
    const id = `usr_${String(i + 1).padStart(3, "0")}`;
    const created = daysAgo(randInt(1, 365));
    users.push({
      id,
      username,
      email: `${username}@players.neonarcade.dev`,
      role: "USER",
      status: rand(statuses),
      avatar: null,
      gamesPlayed: randInt(0, 300),
      totalScore: randInt(0, 600_000),
      highestScore: randInt(0, 55_000),
      achievements: rand([[], ["First Blood"], ["First Blood", "Combo x50"], ["Marathoner"]]),
      createdAt: created,
      lastLoginAt: Math.random() > 0.15 ? daysAgo(randInt(0, 40)) : null,
    });
  }

  const games: Game[] = GAME_SEED.map((seed, i) => {
    const now = daysAgo(randInt(30, 300));
    return {
      id: `game_${i + 1}`,
      title: seed.title,
      slug: seed.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      shortDescription: seed.shortDescription || "",
      fullDescription: `${seed.shortDescription}\n\n${lorem(2)}`,
      category: seed.category || "Arcade",
      thumbnail: null,
      banner: null,
      gameUrl: `https://play.neonarcade.dev/${seed.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      version: `1.${randInt(0, 6)}.${randInt(0, 9)}`,
      instructions: "Reach the highest score before the timer runs out.",
      controls: "Arrow keys / WASD to move. Space to boost.",
      featured: !!seed.featured,
      status: seed.status || "DRAFT",
      plays: seed.plays ?? 0,
      createdAt: now,
      updatedAt: daysAgo(randInt(0, 20)),
    };
  });

  const playableGames = games.filter((g2) => g2.status === "PUBLISHED");
  const players = users.filter((u) => u.role === "USER");
  const scores: Score[] = [];
  for (let i = 0; i < 240; i++) {
    const u = rand(players);
    const gm = rand(playableGames);
    scores.push({
      id: `score_${String(i + 1).padStart(4, "0")}`,
      userId: u.id,
      username: u.username,
      gameId: gm.id,
      gameTitle: gm.title,
      score: randInt(500, 60_000),
      suspicious: Math.random() > 0.94,
      createdAt: daysAgo(randInt(0, 120)),
    });
  }
  scores.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  const blog: BlogPost[] = BLOG_SEED.map((seed, i) => {
    const created = daysAgo(randInt(10, 200));
    const published = seed.status === "PUBLISHED";
    return {
      id: `blog_${i + 1}`,
      title: seed.title,
      slug: seed.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      excerpt:
        "A short look at the systems, history and habits behind the NEON ARCADE.",
      content: lorem(5),
      coverImage: null,
      category: seed.category || "Gaming News",
      tags: seed.tags || [],
      author: "NEONARCADE EDITORIAL",
      status: seed.status || "DRAFT",
      views: seed.views ?? 0,
      publishedAt: published ? created : null,
      createdAt: created,
      updatedAt: daysAgo(randInt(0, 9)),
    };
  });

  const notifTypes = ["SYSTEM", "GAME", "BLOG", "ACHIEVEMENT", "LEADERBOARD"] as const;
  const notifications: NotificationRecord[] = Array.from({ length: 16 }, (_, i) => {
    const audience = rand(["ONE_USER", "ONE_USER", "ALL_USERS", "MULTIPLE_USERS"] as const);
    const target = rand(players);
    return {
      id: `ntf_${String(i + 1).padStart(3, "0")}`,
      title: rand([
        "New game live: Neon Drift Racer",
        "You reached the top 10!",
        "Weekly maintenance window",
        "The Vault: new article published",
        "Achievement unlocked: Combo x50",
      ]),
      message:
        "Open the NEON ARCADE to see what changed. This notification was recorded in the database.",
      type: rand(notifTypes),
      audience,
      recipientId: audience === "ONE_USER" ? target.id : null,
      recipientLabel:
        audience === "ALL_USERS"
          ? "All users"
          : audience === "MULTIPLE_USERS"
            ? `${randInt(3, 25)} users`
            : target.username,
      link: null,
      gameId: null,
      blogId: null,
      read: Math.random() > 0.5,
      pushDelivered: false,
      recipientCount:
        audience === "ALL_USERS"
          ? players.length
          : audience === "MULTIPLE_USERS"
            ? randInt(3, 25)
            : 1,
      createdAt: daysAgo(randInt(0, 45)),
    };
  }).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return {
    users,
    games,
    scores,
    blog,
    notifications,
    credentials,
    seededAt: new Date().toISOString(),
  };
}

export function db(): MockDB {
  if (!g.__NA_MOCK_DB__) g.__NA_MOCK_DB__ = buildSeed();
  return g.__NA_MOCK_DB__;
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
