export interface Token {
  id: string;
  rank: number;
  chain: string;
  chainColor: string;
  token: string;
  tokenName: string;
  tokenPair: string;
  price: number;
  priceChange?: number;
  age: string;
  txns: number;
  volume: number;
  volumeFormatted: string;
  makers: number;
  buys: number;
  sells: number;
  change5m: number;
  change1h: number;
  change6h: number;
  change24h: number;
  liquidity: string;
  fdv?: string;
  sparklineData: Array<{ value: number }>;
  isPositive: boolean;
  lastTransaction?: any;
}

export interface SortConfig {
  key: keyof Token | null;
  direction: 'asc' | 'desc';
}

export interface ChainInfo {
  name: string;
  route: string;
  color: string;
  icon: string;
}