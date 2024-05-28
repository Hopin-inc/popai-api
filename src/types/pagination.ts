export type PaginateResponse<T> = {
  items?: T[],
  meta?: {
    page: number;
    perPage: number
    totalCount: number;
    pageCount : number;
  }
}
