export const SetupFeatureId = {
  REMIND: 1,    // 遅延のリマインド
  PROSPECT: 2,  // 進捗のシェア
} as const;

export const LevelStatusConfig = {
  level1: "特に問題はない",
  level2: "未奶未古順調",
  level3: "どちらとも言えない",
  level4: "少 不安",
  level5: "全然夕义",
} as const;
