export type ProductId = string;
export type ProductVariantId = string;
export type WarehouseId = string;
export type OrderId = string;

export type ProductSource = "pancake_pos" | "knowledge_base";
export type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock" | "unknown";

export interface Product {
  id: ProductId;
  name: string;
  sku: string | undefined;
  description: string | undefined;
  source: ProductSource;
  variants: ProductVariant[];
  updatedAt: string | undefined;
}

export interface ProductVariant {
  id: ProductVariantId;
  productId: ProductId;
  sku: string | undefined;
  name: string;
  size: string | undefined;
  color: string | undefined;
  price: number | undefined;
  imageUrl: string | undefined;
  raw: Record<string, unknown>;
}

export interface InventorySnapshot {
  productId: ProductId;
  variantId: ProductVariantId;
  warehouseId: WarehouseId | undefined;
  status: InventoryStatus;
  availableQuantity: number | undefined;
  raw: Record<string, unknown> | undefined;
  checkedAt: string;
}

export interface DraftOrderCustomer {
  name: string;
  phone: string;
  address: string;
  paymentMethod: string | undefined;
}

export interface DraftOrderItem {
  variantId: ProductVariantId;
  productId: ProductId | undefined;
  sku: string | undefined;
  name: string | undefined;
  quantity: number;
  price: number | undefined;
}

export interface DraftOrderInput {
  customer: DraftOrderCustomer;
  items: DraftOrderItem[];
  status: number;
  note: string | undefined;
  pageId: string | undefined;
  warehouseId: WarehouseId | undefined;
}

export interface DraftOrderContext {
  draftOrderId: OrderId | undefined;
  status: number;
  customer: DraftOrderCustomer;
  items: DraftOrderItem[];
  createdAt: string;
  raw: Record<string, unknown> | undefined;
}

export interface PancakeProductVariationQuery {
  search?: string;
  pageSize?: number;
  pageNumber?: number;
  productStatus?: string;
  variationIds?: readonly ProductVariantId[];
}
