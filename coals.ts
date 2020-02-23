
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
 * console.log(y()); // 8
 *
 * const iv = interval();
 *
 * const i = interval(10);
 *
 * const unsubscribe = i.subscrine(() => {
 *   console.log('count each 10 ms')
 * });
 *
 * const unsub = on([v, z], (vv, vz) => {
 *  console.log(vv + vz);
 * })
 *
 * // will log 10
 *
 * v(20);
 *
 * // will log 22
 *
 * unsub();
 *
 * v(30);
 *
 * // will log nothing
 *
 * */

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
