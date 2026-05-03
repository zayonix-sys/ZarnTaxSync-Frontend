import { api, getPaged } from "@/api/client";
import type { PaginationParams } from "@/api/types";

export interface Product {
  id: string;
  name: string;
  defaultHsCode: string;
  defaultSaleType: string;
  isActive: boolean;
}

export interface UpsertProductRequest {
  name: string;
  defaultHsCode: string;
  defaultSaleType: string;
  isActive: boolean;
}

export interface ProductImportResult {
  totalRows: number;
  succeeded: number;
  failed: number;
  errors?: Array<{ row: number; message: string }>;
}

export async function listProducts(params: PaginationParams = {}) {
  return getPaged<Product>("/products", { params });
}

export async function createProduct(body: UpsertProductRequest): Promise<Product> {
  const res = await api.post<Product>("/products", body);
  return res.data;
}

export async function updateProduct(
  id: string,
  body: UpsertProductRequest,
): Promise<Product> {
  const res = await api.put<Product>(`/products/${id}`, body);
  return res.data;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete<null>(`/products/${id}`);
}

export async function importProductsCsv(file: File): Promise<ProductImportResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await api.post<ProductImportResult>("/products/import-csv", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}
