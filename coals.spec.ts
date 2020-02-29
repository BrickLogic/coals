import { combine, from, interval, of, timeout } from "./coals";

describe("Subject", () => {
    it("should have a value", () => {
        const c = of(123);

        expect(c.value()).toBe(123);
    });

    it("should fire new values on change", () => {
        return new Promise(done => {
            const c = of(123);

            c.subscribe(newValue => {
                expect(newValue).toBe(321);
                done();
            });

            c.next(321);
        });
    });

    it("should not reset value after complete", () => {
        const c = of(123);
        c.next(321);

        c.complete();

        c.next(333);

        expect(c.value()).toBe(321);
    });

    describe("Optional", () => {
        it("should have optional value", () => {
            const c = of();

            expect(c.value()).toBe(undefined);
        });

        it("should fire new events", () => {
            return new Promise(done => {
                const c = of();

                c.subscribe(newValue => {
                    expect(newValue).toBe(undefined);
                    done();
                });

                c.next();
            });
        });

        it("should forward events to subscribed coals", () => {
            const c = of<number>(22);
            const nc = of<number | undefined>();

            c.subscribe(nc);

            expect(nc.value()).toBe(22);

            c.next(44);

            expect(nc.value()).toBe(44);
        });
    });
});

describe("Observable", () => {
    it("should fire event from observable", () => {
        return new Promise(done => {
            const d = Date.now();
            const c = from(o => o.next(d));

            c.subscribe(newValue => {
                expect(newValue).toBe(d);
                done();
            });
        });
    });

    it("should fire complete when observable complete subscription", () => {
        return new Promise(done => {
            const c = from(o => o.complete());

            c.subscribe(() => undefined, done);
        });
    });

    it("should fire complete when coals complete", () => {
        return new Promise(done => {
            const c = from(() => undefined);

            c.subscribe(() => undefined, done);

            c.complete();
        });
    });

    it("should forward events to subscribed coals", () => {
        const c = from<number>(o => {
            o.next(22);
        });
        const nc = of<number>();

        c.subscribe(nc);

        expect(nc.value()).toBe(22);
    });
});

describe("operators", () => {
    describe("combine", () => {
        it("should combine", () => {
            const a = of();
            const b = of();

            const c = combine([a, b]);

            const subscribeMock = jest.fn();

            c.subscribe(subscribeMock);

            a.next(8);
            b.next(99);

            expect(subscribeMock).toBeCalledTimes(1);
            expect(subscribeMock).toBeCalledWith([8, 99]);
        });
    });

    describe("timeout", () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        it("should fire event by timeout", () => {
            const t = timeout(100);

            const mock = jest.fn();

            t.subscribe(mock);

            jest.advanceTimersByTime(100);

            expect(mock).toBeCalledTimes(1);
            expect(mock).toBeCalledWith(100);
        });

        it("shouldn't fire event by timeout if unsubscribed", () => {
            const t = timeout(100);

            const mock = jest.fn();

            const unsub = t.subscribe(mock);

            unsub();

            jest.advanceTimersByTime(100);

            expect(mock).toBeCalledTimes(0);
        });

        it("shouldn't fire event by timeout if completed", () => {
            const t = timeout(100);

            const mock = jest.fn();

            t.subscribe(mock);

            t.complete();

            jest.advanceTimersByTime(100);

            expect(mock).toBeCalledTimes(0);
        });
    });

    describe("interval", () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        it("should fire event by interval", () => {
            const t = interval(100);

            const mock = jest.fn();

            t.subscribe(mock);

            jest.advanceTimersByTime(200);

            expect(mock).toBeCalledTimes(2);
            expect(mock).toHaveBeenNthCalledWith(1, 100);
            expect(mock).toHaveBeenNthCalledWith(2, 200);
        });

        it("shouldn't fire event by timeout if unsubscribed", () => {
            const t = interval(100);

            const mock = jest.fn();

            const unsub = t.subscribe(mock);

            unsub();

            jest.advanceTimersByTime(200);

            expect(mock).toBeCalledTimes(0);
        });

        it("shouldn't fire event by timeout if completed", () => {
            const t = interval(100);

            const mock = jest.fn();

            t.subscribe(mock);

            t.complete();

            jest.advanceTimersByTime(100);

            expect(mock).toBeCalledTimes(0);
        });
    });
});
