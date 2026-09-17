import type { FoodItem, ProviderId } from '../../../../shared/food';
import type { ProductSignals } from '../../../../shared/productScore';

export type ProviderSearch = { query: string; page: number; pageSize: number; restaurantOnly?: boolean; brandedOnly?: boolean };
export type BarcodeHit = { item: FoodItem; signals?: ProductSignals };

export interface NutritionProvider {
  id: ProviderId;
  configured(): boolean;
  /** Which result kinds this provider is good at, used to route queries */
  covers: ('restaurant' | 'branded' | 'generic')[];
  search?(s: ProviderSearch): Promise<FoodItem[]>;
  barcode?(code: string): Promise<BarcodeHit | null>;
}

export const OFF_UA = 'PlateGauge/1.0 (https://plategauge.app; support@plategauge.app)';
