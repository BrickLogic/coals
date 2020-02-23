import { Coal, coals, combine, interval, Observable, Subject, timeout } from "./coals";

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

    describe("interval", () => {
        jest.useFakeTimers();

        it("should fire N times", () => {
            const N = 10;
            const mock = jest.fn();

            interval(N).subscribe(mock);

            jest.advanceTimersByTime(N * N);

            expect(mock).toBeCalledTimes(N);
        });

        it("shouldn't complete", () => {
            const N = 10;
            const mock = jest.fn();
            const obs = interval(N);

            obs.subscribe(mock);

            jest.advanceTimersByTime(N * N);

            expect(obs.completed).toBe(false);
        });
    });

    describe("timeout", () => {
        jest.useFakeTimers();

        it("should fire N times", () => {
            const N = 10;
            const mock = jest.fn();

            timeout(N).subscribe(mock);

            jest.advanceTimersByTime(N * N);

            expect(mock).toBeCalledTimes(1);
        });

        it("should complete after timeout", () => {
            const N = 10;
            const mock = jest.fn();

            const obs = timeout(N);

            obs.subscribe(mock);

            jest.advanceTimersByTime(N * N);

            expect(obs.completed).toBe(true);
        });
    });
});

describe("AtomCoals", () => {
    it("should have a value", () => {
        const c = coals(123);

        expect(c()).toBe(123);
    });

    it("should fire new values on change", () => {
        return new Promise(done => {
            const c = coals(123);

            c.subscribe(newValue => {
                expect(newValue).toBe(321);
                done();
            });

            c(321);
        });
    });

    it("should be instance of Coal", () => {
        const c = coals(123);

        // eslint-disable-next-line no-undef
        expect(c instanceof Coal).toBe(true);
    });

    describe("operators", () => {
        describe("combine", () => {
            it("should combine", () => {
                const a = coals(1);
                const b = coals(2);

                const c = combine([a, b], (va, vb) => va + vb);

                expect(c()).toBe(3);
            });

            it("combine should handle changes of combined stream", () => {
                const a = coals(1);
                const b = coals(2);

                const c = combine([a, b], (va, vb) => va + vb);

                expect(c()).toBe(3);

                a(8);

                expect(c()).toBe(10);
            });
        });
    });
});
