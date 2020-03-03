type AtomResetCallback = () => void;
type AtomChangeCallback<T> = (newState: T) => void;
type AddWatch<T> = (watcher: AtomChangeCallback<T>, resetWatcher?: AtomResetCallback) => () => void;

type Update<T> = (value: T) => T;
type Reset = () => void;

enum IsAtom {
    TRUE
}

type WatcherList<T> = [AtomChangeCallback<T>, AtomResetCallback?];

type Atom<T> = {
    readonly isAtom: IsAtom.TRUE;
    readonly value: () => T;
    readonly valueOf: () => T;
    readonly watchers: readonly WatcherList<T>[];

    readonly addWatch: AddWatch<T>;
    readonly update: Update<T>;
    readonly reset: Reset;
};

function get<T>(a: Atom<T>): T {
    return a.value();
}

function atom<T>(value: T): Atom<T> {
    // eslint-disable-next-line prefer-const
    let v = value;

    // eslint-disable-next-line prefer-const
    let watchers: WatcherList<T>[] = [];

    const addWatch: AddWatch<T> = (watcher, reset?) => {
        watchers.push([watcher, reset]);

        const watcherIndex = watchers.length - 1;

        return () => {
            watchers = watchers.slice(0, watcherIndex).concat(watchers.slice(watcherIndex + 1));
        };
    };

    const update = (newValue: T): T => {
        watchers.forEach(([watcher]) => watcher(newValue));

        v = newValue;

        return newValue;
    };

    const reset = (): void => {
        watchers.forEach(([, r]) => r && r());
        watchers = [];
    };

    return {
        isAtom: IsAtom.TRUE,
        value: () => v,
        valueOf: () => v,

        watchers,

        addWatch,
        update,
        reset
    };
}

type Noop = () => void;

type Teardown = undefined | void | Noop;
type NextCallback<T> = (nextValue: T) => void;

interface Observer<T> {
    readonly next: NextCallback<T>;
    readonly complete: Noop;
}

interface Subscription<T> {
    readonly observer: Observer<T>;
    readonly teardown: (teardown: Teardown) => void;
    readonly unsubscribe: Noop;
}

const createObserver = <T>(onNext: NextCallback<T>, onComplete: Noop): Observer<T> => {
    const next: NextCallback<T> = ev => onNext(ev);
    const complete: Noop = () => onComplete();

    return {
        next,
        complete
    };
};

const createSubscription = <T>(onNext: NextCallback<T>, onComplete: Noop): Subscription<T> => {
    let teardown: Teardown;
    const isSubscribed = atom(true);

    const internalOnNext: NextCallback<T> = ev => {
        if (isSubscribed.value()) {
            onNext(ev);
        }
    };

    const observer = createObserver(internalOnNext, onComplete);
    const unsubscribe = (): void => {
        isSubscribed.update(false);

        if (teardown) {
            teardown();
        }
    };

    const addTeardown = (onTeardown: Teardown): void => {
        teardown = onTeardown;
    };

    return {
        observer,
        unsubscribe,
        teardown: addTeardown
    };
};

type CoalProducerObservable<T> = (o: Observer<T>) => Teardown;

type SubscriptionCallback<T> = (nextValue: T) => void;
type Subscribe<T> = (
    callback: SubscriptionCallback<T> | Subject<T>,
    complete?: AtomResetCallback
) => () => void;

export interface Observable<T> {
    readonly isCoal: true;
    readonly isObservable: true;
    readonly subscribe: Subscribe<T>;
    readonly complete: () => void;
}

export type From = <T>(eventProducer: CoalProducerObservable<T>) => Observable<T>;

export const from: From = <T>(eventProducer: CoalProducerObservable<T>): Observable<T> => {
    const isCompleted = atom(false);
    const subscriptions = atom<readonly Noop[]>([]);

    const subscribe: Subscribe<T> = (callbackOrCoal, complete) => {
        const onNext = (ev: T): void => {
            if (isCompleted.value()) {
                return;
            }

            if (typeof callbackOrCoal === "object") {
                callbackOrCoal.next(ev);
                return;
            }

            callbackOrCoal(ev);
        };

        const onComplete = (): void => {
            if (complete) {
                complete();
            }
        };

        const sub = createSubscription(onNext, onComplete);

        const teardown = eventProducer(sub.observer);

        sub.teardown(teardown);

        const unsubscribe = (): void => {
            onComplete();
            sub.unsubscribe();
        };

        subscriptions.update([...subscriptions.value(), unsubscribe]);

        return unsubscribe;
    };

    const complete = (): void => {
        isCompleted.update(true);
        subscriptions.value().forEach(unsubscribe => {
            unsubscribe();
        });
    };

    return {
        isCoal: true,
        isObservable: true,
        complete,
        subscribe
    };
};

type ValueGetter<T> = () => T;
type SubjectNextCallback<T> = (nextValue?: T) => void;

export interface Subject<T> extends Observable<T | undefined> {
    readonly isSubject: true;
    readonly value: ValueGetter<T | undefined>;
    readonly next: SubjectNextCallback<T>;
}

type Of = <T>(initValue?: T) => Subject<T>;

interface Observer<T> {
    readonly next: NextCallback<T>;
    readonly complete: () => void;
}

export const of: Of = <T>(initValue?: T): Subject<T> => {
    const a = atom(initValue);
    const isCompleted = atom(false);

    const value: ValueGetter<T | undefined> = () => {
        return a.valueOf();
    };

    const next: NextCallback<T | undefined> = nextValue => {
        if (get(isCompleted)) {
            return;
        }

        a.update(nextValue);
    };

    const subscribe: Subscribe<T | undefined> = (callbackOrCoal, complete) => {
        if (typeof callbackOrCoal === "object") {
            const subscription = a.addWatch(callbackOrCoal.next, complete);

            callbackOrCoal.next(value());

            return subscription;
        }

        return a.addWatch(callbackOrCoal, complete);
    };

    const complete = (): void => {
        isCompleted.update(true);
        a.reset();
    };

    return {
        isCoal: true,
        isObservable: true,
        isSubject: true,
        value,
        next,
        subscribe,
        complete
    };
};

