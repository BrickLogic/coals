type StreamType<T> = T | undefined;

type NextSubscriber<T> = (nextValue: StreamType<T>) => void;
type CompleteSubscribe = () => void;
type ErrorSubscribe = <T extends Error>(err: T) => void;

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

// TODO: extends interface with Subscription class ???
class Subscriber<T> {
    public subscription?: Subscription;

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

export class Observable<T> {
    public completed: boolean;

    public observers: readonly Subscriber<T>[];

    public constructor(private observerSubscription: ObserverSubscription<T>) {
        this.completed = false;
        this.observers = [];
    }

    public subscribe(
        nextCallback?: NextSubscriber<T>,
        completeCallback?: CompleteSubscribe,
        errorCallback?: ErrorSubscribe
    ): Subscription {
        let teardown: TeardownCallback | void;

        const innerCompleteCallback = (): void => {
            this.onComplete();
            if (completeCallback) {
                completeCallback();
            }
        };

        const subscriber = new Subscriber<T>(nextCallback, innerCompleteCallback, errorCallback);
        const subscription = subscriber.subscribe(() => {
            this.onUnsubscribe(subscriber);
            if (teardown) {
                teardown();
            }
        });

        teardown = this.observerSubscription(subscriber);
        this.observers = [...this.observers, subscriber];

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
