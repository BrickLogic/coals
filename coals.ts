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

type SubscriptionCallback<T> = (nextValue?: T) => void;
type NextCallback<T> = (nextValue?: T) => T;
type ValueGetter<T> = () => T;
type Subscribe<T> = (
    callback: SubscriptionCallback<Optional<T>> | Coal<Optional<T>>,
    complete?: AtomResetCallback
) => () => void;

type Optional<T> = T | undefined;

interface Coal<T> {
    isCoal: true;
    value: ValueGetter<Optional<T>>;
    next: NextCallback<Optional<T>>;
    subscribe: Subscribe<T>;
    complete: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const coalProducer = <T = undefined>(initValue?: Optional<T>): Coal<T> => {
    const a = atom(initValue);
    const isActive = atom(true);

    const value: ValueGetter<Optional<T>> = () => a.valueOf();
    const next: NextCallback<Optional<T>> = nextValue => {
        if (!get(isActive)) {
            return nextValue;
        }

        a.update(nextValue);

        return nextValue;
    };

    const subscribe: Subscribe<T> = (callbackOrCoal, complete) => {
        if (typeof callbackOrCoal === "object") {
            return callbackOrCoal.subscribe(next);
        }

        return a.addWatch(callbackOrCoal, complete);
    };

    const complete = (): void => {
        isActive.update(false);
        a.reset();
    };

    return {
        isCoal: true,
        value,
        next,
        subscribe,
        complete
    };
};

export const coals = coalProducer;

// export function on<T, K>(
//     coalsList: readonly Coal<T>[],
//     cb: (...args: readonly T[]) => K
// ): () => void {
//     const callOnChange = (): K => cb(...combine(coalsList, (...c) => c)());
//
//     const subs = coalsList.map((c): (() => void) => {
//         return c.subscribe(callOnChange);
//     });
//
//     return () => subs.forEach(unsubscribe => unsubscribe());
// }

// export function combine<T, K>(
//     coalsList: readonly Coal<T>[],
//     producer: (...args: readonly T[]) => K
// ) {
//     return () => {
//         const args = coalsList.reduce((acc, coal) => {
//             return [...acc, coal.value()];
//         }, [] as readonly T[]);
//
//         return producer(...args);
//     };
// }

//
// export function interval(intervalTime: number): Coal<undefined> {
//     const c = coals(undefined);
//
//     const i = setInterval(() => c.next(undefined), intervalTime);
//
//     c.subscribe(
//         () => undefined,
//         () => clearInterval(i)
//     );
//
//     return c;
// }
//
// export function timeout(intervalTime: number): Coal<undefined> {
//     const c = coals(undefined);
//
//     const i = setTimeout(() => c.next(undefined), intervalTime);
//
//     c.subscribe(
//         () => undefined,
//         () => clearTimeout(i)
//     );
//
//     return c;
// }
//
// export function merge<T>(...streams: Coal<T>[]): Coal<T | undefined> {
//     const returnedStream = coals<T | undefined>(undefined);
//
//     const subs = streams.map(c => {
//         return c.subscribe(v => returnedStream.next(v));
//     });
//
//     returnedStream.subscribe(
//         () => undefined,
//         () => subs.forEach(unsubscribe => unsubscribe())
//     );
//
//     return returnedStream;
// }
