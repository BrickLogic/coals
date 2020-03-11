import { create, lift, Observable, OperatorFunction } from "./coals";

export function map<T, R>(mapFn: (input: T) => R): OperatorFunction<T, R> {
    return (source: Observable<T>) =>
        create(o => {
            return lift(source).subscribe(ev => o.next(mapFn(ev)), o.complete, o.error);
        });
}

export function filter<T>(filterFn: (input: T) => boolean): OperatorFunction<T, T> {
    return (source: Observable<T>): Observable<T> => {
        return create(o => {
            return lift(source).subscribe(
                ev => {
                    if (filterFn(ev)) {
                        o.next(ev);
                    }
                },
                o.complete,
                o.error
            );
        });
    };
}
