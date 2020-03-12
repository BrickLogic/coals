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

export const noop: Noop = () => undefined;

type Teardown = undefined | void | Noop;
type NextCallback<T> = (nextValue: T) => void;
type ErrorCallback = <T extends Error>(e: T) => void;

interface Observer<T> {
    readonly next: NextCallback<T>;
    readonly complete: Noop;
    readonly error: ErrorCallback;
}

interface Subscription<T> {
    readonly observer: Observer<T>;
    readonly teardown: (teardown: Teardown) => void;
    readonly unsubscribe: Noop;
}

const createObserver = <T>(
    onNext: NextCallback<T>,
    onComplete: Noop,
    onError: ErrorCallback
): Observer<T> => {
    const next: NextCallback<T> = ev => onNext(ev);
    const complete: Noop = () => onComplete();
    const error: ErrorCallback = e => onError(e);

    return {
        next,
        complete,
        error
    };
};

const createSubscription = <T>(
    onNext: NextCallback<T>,
    onComplete: Noop,
    onError: ErrorCallback
): Subscription<T> => {
    let teardown: Teardown;
    const isSubscribed = atom(true);

    const internalOnNext: NextCallback<T> = ev => {
        if (isSubscribed.value()) {
            onNext(ev);
        }
    };

    const observer = createObserver(internalOnNext, onComplete, onError);
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
    complete?: AtomResetCallback,
    error?: ErrorCallback
) => () => void;

export interface UnaryFunction<T, R> {
    (source: T): R;
}

export function pipe<T>(): UnaryFunction<T, T>;
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

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface OperatorFunction<T, R> extends UnaryFunction<Observable<T>, Observable<R>> {}

interface ExtendedObservable<T> {
    readonly isCoal: true;
    readonly isObservable: true;
    readonly subscribe: Subscribe<T>;
    readonly complete: Noop;
    readonly isCompleted: Atom<boolean>;
    readonly subscriptions: Atom<readonly Subscription<T>[]>;

    pipe(): Observable<T>;
    pipe<R>(op1: OperatorFunction<T, R>): Observable<R>;
    pipe<T1, R>(op1: OperatorFunction<T, T1>, op2: OperatorFunction<T1, R>): Observable<R>;
}

export type Observable<T> = Omit<ExtendedObservable<T>, "subscriptions">;

type CreateExtendedObservable = <T>(
    eventProducer: CoalProducerObservable<T>
) => ExtendedObservable<T>;

const createExtendedObservable: CreateExtendedObservable = <T>(
    eventProducer: CoalProducerObservable<T>
): ExtendedObservable<T> => {
    const isCompleted = atom(false);
    const subscriptions = atom<readonly Subscription<T>[]>([]);

    const subscribe: Subscribe<T> = (callbackOrCoal, complete, error) => {
        const onComplete = (): void => {
            if (complete) {
                complete();
            }
        };

        const onError: ErrorCallback = (e): void => {
            if (typeof callbackOrCoal === "object") {
                callbackOrCoal.error(e);
                return;
            }

            if (error) {
                error(e);
            }
        };

        const onNext = (ev: T): void => {
            if (isCompleted.value()) {
                return;
            }

            if (typeof callbackOrCoal === "object") {
                callbackOrCoal.next(ev);
                return;
            }

            try {
                callbackOrCoal(ev);
            } catch (e) {
                onError(e);
            }
        };

        const sub = createSubscription(onNext, onComplete, onError);

        try {
            const teardown = eventProducer(sub.observer);

            sub.teardown(teardown);
        } catch (e) {
            onError(e);
        }

        const unsubscribe = (): void => {
            onComplete();
            sub.unsubscribe();
        };

        subscriptions.update([...subscriptions.value(), sub]);

        return unsubscribe;
    };

    const complete = (): void => {
        isCompleted.update(true);
        subscriptions.value().forEach(sub => {
            sub.unsubscribe();
            sub.observer.complete();
        });
    };

    return {
        isCoal: true,
        isObservable: true,
        complete,
        subscribe,
        subscriptions,
        isCompleted,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pipe(...operators: readonly OperatorFunction<any, any>[]) {
            if (operators.length === 0) {
                return this;
            }

            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            // @ts-ignore
            return pipe(...operators)(this);
        }
    };
};

