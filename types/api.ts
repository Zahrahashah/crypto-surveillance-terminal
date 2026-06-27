export interface PriceData {
  id: string;
  coinGeckoId: string;
  symbol: string;
  name: string;
  price: number;
  previousPrice: number | null;
  percentageChange: number | null;
}

export interface AlertData {
  id: string;
  priceAtCrash: number;
  percentageDrop: number;
  triggeredAt: string;
  coin: {
    id: string;
    coinGeckoId: string;
    symbol: string;
    name: string;
  };
}

export interface PaginatedAlertsResponse {
  alerts: AlertData[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}
