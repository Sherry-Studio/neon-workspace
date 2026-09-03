import { BlogCategory, BlogStatus, GameCategory, GameStatus } from '../types';

/**
 * Initial catalogue. Inserted by `npm run seed` but NOT hardcoded into the
 * running app -- after seeding they live in MongoDB and are managed through the
 * admin API.
 *
 * NEON ORBIT is the only game in development. The catalogue holds this one
 * title -- no placeholders, no fake cards.
 */
export const seedGames = [
  {
    title: 'NEON ORBIT',
    slug: 'neon-void',
    shortDescription:
      'A cinematic 3D deep-space flight experience. Take the controls of a lone fighter and fly through an enormous sci-fi universe.',
    description:
      'NEON ORBIT is a premium, cinematic space-flight experience built directly into NEON ARCADE with React Three Fiber. A black screen gives way to a star field, deep space opens up, and an enormous celestial body drifts in the distance. Your fighter enters frame, the camera settles behind it, and control is yours. Steer with a mouse or a Mac trackpad through a universe with real scale -- the Moon dwarfs your ship, Mars sits vast and distant, and a black hole waits, terrifyingly huge, on the far horizon. Phase I is the foundation: the environment and the flight. Combat comes later.',
    category: GameCategory.ACTION,
    status: GameStatus.PUBLISHED,
    featured: true,
    gameUrl: '/games/neon-void',
    version: '0.1.0',
    thumbnail: '/images/quantum-break.jpg',
    banner: '/images/quantum-break.jpg',
    genre: 'SPACE FLIGHT',
    tagline: 'Take the controls. Fly the deep field.',
    gradient: 'linear-gradient(135deg, #05060a 0%, #0c1424 55%, #1a1030 100%)',
    instructions:
      'Move your mouse or trackpad away from centre to steer -- the ship banks into the turn and stabilises when you return to centre. Click for mouse-lock steering. SHIFT to boost.',
    controls: [
      'Mouse / Trackpad - Steer the ship',
      'Click - Mouse-lock steering',
      'W / S - Throttle, A / D - Yaw',
      'Q / E - Roll',
      'Shift - Boost',
      'Esc - Release mouse',
    ],
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
      'From Flash games to WebGL - the untold story of how browser gaming shaped an entire generation of players and developers.',
    heroGradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    coverImage: '/images/article-browser-gaming.jpg',
    pullQuote:
      'Browser games did not just entertain - they democratized game development for an entire generation.',
    relatedGames: ['NEON ORBIT'],
    contentBlocks: [
      'The story of browser gaming is the story of the internet itself. Before app stores and digital distribution, a small but revolutionary medium was taking shape inside web browsers - games anyone could play, anywhere, without installing a single file.',
      'In the late 1990s, Macromedia Flash transformed the web from a static document viewer into a vibrant playground. Developers could suddenly create interactive experiences that ran on virtually any computer with an internet connection.',
      'The golden age arrived between 2004 and 2010. Studios like Armor Games and Kongregate became the arcades of a new generation, and the barrier to entry was nothing more than a browser and an idea.',
      'Today, WebGL, WebAssembly and WebGPU have pushed browser gaming into a new era - games that once required dedicated hardware now run at 60fps inside a tab.',
      'The browser has become the most universal gaming platform in history. No downloads, no updates, no walled gardens - just a URL and a connection.',
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
    relatedGames: ['NEON ORBIT'],
    contentBlocks: [
      'The golden age of arcade gaming began with Space Invaders in 1978. In Japan the game caused a nationwide coin shortage; in America it transformed bars and pizza parlors into neon-lit cathedrals of competition.',
      'By 1982 the arcade industry was generating $8 billion in quarters - more than the entire American film industry and pop music combined.',
      'The social aspect cannot be overstated. These were communal spaces where skill was currency and high scores were immortality.',
      'Though the golden age ended with the crash of 1983, its influence persists in every corner of the industry - esports, streaming, and modern multiplayer all carry its DNA.',
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
      'From Pole Position primitive sprites to photorealistic simulations - how racing games pushed technology forward.',
    heroGradient: 'linear-gradient(135deg, #0a1628 0%, #1a2332 50%, #0d1b2a 100%)',
    coverImage: '/images/article-racing.jpg',
    pullQuote: 'Every generation of hardware has been defined by its racing games.',
    relatedGames: ['NEON ORBIT'],
    contentBlocks: [
      'Racing games have always been at the frontier of gaming technology, from electromechanical cabinets to photorealistic simulations.',
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
    pullQuote: 'Multiplayer did not just change how we play games - it changed why we play them.',
    relatedGames: ['NEON ORBIT'],
    contentBlocks: [
      'The first networked game, Spacewar!, ran on PDP-1 computers in 1962 - two players on a single shared screen.',
      'MUDs in the 1980s proved that shared worlds were compelling, forming communities that transcended geography.',
      'Quake (1996) and its prediction-and-rollback netcode made real-time competitive play viable over consumer internet.',
      'Today multiplayer is not a feature - it is the default expectation, from battle royales to co-op adventures.',
    ],
  },
];