const NONE_VALUE = {
    none: true
};

type None = typeof NONE_VALUE;

function isCombined<T>(values: readonly (T | None)[]): values is readonly T[] {
    return values.every(v => v !== NONE_VALUE);
}

export function combine<T1, R>(sources: [Observable<T1>]): Observable<[T1]>;
export function combine<T1, T2, R>(sources: [Observable<T1>, Observable<T2>]): Observable<[T1, T2]>;
export function combine<T1, T2, T3, R>(
    sources: [Observable<T1>, Observable<T2>, Observable<T3>]
): Observable<[T1, T2, T3]>;
export function combine<T1, R>(sources: [Observable<T1>]): Observable<[T1]>;
export function combine<T1, T2, T3, R>(
    sources: [Observable<T1>, Observable<T2>, Observable<T3>]
): Observable<[T1, T2, T3]>;
export function combine<T1, T2, T3, T4, R>(
    sources: [Observable<T1>, Observable<T2>, Observable<T3>, Observable<T4>]
): Observable<[T1, T2, T3, T4]>;
export function combine<T1, T2, T3, T4, T5, R>(
    sources: [Observable<T1>, Observable<T2>, Observable<T3>, Observable<T4>, Observable<T5>]
): Observable<[T1, T2, T3, T4, T5]>;

export function combine<T>(observables: readonly Observable<T>[]): Observable<T> {
    return from((innerObs: Observer<T>): void => {
        const values = atom<readonly (T | None)[]>(observables.map(() => NONE_VALUE));

        observables.forEach((obs, i) => {
            obs.subscribe(nextV => {
                const valuesCopy = [...values.value()];

                valuesCopy[i] = nextV;

                values.update(valuesCopy);

                if (isCombined(valuesCopy)) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                    // @ts-ignore
                    innerObs.next(valuesCopy);
                }
            });
        });
    });
}

export function timeout(timeoutValue: number): Observable<number> {
    return from(observer => {
        const timer = setTimeout(() => observer.next(timeoutValue), timeoutValue);

        return () => clearTimeout(timer);
    });
}

export function interval(intervalValue: number): Observable<number> {
    return from(observer => {
        const v = atom(1);

        const timer = setInterval(() => {
            const callIndex = v.value();
            v.update(callIndex + 1);

            observer.next(callIndex * intervalValue);
        }, intervalValue);

        return () => clearInterval(timer);
    });
}

export function merge<T1, R>(o1: Observable<T1>): Observable<[T1]>;
export function merge<T1, T2, R>(o1: Observable<T1>, o2: Observable<T2>): Observable<T1 | T2>;
export function merge<T1, T2, T3, R>(
    o1: Observable<T1>,
    o2: Observable<T2>,
    o3: Observable<T3>
): Observable<T1 | T2 | T3>;
export function merge<T1, T2, T3, T4, R>(
    o1: Observable<T1>,
    o2: Observable<T2>,
    o3: Observable<T3>,
    o4: Observable<T4>
): Observable<T1 | T2 | T3 | T4>;
export function merge<T1, T2, T3, T4, T5, R>(
    o1: Observable<T1>,
    o2: Observable<T2>,
    o3: Observable<T3>,
    o4: Observable<T4>,
    o5: Observable<T5>
): Observable<T1 | T2 | T3 | T4 | T5>;

export function merge<T>(...observables: readonly Observable<T>[]): Observable<T> {
    return from((innerObs: Observer<T>): void => {
        observables.forEach(obs => {
            obs.subscribe((nextEv: T) => {
                innerObs.next(nextEv);
            });
        });
    });
}

export function lift<T>(lifted: Observable<T>): Observable<T> {
    return from(o => {
        lifted.subscribe(o.next, o.complete);
    });
}

export interface UnaryFunction<T, R> {
    (source: T): R;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface OperatorFunction<T, R> extends UnaryFunction<Observable<T>, Observable<R>> {}

export function pipe<T1, R>(op1: UnaryFunction<T1, R>): UnaryFunction<T1, R>;
export function pipe<T1, T2, R>(
    op1: UnaryFunction<T1, T2>,
    op2: UnaryFunction<T2, R>
): UnaryFunction<T1, R>;
export function pipe<T1, T2, T3, R>(
    op1: UnaryFunction<T1, T2>,
    op2: UnaryFunction<T2, T3>,
    op3: UnaryFunction<T3, R>
): UnaryFunction<T1, R>;
export function pipe<T1, T2, T3, T4, R>(
    op1: UnaryFunction<T1, T2>,
    op2: UnaryFunction<T2, T3>,
    op3: UnaryFunction<T3, T4>,
    op4: UnaryFunction<T4, R>
): UnaryFunction<T1, R>;
export function pipe<T1, T2, T3, T4, T5, R>(
    op1: UnaryFunction<T1, T2>,
    op2: UnaryFunction<T2, T3>,
    op3: UnaryFunction<T3, T4>,
    op4: UnaryFunction<T4, T5>,
    op5: UnaryFunction<T5, R>
): UnaryFunction<T1, R>;

export function pipe<T, R>(...fns: readonly UnaryFunction<T, R>[]): UnaryFunction<T, R> {
    return (input: T) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return fns.reduce((source: any, fn) => {
            return fn(source);
        }, input);
    };
}
