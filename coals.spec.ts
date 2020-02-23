import { Observable, Subject } from "./coals";

describe("Coals", () => {
    describe("Observable", () => {
        it("should create observable", () => {
            // eslint-disable-next-line no-new,@typescript-eslint/no-empty-function
            new Observable(() => {});
        });

        it("should call subscription callback", () => {
            return new Promise(done => {
                const o = new Observable(() => done());

                o.subscribe();
            });
        });

        it("should fire new value when observer emit new value", () => {
            return new Promise(done => {
                const newValue = 123;

                const observable = new Observable(o => {
                    o.next(newValue);
                });

                observable.subscribe(nextValue => {
                    expect(nextValue).toBe(newValue);
                    done();
                });
            });
        });

        it("should call unsubscribe callback when subscripton unsubscribed", () => {
            return new Promise(done => {
                const observable = new Observable(() => {
                    return () => {
                        done();
                    };
                });

                const subscription = observable.subscribe();

                subscription.unsubscribe();
            });
        });

        it("should prevent multiple unsubscribe", () => {
            return new Promise(done => {
                const teardown = jest.fn(() => {
                    expect(teardown).toBeCalledTimes(1);
                    done();
                });

                const observable = new Observable(() => {
                    return teardown;
                });

                const subscription = observable.subscribe();

                subscription.unsubscribe();
                subscription.unsubscribe();
            });
        });

        it("should call unsubscribe callback when observable completed", () => {
            return new Promise(done => {
                const observable = new Observable(() => {
                    return () => {
                        done();
                    };
                });

                observable.subscribe();
                observable.complete();
            });
        });

        it("should add subscribers on subscribe", () => {
            const s = new Observable(() => undefined);

            // eslint-disable-next-line @typescript-eslint/no-empty-function
            s.subscribe(() => {});
            expect(s.observers.length).toBe(1);
        });

        it("should call complete callback when stream is completed", () => {
            return new Promise(resolve => {
                const s = new Observable(() => undefined);

                s.subscribe(
                    // eslint-disable-next-line @typescript-eslint/no-empty-function
                    () => {},
                    () => {
                        expect(s.completed).toBe(true);

                        resolve();
                    }
                );

                s.complete();
            });
        });
    });

    describe("Subject", () => {
        it("should create stream", () => {
            const s = new Subject();

            expect(s).toHaveProperty("completed");
            expect(s).toHaveProperty("observers");

            expect(s.observers).toEqual([]);
            expect(s.completed).toBe(false);
        });

        it("should call subscribe callback on new value", () => {
            return new Promise(resolve => {
                const s = new Subject();
                const submittedValue = 321;

                s.subscribe(nextValue => {
                    expect(nextValue).toBe(submittedValue);
                    resolve();
                });

                s.next(submittedValue);
            });
        });

        it("should set value to stream", () => {
            const s = new Subject();
            const newValue = 321;

            s.next(newValue);
            expect(s.value).toBe(newValue);
        });

        it("should notify subscribers of changes", () => {
            return new Promise(resolve => {
                const s = new Subject();
                const newValue = 321;

                s.subscribe(
                    nextValue => {
                        expect(nextValue).toBe(newValue);
                        resolve();
                    },
                    // eslint-disable-next-line @typescript-eslint/no-empty-function
                    () => {}
                );

                s.next(newValue);
                s.complete();
            });
        });
    });
});
