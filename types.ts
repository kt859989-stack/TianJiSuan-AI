
export type TabType = 'fortune' | 'compatibility';

export interface UserInfo {
  name: string;
  birthDate: string;
  birthTime?: string; // HH:mm
  birthPlace: string;
  gender: string;
}

export interface FortuneResult {
  bazi: string; // 生辰八字，如：甲子年 丙寅月...
  summary: string;
  score: number;
  luckyColor: string;
  luckyDirection: string;
  todo: string[];
  notodo: string[];
  insight: string;
  fiveElements: string; // 五行倾向
}

export interface CompatibilityResult {
  score: number;
  baziA: string;
  baziB: string;
  matchAnalysis: string;
  fiveElementMatch: string; // 五行合化分析
  advice: string;
  dynamic: string;
}

// Added Meme interface to fix import error in components/MemeDisplay.tsx
export interface Meme {
  url: string;
  caption: string;
}