export type From = <T>(eventProducer: CoalProducerObservable<T>) => Observable<T>;

export const create: From = <T>(eventProducer: CoalProducerObservable<T>): Observable<T> => {
    const { subscriptions: _, ...observable } = createExtendedObservable(eventProducer);

    return observable;
};

type ValueGetter<T> = () => T;
type SubjectNextCallback<T> = (nextValue: T) => void;

export interface Subject<T> extends Observable<T> {
    readonly isSubject: true;
    readonly next: SubjectNextCallback<T>;
    readonly error: ErrorCallback;
}

export interface BehaviorSubject<T> extends Subject<T> {
    readonly value: ValueGetter<T>;
}

type Constant = <T>(initValue: T) => BehaviorSubject<T>;
type Events = <T>() => Subject<T>;

interface Observer<T> {
    readonly next: NextCallback<T>;
    readonly complete: () => void;
}

export const events: Events = <T>(): Subject<T> => {
    const { subscriptions, subscribe, ...observable } = createExtendedObservable<T>(noop);

    const next: NextCallback<T> = nextValue => {
        if (observable.isCompleted.value()) {
            return;
        }

        subscriptions.value().forEach(sub => {
            sub.observer.next(nextValue);
        });
    };

    const error: ErrorCallback = e => {
        observable.isCompleted.update(true);
        subscriptions.value().forEach(sub => {
            sub.observer.error(e);
            sub.unsubscribe();
        });
    };

    const innerSubscribe = (
        callbackOrCoal: SubscriptionCallback<T> | Subject<T>,
        complete?: Noop,
        errorCallback?: ErrorCallback
    ): Noop => {
        return subscribe(
            ev => {
                if (typeof callbackOrCoal === "object") {
                    callbackOrCoal.next(ev);
                    return;
                }

                callbackOrCoal(ev);
            },
            complete,
            errorCallback
        );
    };

    return {
        ...observable,
        subscribe: innerSubscribe,
        error,
        next,
        isSubject: true
    };
};

export const constant: Constant = <T>(initValue: T): BehaviorSubject<T> => {
    const subjectValue = atom(initValue);
    const { next, subscribe, ...eventsInstance } = events<T>();

    const innerNext: NextCallback<T> = nextValue => {
        if (eventsInstance.isCompleted.value()) {
            return;
        }

        subjectValue.update(nextValue);
        next(nextValue);
    };

    const innerSubscribe = (
        callbackOrCoal: SubscriptionCallback<T> | Subject<T>,
        complete?: Noop,
        errorCallback?: ErrorCallback
    ): Noop => {
        if (typeof callbackOrCoal === "object") {
            callbackOrCoal.next(subjectValue.value());
        }

        return subscribe(callbackOrCoal, complete, errorCallback);
    };

    return {
        ...eventsInstance,
        value: () => subjectValue.value(),
        subscribe: innerSubscribe,
        next: innerNext,
        isSubject: true
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
    return create((innerObs: Observer<T>): void => {
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
    return create(observer => {
        const timer = setTimeout(() => observer.next(timeoutValue), timeoutValue);

        return () => clearTimeout(timer);
    });
}

export function interval(intervalValue: number): Observable<number> {
    return create(observer => {
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
    return create((innerObs: Observer<T>): void => {
        observables.forEach(obs => {
            obs.subscribe((nextEv: T) => {
                innerObs.next(nextEv);
            });
        });
    });
}

export function lift<T>(lifted: Observable<T>): Observable<T> {
    return create(o => {
        lifted.subscribe(o.next, o.complete, o.error);
    });
}
