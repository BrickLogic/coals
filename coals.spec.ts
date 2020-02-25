import { coals } from "./coals";

describe("AtomCoals", () => {
    it("should have a value", () => {
        const c = coals(123);

        expect(c.value()).toBe(123);
    });

    it("should fire new values on change", () => {
        return new Promise(done => {
            const c = coals(123);

            c.subscribe(newValue => {
                expect(newValue).toBe(321);
                done();
            });

            c.next(321);
        });
    });

    describe("Optional", () => {
        it("should have optional value", () => {
            const c = coals();

            expect(c.value()).toBe(undefined);
        });

        it("should fire new events", () => {
            return new Promise(done => {
                const c = coals();

                c.subscribe(newValue => {
                    expect(newValue).toBe(undefined);
                    done();
                });

                c.next();
            });
        });
    });

    // describe("operators", () => {
    //     describe("combine", () => {
    //         it("should combine", () => {
    //             const a = coals(1);
    //             const b = coals(2);
    //
    //             const c = combine([a, b], (va, vb) => va + vb);
    //
    //             expect(c()).toBe(3);
    //         });
    //
    //         it("combine should handle changes of combined stream", () => {
    //             const a = coals(1);
    //             const b = coals(2);
    //
    //             const c = combine([a, b], (va, vb) => va + vb);
    //
    //             expect(c()).toBe(3);
    //
    //             a.next(8);
    //
    //             expect(c()).toBe(10);
    //         });
    //     });
    // });
});
