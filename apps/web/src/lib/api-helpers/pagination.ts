export interface PaginationMeta {
  page: number
  perPage: number
  totalItems: number
  totalPages: number
}

export type PaginatedResponse<T, TDataKey extends string = 'data'> = {
  pagination: PaginationMeta
} & Record<TDataKey, T[]>

export const createPaginatedResponse = <T, TDataKey extends string = 'data'>(
  items: T[],
  page: number,
  perPage: number,
  totalItems: number,
  options?: { dataKey?: TDataKey }
): PaginatedResponse<T, TDataKey> => {
  const totalPages = Math.ceil(totalItems / perPage)
  const dataKey = (options?.dataKey ?? 'data') as TDataKey
  const pagination: PaginationMeta = { page, perPage, totalItems, totalPages }
  return { [dataKey]: items, pagination } as PaginatedResponse<T, TDataKey>
}
