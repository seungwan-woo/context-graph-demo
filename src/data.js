const seedData = {
  user: {
    id: "demo-user",
    name: "Android Power User",
    platform: "android",
    locale: "ko-KR",
  },
  device: {
    id: "pixel-8-pro",
    model: "Pixel 8 Pro",
    osVersion: "Android 15",
  },
  events: [
    {
      id: "youtube_launch",
      label: "YouTube Launch",
      primaryDecision: "noise_erase",
      description: "YouTube app enters foreground and audio playback is likely.",
    },
    {
      id: "sharesheet_open",
      label: "Sharesheet Open",
      primaryDecision: "share_ranking",
      description: "Android sharesheet opens from the current app.",
    },
  ],
  apps: [
    { id: "youtube", label: "YouTube", packageName: "com.google.android.youtube", category: "media" },
    { id: "photos", label: "Google Photos", packageName: "com.google.android.apps.photos", category: "gallery" },
    { id: "chrome", label: "Chrome", packageName: "com.android.chrome", category: "browser" },
    { id: "slack", label: "Slack", packageName: "com.Slack", category: "work" },
    { id: "kakaotalk", label: "KakaoTalk", packageName: "com.kakao.talk", category: "social" },
    { id: "gmail", label: "Gmail", packageName: "com.google.android.gm", category: "mail" },
    { id: "drive", label: "Google Drive", packageName: "com.google.android.apps.docs", category: "work" },
    { id: "messages", label: "Messages", packageName: "com.google.android.apps.messaging", category: "messaging" },
    { id: "instagram", label: "Instagram", packageName: "com.instagram.android", category: "social" },
    { id: "notion", label: "Notion", packageName: "notion.id", category: "work" }
  ],
  contacts: [
    { id: "jisoo", label: "Jisoo", entityType: "person", affinity: 0.91 },
    { id: "minho", label: "Minho", entityType: "person", affinity: 0.82 },
    { id: "mom", label: "Mom", entityType: "person", affinity: 0.77 },
    { id: "design-room", label: "Design Room", entityType: "room", affinity: 0.87 },
    { id: "product-room", label: "Product Room", entityType: "room", affinity: 0.89 }
  ],
  directTargets: [
    { id: "direct-jisoo-kakao", label: "Jisoo via KakaoTalk", contactId: "jisoo", appId: "kakaotalk" },
    { id: "direct-minho-messages", label: "Minho via Messages", contactId: "minho", appId: "messages" },
    { id: "direct-mom-messages", label: "Mom via Messages", contactId: "mom", appId: "messages" },
    { id: "direct-design-room-slack", label: "Design Room via Slack", contactId: "design-room", appId: "slack" },
    { id: "direct-product-room-slack", label: "Product Room via Slack", contactId: "product-room", appId: "slack" }
  ],
  userContactHistory: [
    { contactId: "jisoo", count7d: 8, count30d: 24, lastHoursAgo: 2 },
    { contactId: "minho", count7d: 5, count30d: 16, lastHoursAgo: 14 },
    { contactId: "mom", count7d: 3, count30d: 11, lastHoursAgo: 8 },
    { contactId: "design-room", count7d: 7, count30d: 31, lastHoursAgo: 1 },
    { contactId: "product-room", count7d: 6, count30d: 28, lastHoursAgo: 5 }
  ],
  userAppHistory: [
    { appId: "slack", shareCount7d: 12, shareCount30d: 41, lastHoursAgo: 1 },
    { appId: "kakaotalk", shareCount7d: 11, shareCount30d: 38, lastHoursAgo: 3 },
    { appId: "messages", shareCount7d: 7, shareCount30d: 19, lastHoursAgo: 6 },
    { appId: "gmail", shareCount7d: 4, shareCount30d: 13, lastHoursAgo: 18 },
    { appId: "drive", shareCount7d: 5, shareCount30d: 14, lastHoursAgo: 7 },
    { appId: "instagram", shareCount7d: 6, shareCount30d: 21, lastHoursAgo: 12 },
    { appId: "notion", shareCount7d: 2, shareCount30d: 10, lastHoursAgo: 21 }
  ],
  shareCandidates: {
    direct: [
      { eventId: "sharesheet_open", targetId: "direct-jisoo-kakao", baseScore: 42 },
      { eventId: "sharesheet_open", targetId: "direct-minho-messages", baseScore: 35 },
      { eventId: "sharesheet_open", targetId: "direct-mom-messages", baseScore: 34 },
      { eventId: "sharesheet_open", targetId: "direct-design-room-slack", baseScore: 44 },
      { eventId: "sharesheet_open", targetId: "direct-product-room-slack", baseScore: 41 }
    ],
    apps: [
      { eventId: "sharesheet_open", appId: "slack", baseScore: 48 },
      { eventId: "sharesheet_open", appId: "kakaotalk", baseScore: 45 },
      { eventId: "sharesheet_open", appId: "messages", baseScore: 40 },
      { eventId: "sharesheet_open", appId: "gmail", baseScore: 37 },
      { eventId: "sharesheet_open", appId: "drive", baseScore: 35 },
      { eventId: "sharesheet_open", appId: "instagram", baseScore: 39 },
      { eventId: "sharesheet_open", appId: "notion", baseScore: 28 }
    ]
  },
  scenarios: [
    {
      id: "commute-morning",
      label: "Morning Commute",
      description: "Noisy subway ride with earbuds connected and media-heavy usage.",
      timeOfDay: "morning",
      locationType: "transit",
      motionState: "in_transit",
      noiseDb: 79,
      bluetoothAudio: true,
      wearingBuds: true,
      focusMode: false,
      batteryPct: 61,
      network: "5g",
      sourceAppId: "youtube",
      recentApps: [
        { appId: "youtube", minutesAgo: 0, foreground: true },
        { appId: "kakaotalk", minutesAgo: 9, foreground: false },
        { appId: "messages", minutesAgo: 70, foreground: false }
      ],
      directBoosts: [
        { targetId: "direct-jisoo-kakao", score: 12, reason: "Commuting hours often correlate with 1:1 chat shares." },
        { targetId: "direct-mom-messages", score: 4, reason: "Family coordination tends to happen during commute." },
        { targetId: "direct-design-room-slack", score: -6, reason: "Work-room shares are less likely while commuting." }
      ],
      appBoosts: [
        { appId: "kakaotalk", score: 15, reason: "Transit scenario favors quick chat-based sharing." },
        { appId: "messages", score: 10, reason: "Fallback lightweight messaging is common on the move." },
        { appId: "slack", score: -4, reason: "Slack is deprioritized when not in work context." }
      ]
    },
    {
      id: "office-focus",
      label: "Office Focus Block",
      description: "Desk setup with low noise, Wi-Fi, and active focus mode.",
      timeOfDay: "afternoon",
      locationType: "office",
      motionState: "stationary",
      noiseDb: 42,
      bluetoothAudio: false,
      wearingBuds: false,
      focusMode: true,
      batteryPct: 88,
      network: "wifi",
      sourceAppId: "chrome",
      recentApps: [
        { appId: "chrome", minutesAgo: 0, foreground: true },
        { appId: "slack", minutesAgo: 3, foreground: false },
        { appId: "drive", minutesAgo: 11, foreground: false },
        { appId: "gmail", minutesAgo: 18, foreground: false }
      ],
      directBoosts: [
        { targetId: "direct-product-room-slack", score: 15, reason: "Product room is the dominant workshare destination." },
        { targetId: "direct-design-room-slack", score: 11, reason: "Design room remains relevant for active review cycles." },
        { targetId: "direct-mom-messages", score: -10, reason: "Family direct share is unlikely in focused office mode." }
      ],
      appBoosts: [
        { appId: "slack", score: 18, reason: "Office context promotes team collaboration tools." },
        { appId: "drive", score: 13, reason: "Drive is preferred for work artifact sharing." },
        { appId: "gmail", score: 10, reason: "Email remains a strong secondary work route." },
        { appId: "instagram", score: -10, reason: "Social apps are down-ranked during office focus." }
      ]
    },
    {
      id: "cafe-break",
      label: "Cafe Break",
      description: "Casual break with photo browsing and mixed social intent.",
      timeOfDay: "late_afternoon",
      locationType: "cafe",
      motionState: "stationary",
      noiseDb: 58,
      bluetoothAudio: false,
      wearingBuds: false,
      focusMode: false,
      batteryPct: 73,
      network: "wifi",
      sourceAppId: "photos",
      recentApps: [
        { appId: "photos", minutesAgo: 0, foreground: true },
        { appId: "instagram", minutesAgo: 14, foreground: false },
        { appId: "kakaotalk", minutesAgo: 20, foreground: false },
        { appId: "chrome", minutesAgo: 55, foreground: false }
      ],
      directBoosts: [
        { targetId: "direct-jisoo-kakao", score: 10, reason: "Photo shares often go to close friends first." },
        { targetId: "direct-minho-messages", score: 7, reason: "Recent casual chat with Minho is still active." }
      ],
      appBoosts: [
        { appId: "instagram", score: 14, reason: "Photo-led cafe context strongly prefers Instagram." },
        { appId: "kakaotalk", score: 9, reason: "Lightweight social sharing is still common." },
        { appId: "messages", score: 4, reason: "Direct outbound share remains plausible." }
      ]
    },
    {
      id: "home-night",
      label: "Home at Night",
      description: "Quiet home setting with relaxed media consumption.",
      timeOfDay: "night",
      locationType: "home",
      motionState: "stationary",
      noiseDb: 28,
      bluetoothAudio: true,
      wearingBuds: false,
      focusMode: false,
      batteryPct: 49,
      network: "wifi",
      sourceAppId: "youtube",
      recentApps: [
        { appId: "youtube", minutesAgo: 0, foreground: true },
        { appId: "messages", minutesAgo: 6, foreground: false },
        { appId: "instagram", minutesAgo: 25, foreground: false },
        { appId: "kakaotalk", minutesAgo: 40, foreground: false }
      ],
      directBoosts: [
        { targetId: "direct-mom-messages", score: 13, reason: "Evening home context often surfaces family sharing." },
        { targetId: "direct-jisoo-kakao", score: 7, reason: "Close friends remain relevant after hours." }
      ],
      appBoosts: [
        { appId: "messages", score: 12, reason: "Nighttime home context favors personal messaging." },
        { appId: "kakaotalk", score: 8, reason: "KakaoTalk remains a likely conversational destination." },
        { appId: "instagram", score: 6, reason: "Relaxed browsing translates into social sharing." },
        { appId: "slack", score: -9, reason: "Work tools are heavily down-ranked at home." }
      ]
    }
  ]
};

module.exports = {
  seedData,
};
