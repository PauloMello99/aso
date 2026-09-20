export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  pages: number
}

export interface PageParams {
  page?: number
  limit?: number
}
