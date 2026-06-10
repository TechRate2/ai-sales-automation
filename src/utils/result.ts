export type Result<T, E> = Success<T> | Failure<E>;

export interface Success<T> {
  ok: true;
  data: T;
}

export interface Failure<E> {
  ok: false;
  error: E;
}

export function ok<T>(data: T): Success<T> {
  return { ok: true, data };
}

export function fail<E>(error: E): Failure<E> {
  return { ok: false, error };
}
