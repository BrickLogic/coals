import { combine, create, interval, constant, pipe, timeout, events } from "./coals";

describe("Observable", () => {
    it("should fire event from observable", () => {
        return new Promise(done => {
            const d = Date.now();
            const c = create(o => o.next(d));

            c.subscribe(newValue => {
                expect(newValue).toBe(d);
                done();
            });
        });
    });

    it("should fire complete when observable complete subscription", () => {
        return new Promise(done => {
            const c = create(o => o.complete());

            c.subscribe(() => undefined, done);
        });
    });

    it("should fire complete when coals complete", () => {
        return new Promise(done => {
            const c = create(() => undefined);

            c.subscribe(() => undefined, done);

            c.complete();
        });
    });

    it("should forward events to subscribed coals", () => {
        const c = create<number>(o => {
            o.next(22);
        });
        const nc = constant<number>(0);

        c.subscribe(nc);

        expect(nc.value()).toBe(22);
    });

    it("should handle error of observable", () => {
        const c = create<number>(o => {
            o.error(new Error("some error"));
        });

        const f = jest.fn();

        c.subscribe(
            (): void => undefined,
            (): void => undefined,
            f
        );

        expect(f).toHaveBeenCalledTimes(1);
        expect(f).toHaveBeenLastCalledWith(new Error("some error"));
    });
});

describe("Subject", () => {
    it("should fire next event", () => {
        const subj = events<number>();
        const mock = jest.fn();

        subj.subscribe(mock);

        subj.next(123);

        expect(mock).toHaveBeenCalledTimes(1);
        expect(mock).toHaveBeenCalledWith(123);
    });

    it("should forward events to subscribed events", () => {
        const c = events<number>();
        const nc = events<number>();

        c.subscribe(nc);

        const mock = jest.fn();

        nc.subscribe(mock);

        c.next(44);

        expect(mock).toHaveBeenCalledTimes(1);
        expect(mock).toHaveBeenCalledWith(44);
    });

    it("should call error callback when subject fire error", () => {
        const c = events();

        const mock = jest.fn();

        c.subscribe(
            () => undefined,
            () => undefined,
            mock
        );

        c.error(new Error("err"));

        expect(mock).toHaveBeenCalledTimes(1);
        expect(mock).toHaveBeenCalledWith(new Error("err"));
    });

    it("should pass error to subscribers", () => {
        const c = create<number>(o => {
            o.error(new Error("some error"));
        });

        const nc = events<number>();
        const f = jest.fn();

        nc.subscribe(
            (): void => undefined,
            (): void => undefined,
            f
        );

        c.subscribe(nc);

        expect(f).toHaveBeenCalledTimes(1);
        expect(f).toHaveBeenLastCalledWith(new Error("some error"));
    });
});

describe("Constant", () => {
    it("should have a value", () => {
        const c = constant(123);

        expect(c.value()).toBe(123);
    });

    it("should fire new values on change", () => {
        return new Promise(done => {
            const c = constant(123);

            c.subscribe(newValue => {
                expect(newValue).toBe(321);
                done();
            });

            c.next(321);
        });
    });

    it("should not reset value after complete", () => {
        const c = constant(123);
        c.next(321);

        c.complete();

        c.next(333);

        expect(c.value()).toBe(321);
    });
});

describe("pipe", () => {
    it("should pipe two functions together", () => {
        const a = (x: number): number => x + x;
        const b = (x: number): number => x - 1;

        const c = pipe(a, b);
        expect(c(1)).toBe(1);
        expect(c(10)).toBe(19);
    });
});

describe("operators", () => {
    describe("combine", () => {
        it("should combine", () => {
            const a = events<number>();
            const b = events<number>();

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
