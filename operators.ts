import { create, lift, noop, Observable, OperatorFunction } from "./coals";

export function map<T, R>(mapFn: (input: T) => R): OperatorFunction<T, R> {
    return (source: Observable<T>) =>
        create(o => {
            lift(source).subscribe(ev => o.next(mapFn(ev)), o.complete, o.error);
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

export function takeUntil<T>(notifier: Observable<T>): OperatorFunction<T, T> {
    return (source: Observable<T>): Observable<T> => {
        const unsubscribe = notifier.subscribe(() => {
            source.complete();
            unsubscribe();
        });

        return source;
    };
}

export function catchError<T, C>(
    errorHandler: (e: Error) => Observable<C> | void
): OperatorFunction<T, C> {
    return (source: Observable<T>): Observable<C> => {
        return create<C>(o => {
            const copy = lift(source);

            const unsubscribe = copy.subscribe(noop, o.complete, e => {
                const errorHandlerResult = errorHandler(e);

                if (errorHandlerResult) {
                    unsubscribe();

                    errorHandlerResult.subscribe(o.next, o.complete, o.error);
                }
            });
        });
    };
}

export function switchMap<T, C>(switchMapFn: (value: T) => Observable<C>): OperatorFunction<T, C> {
    return (source: Observable<T>) => {
        return create<C>(o => {
            source.subscribe(e => {
                // unsubscribe();
                source.complete();

                switchMapFn(e).subscribe(o.next, o.complete, o.error);
            });
        });
    };
}
