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

// interface Subscription<T> {
//     readonly observer: Observer<T>;
//     readonly teardown: (teardown: Teardown) => void;
//     readonly unsubscribe: Noop;
// }
//
// const createObserver = <T>(onNext: NextCallback<Optional<T>>, onComplete: Noop): Observer<T> => {
//     const next: NextCallback<Optional<T>> = ev => onNext(ev);
//     const complete: Noop = () => onComplete();
//
//     return {
//         next,
//         complete
//     };
// };

// const createSubscription = <T>(
//     onNext: NextCallback<Optional<T>>,
//     onComplete: Noop
// ): Subscription<T> => {
//     let teardown: Teardown;
//
//     const observer = createObserver(onNext, onComplete);
//     const unsubscribe = (): void => teardown && teardown();
//
//     const addTeardown = (onTeardown: Teardown): void => {
//         teardown = onTeardown;
//     };
//
//     return {
//         observer,
//         unsubscribe,
//         teardown: addTeardown
//     };
// };

type Optional<T> = T | undefined;

// type NotFunction<T> = T extends Function ? never : T;
// type CoalValue<T> = Optional<NotFunction<T>>;

type CoalProducerObservable<T> = (o: Observer<T>) => Teardown;
// type CoalProducerValue<T> = CoalProducerObservable<T> | CoalValue<T>;

type SubscriptionCallback<T> = (nextValue?: T) => void;
type NextCallback<T> = (nextValue?: T) => void;
type ValueGetter<T> = () => T;
type Subscribe<T> = (
    callback: SubscriptionCallback<Optional<T>> | Subject<Optional<T>>,
    complete?: AtomResetCallback
) => () => void;

interface CoalObservable<T> {
    readonly isCoal: true;
    readonly subscribe: Subscribe<T>;
    readonly complete: () => void;
}

export type From<T> = (eventProducer: CoalProducerObservable<T>) => CoalObservable<T>;

interface Subject<T> {
    readonly isSubject: true;
    readonly value: ValueGetter<Optional<T>>;
    readonly next: NextCallback<Optional<T>>;
    readonly subscribe: Subscribe<T>;
    readonly complete: () => void;
}

type Of = <T>(initValue?: Optional<T>) => Subject<Optional<T>>;

interface Observer<T> {
    readonly next: NextCallback<Optional<T>>;
    readonly complete: () => void;
}

export const of: Of = <T>(initValue: Optional<T>): Subject<Optional<T>> => {
    const a = atom(initValue);
    const isCompleted = atom(true);

    const value: ValueGetter<Optional<T>> = () => a.valueOf();
    const next: NextCallback<Optional<T>> = nextValue => {
        if (!get(isCompleted)) {
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

        const subscription = a.addWatch(callbackOrCoal, complete);

        return subscription;
    };

    const complete = (): void => {
        isCompleted.update(false);
        a.reset();
    };

    return {
        isSubject: true,
        value,
        next,
        subscribe,
        complete
    };
};

// export const coalProducer = <T>(initValue?: CoalProducerValue<T>): Coal<T> => {
//     const a = atom(typeof initValue === "function" ? undefined : initValue);
//     const isCompleted = atom(true);
//
//     const value: ValueGetter<Optional<T>> = () => a.valueOf();
//     const next: NextCallback<Optional<T>> = nextValue => {
//         if (!get(isCompleted)) {
//             return;
//         }
//
//         a.update(nextValue);
//
//         return nextValue;
//     };
//
//     const subscribe: Subscribe<T> = (callbackOrCoal, complete) => {
//         if (typeof initValue === "function") {
//             const observableProducer = initValue as CoalProducerObservable<T>;
//
//             const onComplete = (): void => {
//                 if (complete) {
//                     complete();
//                 }
//             };
//
//             const sub: Subscription<T> = createSubscription<T>((ev): void => {
//                 if (typeof callbackOrCoal === "object") {
//                     callbackOrCoal.next(ev);
//                     // callbackOrCoal.subscribe(sub.observer.next, complete);
//                 } else {
//                     callbackOrCoal(ev);
//                 }
//             }, onComplete);
//
//             const teardown = observableProducer(sub.observer);
//
//             sub.teardown(teardown);
//
//             const globalCompleteWatcher = a.addWatch(
//                 () => undefined,
//                 () => {
//                     onComplete();
//                     globalCompleteWatcher();
//
//                     sub.unsubscribe();
//                 }
//             );
//
//             return () => {
//                 onComplete();
//                 globalCompleteWatcher();
//
//                 sub.unsubscribe();
//             };
//         }
//
//         if (typeof callbackOrCoal === "object") {
//             return callbackOrCoal.subscribe(next, complete);
//         }
//
//         return a.addWatch(callbackOrCoal, complete);
//     };
//
//     const complete = (): void => {
//         isCompleted.update(false);
//         a.reset();
//     };
//
//     return {
//         isCoal: true,
//         value,
//         next,
//         subscribe,
//         complete
//     };
// };
//
// export const coals = coalProducer;

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
