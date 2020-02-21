
type NextSubscriber<T> = (nextValue:  T) => void;
type CompleteSubscribe = () => void;
type ErrorSubscribe = <T extends Error>(err: T) => void;

class Subscriber<T> {
    constructor(
        readonly nextSubscriber?: NextSubscriber<T>,
        readonly completeSubscriber?: CompleteSubscribe,
        readonly errorSubscriber?: ErrorSubscribe
    ) {}

    public unsubscribe() {}
    public subscribe() {}
    public next(value: T) {
        if (this.nextSubscriber) {
            this.nextSubscriber(value);
        }
    };
}

class Stream<T> {
    constructor(private value: T, private completed: boolean, private subscribers: readonly Subscriber<T>[]) {}

    public next(nextValue: T) {
        if (this.completed) {
            throw new Error();
        }

        this.value = nextValue;

        this.subscribers.forEach((s) => s.next(this.value))
    }

    public subscribe(nextCallback: NextSubscriber<T>, completeCallback: CompleteSubscribe, errorCallback: ErrorSubscribe) {
        this.subscribers = [...this.subscribers, new Subscriber<T>(nextCallback, completeCallback, errorCallback)];
    }

    public complete() {
        this.completed = true;

        this.subscribers.forEach((subscriber) => {
            subscriber.unsubscribe();
        })
    }
}

const coals = function <T>(initialValue: T) {
    return new Stream(initialValue, false, []);
};

export default coals;
