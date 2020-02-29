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

interface Observer<T> {
    readonly next: NextCallback<Optional<T>>;
    readonly complete: Noop;
}

interface Subscription<T> {
    readonly observer: Observer<T>;
    readonly teardown: (teardown: Teardown) => void;
    readonly unsubscribe: Noop;
}

const createObserver = <T>(onNext: NextCallback<Optional<T>>, onComplete: Noop): Observer<T> => {
    const next: NextCallback<Optional<T>> = ev => onNext(ev);
    const complete: Noop = () => onComplete();

    return {
        next,
        complete
    };
};

const createSubscription = <T>(
    onNext: NextCallback<Optional<T>>,
    onComplete: Noop
): Subscription<T> => {
    let teardown: Teardown;
    const isSubscribed = atom(true);

    const internalOnNext: NextCallback<Optional<T>> = ev => {
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

type Optional<T> = T | undefined;

type CoalProducerObservable<T> = (o: Observer<T>) => Teardown;

type SubscriptionCallback<T> = (nextValue?: T) => void;
type NextCallback<T> = (nextValue?: T) => void;
type ValueGetter<T> = () => T;
type Subscribe<T> = (
    callback: SubscriptionCallback<Optional<T>> | Subject<Optional<T>>,
    complete?: AtomResetCallback
) => () => void;

interface CoalObservable<T> {
    readonly isCoal: true;
    readonly isObservable: true;
    readonly subscribe: Subscribe<Optional<T>>;
    readonly complete: () => void;
}

export type From = <T>(eventProducer: CoalProducerObservable<T>) => CoalObservable<T>;

export const from: From = <T>(eventProducer: CoalProducerObservable<T>): CoalObservable<T> => {
    const isCompleted = atom(false);
    const subscriptions = atom<readonly Noop[]>([]);

    const subscribe: Subscribe<Optional<T>> = (callbackOrCoal, complete) => {
        const onNext: NextCallback<Optional<T>> = ev => {
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

interface Subject<T> extends CoalObservable<T> {
    readonly isSubject: true;
    readonly value: ValueGetter<Optional<T>>;
    readonly next: NextCallback<Optional<T>>;
}

type Of = <T>(initValue?: Optional<T>) => Subject<Optional<T>>;

interface Observer<T> {
    readonly next: NextCallback<Optional<T>>;
    readonly complete: () => void;
}

export const of: Of = <T>(initValue: Optional<T>): Subject<Optional<T>> => {
    const a = atom(initValue);
    const isCompleted = atom(false);

    const value: ValueGetter<Optional<T>> = () => a.valueOf();
    const next: NextCallback<Optional<T>> = nextValue => {
        if (get(isCompleted)) {
            return;
        }

        a.update(nextValue);
    };

    const subscribe: Subscribe<Optional<T>> = (callbackOrCoal, complete) => {
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

const isCombined = <T>(values: readonly (Optional<T> | None)[]): boolean => {
    return values.every(v => v !== NONE_VALUE);
};

export const combine = <T>(
    ...observables: readonly CoalObservable<T>[]
): CoalObservable<readonly Optional<T>[]> => {
    const combineObservables = (innerObs: Observer<readonly Optional<T>[]>): void => {
        const values = atom<readonly (None | Optional<T>)[]>(observables.map(() => NONE_VALUE));

        observables.forEach((obs, i) => {
            obs.subscribe(nextV => {
                const valuesCopy = [...values.value()];

                valuesCopy[i] = nextV;

                values.update(valuesCopy);

                if (isCombined(valuesCopy)) {
                    innerObs.next(valuesCopy as readonly Optional<T>[]);
                }
            });
        });
    };

    return from(combineObservables);
};
