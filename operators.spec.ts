import {constant, events} from "./coals";
import {filter, map} from "./operators";

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
});
