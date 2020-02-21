
type NextSubscriber<T> = (nextValue:  T) => void;
type CompleteSubscribe = () => void;
type ErrorSubscribe = <T extends Error>(err: T) => void;

class Subscriber<T> {
    public subscribed: boolean;

    constructor(
        readonly nextSubscriber?: NextSubscriber<T>,
        readonly completeSubscriber?: CompleteSubscribe,
        readonly errorSubscriber?: ErrorSubscribe
    ) {
        this.subscribed = true;
    }

    public unsubscribe() {
        this.subscribed = false;
    }

    public complete() {
        this.unsubscribe();

        if (this.completeSubscriber) {
            this.completeSubscriber();
        }
    }

    public next(value: T) {
        if (this.subscribed && this.nextSubscriber) {
            this.nextSubscriber(value);
        }
    };
}

class Stream<T> {
    constructor(public value: T, public completed: boolean, public subscribers: readonly Subscriber<T>[]) {}

    public next(nextValue: T) {
        if (this.completed) {
            throw new Error();
        }

        this.value = nextValue;

        this.subscribers.forEach((s) => s.next(this.value))
    }

    public subscribe(nextCallback?: NextSubscriber<T>, completeCallback?: CompleteSubscribe, errorCallback?: ErrorSubscribe) {
        this.subscribers = [...this.subscribers, new Subscriber<T>(nextCallback, completeCallback, errorCallback)];
    }

    public complete() {
        this.completed = true;

        this.subscribers.forEach((subscriber) => {
            subscriber.complete();
            subscriber.unsubscribe();
        })
    }
}

const coals = function <T>(initialValue: T) {
    return new Stream(initialValue, false, []);
};

export default coals;
