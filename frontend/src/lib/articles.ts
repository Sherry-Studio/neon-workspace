export interface Article {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  readTime: string;
  publishDate: string;
  author: string;
  heroGradient: string;
  heroImage: string;
  content: string[];
  pullQuote?: string;
  relatedGames: string[];
}

export const articles: Article[] = [
  {
    slug: "how-browser-gaming-changed-the-internet",
    title: "HOW BROWSER GAMING CHANGED THE INTERNET",
    category: "GAME HISTORY",
    excerpt:
      "From Flash games to WebGL — the untold story of how browser gaming shaped an entire generation of players and developers.",
    readTime: "12 MIN READ",
    publishDate: "August 2026",
    author: "NEONARCADE EDITORIAL",
    heroGradient:
      "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    heroImage: "/images/article-browser-gaming.jpg",
    content: [
      "The story of browser gaming is the story of the internet itself. In the earliest days of the web, before app stores and digital distribution, a small but revolutionary medium was taking shape inside web browsers — games that anyone could play, anywhere, without installing a single file.",
      "In the late 1990s, a small plugin called Macromedia Flash transformed the web from a static document viewer into a vibrant playground. Suddenly, developers could create interactive experiences that ran on virtually any computer with an internet connection. Games like Alien Hominid, N, and Line Rider became cultural phenomena, shared through forums and passed between friends like digital samizdat.",
      "The golden age arrived between 2004 and 2010. Studios like Armor Games, Kongregate, and Addicting Games became the arcades of a new generation. Flash games weren't just diversions — they were a creative medium. Independent developers could reach millions of players overnight, and the barrier to entry was nothing more than a web browser and an idea.",
      "Today, technologies like WebGL, WebAssembly, and WebGPU have pushed browser gaming into a new era. Games that once required dedicated hardware now run at 60 frames per second inside a Chrome tab. The technical gap between native and browser games continues to narrow, and the implications for accessibility are profound.",
      "The browser has become the most universal gaming platform in history. No downloads, no updates, no walled gardens — just a URL and an internet connection. As cloud gaming and streaming mature, the browser's role as the great equalizer of gaming access only grows more important.",
    ],
    pullQuote:
      "Browser games didn't just entertain — they democratized game development for an entire generation.",
    relatedGames: ["Cyber Runner", "Pixel Blaster"],
  },
  {
    slug: "the-golden-age-of-arcade-machines",
    title: "THE GOLDEN AGE OF ARCADE MACHINES",
    category: "RETRO GAMING",
    excerpt:
      "Between 1978 and 1983, arcade machines generated more revenue than Hollywood and pop music combined.",
    readTime: "9 MIN READ",
    publishDate: "August 2026",
    author: "NEONARCADE EDITORIAL",
    heroGradient:
      "linear-gradient(135deg, #1a0a2e 0%, #2d1b69 50%, #11001c 100%)",
    heroImage: "/images/article-arcade.jpg",
    content: [
      "The golden age of arcade gaming began with Space Invaders in 1978. Tomohiro Nishikado's creation didn't just launch a game — it launched a cultural phenomenon. In Japan, the game caused a nationwide coin shortage. In America, it transformed dingy bars and pizza parlors into neon-lit cathedrals of competition.",
      "By 1982, the arcade industry was generating $8 billion in quarters — more than the entire American film industry and pop music combined. Pac-Man fever swept the nation. Donkey Kong introduced the world to a plumber named Mario. Every shopping mall, convenience store, and laundromat had a row of machines glowing in the corner.",
      "The social aspect of arcades cannot be overstated. These were communal spaces where skill was currency and high scores were immortality. Players gathered around machines, studying patterns, sharing strategies, and forming communities built around the pursuit of digital excellence. The arcade was democracy in its purest form — anyone with a quarter could play.",
      "Though the golden age ended with the video game crash of 1983, its influence persists in every corner of the gaming industry. The competitive spirit, the pursuit of high scores, the social gathering around shared screens — these DNA strands run through esports, streaming, and modern multiplayer gaming. The machines may be gone, but the culture they created is eternal.",
    ],
    pullQuote:
      "In 1982, arcade machines generated more revenue than the entire American film industry.",
    relatedGames: ["Grid Wars", "Pixel Blaster"],
  },
  {
    slug: "evolution-of-racing-games",
    title: "THE EVOLUTION OF RACING GAMES",
    category: "GENRE DEEP DIVE",
    excerpt:
      "From Pole Position's primitive sprites to photorealistic simulations — how racing games pushed technology forward.",
    readTime: "8 MIN READ",
    publishDate: "August 2026",
    author: "NEONARCADE EDITORIAL",
    heroGradient:
      "linear-gradient(135deg, #0a1628 0%, #1a2332 50%, #0d1b2a 100%)",
    heroImage: "/images/article-racing.jpg",
    content: [
      "Racing games have always been at the frontier of gaming technology. From the earliest electromechanical arcade cabinets to today's photorealistic simulations, the genre has consistently pushed the boundaries of what hardware could achieve. Speed, it turns out, is the ultimate benchmark.",
      "Pole Position (1982) introduced rear-view perspective and a qualifying lap system that was revolutionary for its time. The game's pseudo-3D rendering technique became the template for an entire generation of racing titles. Outrun (1986) took the formula further with sprite scaling that created an illusion of depth that still holds up today.",
      "The 1990s brought true 3D with Ridge Racer and Need for Speed. Polygon graphics replaced sprites, and suddenly racing games could simulate real-world physics with unprecedented fidelity. Gran Turismo (1997) redefined the genre entirely, proving that players craved realism alongside arcade thrills.",
      "Modern racing games achieve photorealism that was unimaginable just a decade ago. Forza Horizon, Gran Turismo 7, andAssetto Corsa Competizione render cars, tracks, and weather with such fidelity that screenshots are indistinguishable from photographs. The genre continues to evolve with VR support, ray tracing, and AI-driven opponents that mimic real racing drivers.",
    ],
    pullQuote:
      "Every generation of hardware has been defined by its racing games.",
    relatedGames: ["Neon Drift", "Velocity X"],
  },
  {
    slug: "multiplayer-revolution",
    title: "THE MULTIPLAYER REVOLUTION",
    category: "ONLINE GAMING",
    excerpt:
      "How connecting players across the world transformed gaming from solitary entertainment into shared experience.",
    readTime: "10 MIN READ",
    publishDate: "August 2026",
    author: "NEONARCADE EDITORIAL",
    heroGradient:
      "linear-gradient(135deg, #0a2818 0%, #1a3a2a 50%, #0d2b1a 100%)",
    heroImage: "/images/article-multiplayer.jpg",
    content: [
      "The first networked game, Spacewar!, ran on PDP-1 computers in 1962. Two players, each controlling a spaceship, competed on a single shared screen. It was primitive by any modern standard, but it contained the seed of a revolution — the idea that games could be shared experiences.",
      "MUDs (Multi-User Dungeons) in the 1980s proved that shared worlds were compelling. Players connected via text terminals to explore virtual dungeons together, forming alliances, battling monsters, and creating communities that transcended geography. These text-based worlds were the ancestors of every MMO that followed.",
      "Quake (1996) and its revolutionary netcode changed everything. John Carmack's prediction-and-rollback networking model made real-time competitive play viable over consumer internet connections. Suddenly, a player in Tokyo could compete against one in New York with minimal latency. Online gaming was no longer a novelty — it was a revolution.",
      "Today, multiplayer is not a feature — it is the default expectation. From battle royales to co-op adventures, from competitive shooters to social simulators, the vast majority of successful games are built around shared experiences. The solitary player hunched over a screen has been replaced by communities of millions, connected across continents, playing together in real time.",
    ],
    pullQuote:
      "Multiplayer didn't just change how we play games — it changed why we play them.",
    relatedGames: ["Grid Wars", "Neural Link"],
  },
];

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}
