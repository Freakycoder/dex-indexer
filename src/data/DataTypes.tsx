export interface Token {
  rank: number;
  chain: string;
  chainColor: string;
  token: string;
  tokenSymbol: string;
  tokenAddress?: string;
  tokenVersion?: string;
  price: number;
  priceChange?: number;
  age: string;
  txns: number;
  volume: string;
  makers: number;
  change5m: number;
  change1h: number;
  change6h: number;
  change24h: number;
  liquidity: string;
  fdv?: string;
  sparklineData: Array<{ value: number }>;
  isPositive: boolean;
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