import { BlogCategory, BlogStatus, GameCategory, GameStatus } from '../types';

/**
 * Initial catalogue. These are inserted by `npm run seed` but are NOT hardcoded
 * into the running app — after seeding they live in MongoDB and are fully
 * managed through the admin API.
 */
export const seedGames = [
  {
    title: 'Neon Runner',
    slug: 'neon-runner',
    shortDescription: 'Dash through neon-lit cityscapes in the endless runner that defined a generation of browser play.',
    description:
      'Neon Runner is a high-velocity endless runner set across the rooftops and undercities of a rain-slicked cyber metropolis. Chain perfect slides, wall-runs and jumps to build a multiplier, and outrun the collapse behind you.',
    category: GameCategory.ARCADE,
    status: GameStatus.PUBLISHED,
    featured: true,
    gameUrl: 'https://games.neonarcade.dev/neon-runner/index.html',
    version: '1.0.0',
    thumbnail: '/images/cyber-runner.jpg',
    banner: '/images/cyber-runner.jpg',
    genre: 'ACTION',
    tagline: 'Dash through neon-lit skylines.',
    gradient: 'linear-gradient(135deg, #0f1027 0%, #16213e 55%, #0f3460 100%)',
    instructions: 'Survive as long as possible. Distance and pickups build your score.',
    controls: ['Space / Up — Jump', 'Down — Slide', 'Left / Right — Switch lane'],
  },
  {
    title: 'Neon Space Shooter',
    slug: 'neon-space-shooter',
    shortDescription: 'Retro-inspired shoot-’em-up with modern bullet-hell energy.',
    description:
      'Pilot a prototype interceptor against endless waves of geometric invaders. Collect power cores to upgrade your spread, shield and lock-on drones, and push for a spot on the global board.',
    category: GameCategory.SHOOTER,
    status: GameStatus.PUBLISHED,
    featured: true,
    gameUrl: 'https://games.neonarcade.dev/neon-space-shooter/index.html',
    version: '1.0.0',
    thumbnail: '/images/pixel-blaster.jpg',
    banner: '/images/pixel-blaster.jpg',
    genre: 'ARCADE',
    tagline: 'Retro firepower, modern edge.',
    gradient: 'linear-gradient(135deg, #221a0f 0%, #2a1c10 55%, #170f0a 100%)',
    instructions: 'Destroy waves, dodge fire, grab power cores. One life, high stakes.',
    controls: ['Move — Arrow keys / WASD', 'Fire — Space (hold for auto)', 'Bomb — Shift'],
  },
  {
    title: 'Neon Drift Racer',
    slug: 'neon-drift-racer',
    shortDescription: 'Master the art of the drift on impossible neon circuits.',
    description:
      'Neon Drift Racer is a momentum-based racer where the fastest line is sideways. Bank drift charge through corners and unleash it on the straights, and hunt the ghost of the current record holder.',
    category: GameCategory.RACING,
    status: GameStatus.PUBLISHED,
    featured: true,
    gameUrl: 'https://games.neonarcade.dev/neon-drift-racer/index.html',
    version: '1.0.0',
    thumbnail: '/images/neon-drift.jpg',
    banner: '/images/neon-drift.jpg',
    genre: 'RACING',
    tagline: 'Own every corner.',
    gradient: 'linear-gradient(135deg, #241435 0%, #1a0a2e 55%, #16213e 100%)',
    instructions: 'Finish 3 laps as fast as possible. Drifting fills boost.',
    controls: ['Accelerate — Up / W', 'Brake / Drift — Down / S or Space', 'Steer — Left / Right'],
  },
];

export const seedAchievements = [
  {
    key: 'FIRST_GAME',
    title: 'First Game',
    description: 'Play your first game on NEON ARCADE.',
    icon: 'gamepad2',
    ruleType: 'FIRST_GAME' as const,
    threshold: 1,
  },
  {
    key: 'FIRST_WIN',
    title: 'On the Board',
    description: 'Record your first score.',
    icon: 'flag',
    ruleType: 'FIRST_WIN' as const,
    threshold: 0,
  },
  {
    key: 'HIGH_SCORE_10K',
    title: 'High Roller',
    description: 'Reach a single-run score of 10,000.',
    icon: 'trophy',
    ruleType: 'HIGH_SCORE' as const,
    threshold: 10_000,
  },
  {
    key: 'GAMES_10',
    title: 'Regular',
    description: 'Play 10 games.',
    icon: 'star',
    ruleType: 'GAMES_PLAYED' as const,
    threshold: 10,
  },
  {
    key: 'GAMES_100',
    title: 'Arcade Veteran',
    description: 'Play 100 games.',
    icon: 'crown',
    ruleType: 'GAMES_PLAYED' as const,
    threshold: 100,
  },
];

