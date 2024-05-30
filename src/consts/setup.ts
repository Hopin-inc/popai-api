export const SetupFeatureId = {
  REMIND: 1,    // 遅延のリマインド
  PROSPECT: 2,  // 進捗のシェア
} as const;

export const LevelStatusConfig = {
  level1: ":sunny: 特に問題はない",
  level2: ":mostly_sunny: まあまあ順調",
  level3: ":partly_sunny: どちらとも言えない",
  level4: ":rain_cloud: 少し不安",
  level5: ":umbrella_with_rain_drops: 全然ダメ",
} as const;
