import { constant, create, events, noop } from "./coals";
import { catchError, filter, map, switchMap, takeUntil } from "./operators";

describe("operators", () => {
    describe("map", () => {
        it("should map event value", () => {
            const value = constant(0);
            const mock = jest.fn();

            value.pipe(map(v => v * 2)).subscribe(mock);

            value.next(22);

            expect(mock).toHaveBeenCalledTimes(1);
            expect(mock).toHaveBeenCalledWith(44);
        });
    });

    describe("filter", () => {
        it("should filter event values", () => {
            const value = events<number>();
            const mock = jest.fn();

            value.pipe(filter(v => v > 1)).subscribe(mock);

            value.next(0);
            value.next(2);

            expect(mock).toHaveBeenCalledTimes(1);
            expect(mock).toHaveBeenCalledWith(2);
        });
    });

    describe("takeUntil", () => {
        it("should complete observabe when passed observable have event", () => {
            const obs = events();
            const notifier = events();
            const mock = jest.fn();

            obs.pipe(takeUntil(notifier)).subscribe(mock);

            obs.next(undefined);
            notifier.next(undefined);

            expect(obs.isCompleted.value()).toBe(true);
            expect(mock).toHaveBeenCalledTimes(1);
        });
    });

    describe("catchError", () => {
        it("should catch simple errors", () => {
            const obs = create(o => {
                o.error(new Error("Throw Error!"));
            });

            const mock = jest.fn();

            obs.pipe(catchError(mock)).subscribe(noop);

            expect(mock).toHaveBeenCalledTimes(1);
            expect(mock).toHaveBeenCalledWith(new Error("Throw Error!"));
        });

        it("should catch native throw errors", () => {
            const obs = create(() => {
                throw new Error("Throw Error!");
            });

            const mock = jest.fn();

            obs.pipe(catchError(mock)).subscribe(noop);

            expect(mock).toHaveBeenCalledTimes(1);
            expect(mock).toHaveBeenCalledWith(new Error("Throw Error!"));
        });
    });

    describe("switchMap", () => {
        it("should complete previous and continue fire events from new observable", () => {
            const obs = create<number>(o => {
                o.next(1);
            });

            const switchedEvents = events<number>();

            const mock = jest.fn();

            obs.pipe(switchMap(() => switchedEvents)).subscribe(
                mock
            );

            switchedEvents.next(2);
            switchedEvents.next(3);

            expect(obs.isCompleted.value()).toBe(true);

            expect(mock).toHaveBeenCalledTimes(2);
            expect(mock).toHaveBeenNthCalledWith(1, 2);
            expect(mock).toHaveBeenNthCalledWith(2, 3);
        });
    });
});
