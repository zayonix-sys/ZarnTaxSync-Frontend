import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createProduct,
  deleteProduct,
  importProductsCsv,
  listProducts,
  updateProduct,
  type UpsertProductRequest,
} from "@/api/products";
import type { PaginationParams } from "@/api/types";

const PRODUCTS_KEY = "products";

export function useProductsList(params: PaginationParams) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, params],
    queryFn: () => listProducts(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertProductRequest) => createProduct(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
      toast.success("Product created");
    },
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertProductRequest) => updateProduct(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
      toast.success("Product updated");
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
      toast.success("Product deleted");
    },
  });
}

export function useImportProductsCsv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => importProductsCsv(file),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
      toast.success(
        `${result.succeeded}/${result.totalRows} rows imported${
          result.failed > 0 ? ` · ${result.failed} failed` : ""
        }`,
      );
    },
  });
}
