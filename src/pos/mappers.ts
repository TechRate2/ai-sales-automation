import type { InventorySnapshot, Product, ProductVariant } from "./types";

export function mapPancakeVariationToProduct(raw: Record<string, unknown>): Product {
  const productId = readString(raw, "product_id") ?? readString(raw, "id") ?? "unknown-product";
  const variant = mapPancakeVariation(raw, productId);

  return {
    id: productId,
    name: readString(raw, "product_name") ?? readString(raw, "name") ?? variant.name,
    sku: readString(raw, "product_sku") ?? readString(raw, "sku"),
    description: readString(raw, "description"),
    source: "pancake_pos",
    variants: [variant],
    updatedAt: readString(raw, "updated_at") ?? readString(raw, "modified_at")
  };
}

export function mapPancakeVariation(raw: Record<string, unknown>, productId: string): ProductVariant {
  return {
    id: readString(raw, "variation_id") ?? readString(raw, "id") ?? "unknown-variant",
    productId,
    sku: readString(raw, "variation_sku") ?? readString(raw, "sku"),
    name: readString(raw, "variation_name") ?? readString(raw, "name") ?? "Unknown variant",
    size: readString(raw, "size") ?? readNestedString(raw, ["fields", "size"]),
    color: readString(raw, "color") ?? readNestedString(raw, ["fields", "color"]),
    price: readNumber(raw, "retail_price") ?? readNumber(raw, "price"),
    imageUrl: readString(raw, "image") ?? readString(raw, "image_url"),
    raw
  };
}

export function mapInventoryFromVariation(raw: Record<string, unknown>): InventorySnapshot {
  const remainQuantity =
    readNumber(raw, "remain_quantity") ??
    readNumber(raw, "available_quantity") ??
    readNumber(raw, "quantity");

  return {
    productId: readString(raw, "product_id") ?? "unknown-product",
    variantId: readString(raw, "variation_id") ?? readString(raw, "id") ?? "unknown-variant",
    warehouseId: readString(raw, "warehouse_id"),
    status: quantityToInventoryStatus(remainQuantity),
    availableQuantity: remainQuantity,
    raw,
    checkedAt: new Date().toISOString()
  };
}

export function quantityToInventoryStatus(quantity: number | undefined): InventorySnapshot["status"] {
  if (quantity === undefined) {
    return "unknown";
  }

  if (quantity <= 0) {
    return "out_of_stock";
  }

  if (quantity <= 3) {
    return "low_stock";
  }

  return "in_stock";
}

function readString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function readNumber(source: Record<string, unknown>, key: string): number | undefined {
  const value = source[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function readNestedString(source: Record<string, unknown>, path: readonly string[]): string | undefined {
  let current: unknown = source;
  for (const key of path) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === "string" && current.trim() !== "" ? current : undefined;
}
