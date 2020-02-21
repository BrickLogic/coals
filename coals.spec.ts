import coals from "./coals";

describe("Coals", () => {
    it("should create stream", () => {
        const s = coals(123);

        expect(s).toHaveProperty("completed");
        expect(s).toHaveProperty("value");
        expect(s).toHaveProperty("subscribers");

        expect(s.value).toBe(123);
        expect(s.subscribers).toEqual([]);
        expect(s.completed).toBe(false);
    });

    it("it should add subscribers on subscribe", () => {
        const s = coals(123);

        s.subscribe(() => {});
        expect(s.subscribers.length).toBe(1);
    });


    it("it should call subscribe callback on new value", (done) => {
        const s = coals(123);
        const submittedValue = 321;

        s.subscribe((nextValue) => {
            expect(nextValue).toBe(submittedValue);
            done();
        });

        s.next(submittedValue);
    });

    it("it should call complete callback when stream is completed", (done) => {
        const s = coals(123);

        s.subscribe(() => {}, () => {
            expect(s.completed).toBe(true);

            done();
        });

        s.complete();
    });
});