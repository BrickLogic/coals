type StreamType<T> = T | undefined;

type NextSubscriber<T> = (nextValue: StreamType<T>) => void;
type CompleteSubscribe = () => void;
type ErrorSubscribe = <T extends Error>(err: T) => void;

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

    const state: Atom<T> = {
        isAtom: IsAtom.TRUE,
        value: () => v,
        valueOf: () => v,

        watchers,

        addWatch,
        update,
        reset
    };

    return state;
}

export class Coal<T> {
    private atom: Atom<T>;

    private isActive: boolean;

    public constructor(initValue: T) {
        // super();
        this.isActive = true;
        this.atom = atom(initValue);
    }

    public valueOf(): T {
        return get(this.atom);
    }

    public next(nextValue: T): T {
        if (!this.isActive) {
            return nextValue;
        }

        this.atom.update(nextValue);

        return nextValue;
    }

    public subscribe(callback: AtomChangeCallback<T>, complete?: AtomResetCallback): () => void {
        return this.atom.addWatch(callback, complete);
    }

    public complete(): void {
        this.isActive = false;

        this.atom.reset();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public call(nextValue?: T): T {
        if (typeof nextValue === "undefined") {
            return get(this.atom);
        }

        this.next(nextValue);

        return nextValue;
    }
}

interface CoalFn<T> extends Coal<T> {
    (): T;
    (n: T): T;
}

export function coals<T>(initValue: T): CoalFn<T> {
    const c = new Coal(initValue);

    function coalHandler(nextValue?: T): T {
        return c.call(nextValue);
    }

    // eslint-disable-next-line no-proto
    coalHandler.__proto__ = c;

    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    return coalHandler;
}

export function combine<T, K>(
    coalsList: readonly CoalFn<T>[],
    producer: (...args: readonly T[]) => K
) {
    return () => {
        const args = coalsList.reduce((acc, coal) => {
            return [...acc, coal()];
        }, [] as readonly T[]);

        return producer(...args);
    };
}

/*
 * const v = coals(1);
 * const z = coals(2);
 *
 *
 * const x = combine([v, z], (v, z) => {
 *   return v + z;
 * });
 *
 * console.log(x) // 3
 *
 *
 * const y = merge(
 *   v,
 *   z
 * );
 *
 * console.log(y); // 2
 * v(8);
 *
 * console.log(y); // 8
 *
 * const iv = interval();
 *
 * const i = interval(10);
 *
 * const unsubscribe = i.subscrine(() => {
 *   console.log('count each 10 ms')
 * });
 *
 * */

class Subscription {
    public subscribed = true;

    public constructor(private onUnsubscribe: TeardownCallback | void) {}

    public unsubscribe(): void {
        if (!this.subscribed) {
            return;
        }

        this.subscribed = false;

        if (this.onUnsubscribe) {
            this.onUnsubscribe();
        }
    }
}

export const SUBSCRIBER_SYMBOL = Symbol("SUBSCRIBER_SYMBOL");

// TODO: extends interface with Subscription class ???
export class Subscriber<T> {
    public subscription?: Subscription;

    public [SUBSCRIBER_SYMBOL]: true;

    public constructor(
        private readonly nextSubscriber?: NextSubscriber<T>,
        private readonly completeSubscriber?: CompleteSubscribe,
        private readonly errorSubscriber?: ErrorSubscribe
    ) {}

    public subscribe(onUnsubscribe: TeardownCallback | void): Subscription {
        this.subscription = new Subscription(onUnsubscribe);

        return this.subscription;
    }

    public unsubscribe(): void {
        if (!this.subscription || !this.subscription.subscribed) {
            throw new Error("Subscriber not subscribed yet");
        }

        this.subscription.unsubscribe();
    }

    public complete(): void {
        this.unsubscribe();

        if (this.completeSubscriber) {
            this.completeSubscriber();
        }
    }

    public next(value: StreamType<T>): void {
        if (this.subscription && this.subscription.subscribed && this.nextSubscriber) {
            try {
                this.nextSubscriber(value);
            } catch (e) {
                if (this.errorSubscriber) {
                    this.errorSubscriber(e);
                }
            }
        }
    }
}

type TeardownCallback = () => void;
export type ObserverSubscription<T> = (observer: Subscriber<T>) => TeardownCallback | void;

export const OBSERVABLE_SYMBOL = Symbol("OBSERVABLE_SYMBOL");

export class Observable<T> {
    public completed: boolean;

    public observers: readonly Subscriber<T>[];

    public source?: Observable<T>;

    public [OBSERVABLE_SYMBOL]: true;

    public constructor(private observerSubscription?: ObserverSubscription<T>) {
        this.completed = false;
        this.observers = [];
    }

    public subscribe(
        nextCallback?: NextSubscriber<T> | Subscriber<T>,
        completeCallback?: CompleteSubscribe,
        errorCallback?: ErrorSubscribe
    ): Subscription {
        if (this.source) {
            return this.source.subscribe(nextCallback, completeCallback, errorCallback);
        }

        let teardown: TeardownCallback | void;

        const innerCompleteCallback = (): void => {
            this.onComplete();
            if (completeCallback) {
                completeCallback();
            }
        };

        const innerNextCallback: NextSubscriber<T> = nextValue => {
            if (!nextCallback) {
                return;
            }

            if (nextCallback instanceof Subscriber) {
                nextCallback.next(nextValue);
                return;
            }

            nextCallback(nextValue);
        };

        const subscriber = new Subscriber<T>(
            innerNextCallback,
            innerCompleteCallback,
            errorCallback
        );
        const subscription = subscriber.subscribe(() => {
            this.onUnsubscribe(subscriber);
            if (teardown) {
                teardown();
            }
        });

        if (this.observerSubscription) {
            teardown = this.observerSubscription(subscriber);
            this.observers = [...this.observers, subscriber];
        }

        return subscription;
    }

    public onUnsubscribe(subscriber: Subscriber<T>): void {
        this.observers = this.observers.filter(o => o !== subscriber);
    }

    private onComplete(): void {
        this.completed = true;
    }

    public complete(): void {
        this.completed = true;

        this.observers.forEach(subscriber => {
            subscriber.complete();
            subscriber.unsubscribe();
        });
    }
}

export class Subject<T> extends Observable<T> {
    public constructor() {
        // eslint-disable-next-line constructor-super
        super(() => undefined);
    }

    public next(nextValue: StreamType<T>): void {
        if (this.completed) {
            throw new Error("Observable already completed");
        }

        this.observers.forEach(o => o.next(nextValue));
    }
}

export const interval = (intervalTime: number): Observable<number> => {
    return new Observable(s => {
        let counter = 0;
        const i = setInterval(() => {
            counter += 1;
            s.next(counter * intervalTime);
        }, intervalTime);

        return () => {
            clearInterval(i);
        };
    });
};

export const timeout = (timeoutTime: number): Observable<void> => {
    return new Observable(s => {
        const t = setTimeout(() => {
            s.next();
            s.complete();
        }, timeoutTime);

        return () => {
            clearTimeout(t);
        };
    });
};