export const seedPosts = [
  {
    title: 'HOW BROWSER GAMING CHANGED THE INTERNET',
    slug: 'how-browser-gaming-changed-the-internet',
    category: BlogCategory.GAME_HISTORY,
    status: BlogStatus.PUBLISHED,
    readTime: '12 MIN READ',
    authorName: 'NEONARCADE EDITORIAL',
    excerpt:
      'From Flash games to WebGL — the untold story of how browser gaming shaped an entire generation of players and developers.',
    heroGradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    coverImage: '/images/article-browser-gaming.jpg',
    pullQuote:
      'Browser games didn’t just entertain — they democratized game development for an entire generation.',
    relatedGames: ['Neon Runner', 'Neon Space Shooter'],
    contentBlocks: [
      'The story of browser gaming is the story of the internet itself. Before app stores and digital distribution, a small but revolutionary medium was taking shape inside web browsers — games anyone could play, anywhere, without installing a single file.',
      'In the late 1990s, Macromedia Flash transformed the web from a static document viewer into a vibrant playground. Developers could suddenly create interactive experiences that ran on virtually any computer with an internet connection.',
      'The golden age arrived between 2004 and 2010. Studios like Armor Games and Kongregate became the arcades of a new generation, and the barrier to entry was nothing more than a browser and an idea.',
      'Today, WebGL, WebAssembly and WebGPU have pushed browser gaming into a new era — games that once required dedicated hardware now run at 60fps inside a tab.',
      'The browser has become the most universal gaming platform in history. No downloads, no updates, no walled gardens — just a URL and a connection.',
    ],
  },
  {
    title: 'THE GOLDEN AGE OF ARCADE MACHINES',
    slug: 'the-golden-age-of-arcade-machines',
    category: BlogCategory.GAMING_CULTURE,
    status: BlogStatus.PUBLISHED,
    readTime: '9 MIN READ',
    authorName: 'NEONARCADE EDITORIAL',
    excerpt:
      'Between 1978 and 1983, arcade machines generated more revenue than Hollywood and pop music combined.',
    heroGradient: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b69 50%, #11001c 100%)',
    coverImage: '/images/article-arcade.jpg',
    pullQuote:
      'In 1982, arcade machines generated more revenue than the entire American film industry.',
    relatedGames: ['Neon Drift Racer', 'Neon Space Shooter'],
    contentBlocks: [
      'The golden age of arcade gaming began with Space Invaders in 1978. In Japan the game caused a nationwide coin shortage; in America it transformed bars and pizza parlors into neon-lit cathedrals of competition.',
      'By 1982 the arcade industry was generating $8 billion in quarters — more than the entire American film industry and pop music combined.',
      'The social aspect cannot be overstated. These were communal spaces where skill was currency and high scores were immortality.',
      'Though the golden age ended with the crash of 1983, its influence persists in every corner of the industry — esports, streaming, and modern multiplayer all carry its DNA.',
    ],
  },
  {
    title: 'THE EVOLUTION OF RACING GAMES',
    slug: 'evolution-of-racing-games',
    category: BlogCategory.GAME_DEVELOPMENT,
    status: BlogStatus.PUBLISHED,
    readTime: '8 MIN READ',
    authorName: 'NEONARCADE EDITORIAL',
    excerpt:
      'From Pole Position’s primitive sprites to photorealistic simulations — how racing games pushed technology forward.',
    heroGradient: 'linear-gradient(135deg, #0a1628 0%, #1a2332 50%, #0d1b2a 100%)',
    coverImage: '/images/article-racing.jpg',
    pullQuote: 'Every generation of hardware has been defined by its racing games.',
    relatedGames: ['Neon Drift Racer'],
    contentBlocks: [
      'Racing games have always been at the frontier of gaming technology, from electromechanical cabinets to today’s photorealistic simulations.',
      'Pole Position (1982) introduced a rear-view perspective and qualifying lap system that was revolutionary for its time.',
      'The 1990s brought true 3D with Ridge Racer and Need for Speed; Gran Turismo (1997) proved players craved realism alongside arcade thrills.',
      'Modern racing games achieve photorealism unimaginable a decade ago, and continue to evolve with VR, ray tracing and AI-driven opponents.',
    ],
  },
  {
    title: 'THE MULTIPLAYER REVOLUTION',
    slug: 'multiplayer-revolution',
    category: BlogCategory.GAMING_NEWS,
    status: BlogStatus.PUBLISHED,
    readTime: '10 MIN READ',
    authorName: 'NEONARCADE EDITORIAL',
    excerpt:
      'How connecting players across the world transformed gaming from solitary entertainment into shared experience.',
    heroGradient: 'linear-gradient(135deg, #0a2818 0%, #1a3a2a 50%, #0d2b1a 100%)',
    coverImage: '/images/article-multiplayer.jpg',
    pullQuote: 'Multiplayer didn’t just change how we play games — it changed why we play them.',
    relatedGames: ['Neon Space Shooter'],
    contentBlocks: [
      'The first networked game, Spacewar!, ran on PDP-1 computers in 1962 — two players on a single shared screen.',
      'MUDs in the 1980s proved that shared worlds were compelling, forming communities that transcended geography.',
      'Quake (1996) and its prediction-and-rollback netcode made real-time competitive play viable over consumer internet.',
      'Today multiplayer is not a feature — it is the default expectation, from battle royales to co-op adventures.',
    ],
  },
];
