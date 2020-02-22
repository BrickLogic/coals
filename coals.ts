type NextSubscriber<T> = (nextValue: T) => void;
type CompleteSubscribe = () => void;
type ErrorSubscribe = <T extends Error>(err: T) => void;

class Subscriber<T> {
    public subscribed: boolean;

    public constructor(
        private readonly nextSubscriber?: NextSubscriber<T>,
        private readonly completeSubscriber?: CompleteSubscribe,
        private readonly errorSubscriber?: ErrorSubscribe
    ) {
        this.subscribed = true;
    }

    public unsubscribe(): void {
        this.subscribed = false;
    }

    public complete(): void {
        this.unsubscribe();

        if (this.completeSubscriber) {
            this.completeSubscriber();
        }
    }

    public next(value: T): void {
        if (this.subscribed && this.nextSubscriber) {
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

class Stream<T> {
    public constructor(
        public value: T,
        public completed: boolean,
        public subscribers: readonly Subscriber<T>[]
    ) {}

    public next(nextValue: T): void {
        if (this.completed) {
            throw new Error();
        }

        this.value = nextValue;

        this.subscribers.forEach(s => s.next(this.value));
    }

    public subscribe(
        nextCallback?: NextSubscriber<T>,
        completeCallback?: CompleteSubscribe,
        errorCallback?: ErrorSubscribe
    ): void {
        this.subscribers = [
            ...this.subscribers,
            new Subscriber<T>(nextCallback, completeCallback, errorCallback)
        ];
    }

    public complete(): void {
        this.completed = true;

        this.subscribers.forEach(subscriber => {
            subscriber.complete();
            subscriber.unsubscribe();
        });
    }
}

const coals = <T>(initialValue: T): Stream<T> => {
    return new Stream(initialValue, false, []);
};

export default coals;
