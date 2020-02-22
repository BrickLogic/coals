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

    it("should add subscribers on subscribe", () => {
        const s = coals(123);

        // eslint-disable-next-line @typescript-eslint/no-empty-function
        s.subscribe(() => {});
        expect(s.subscribers.length).toBe(1);
    });

    it("should call subscribe callback on new value", () => {
        return new Promise(resolve => {
            const s = coals(123);
            const submittedValue = 321;

            s.subscribe(nextValue => {
                expect(nextValue).toBe(submittedValue);
                resolve();
            });

            s.next(submittedValue);
        });
    });

    it("should call complete callback when stream is completed", () => {
        return new Promise(resolve => {
            const s = coals(123);

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

    it("should set value to stream", () => {
        const s = coals(123);
        const newValue = 321;

        s.next(newValue);
        expect(s.value).toBe(newValue);
    });

    it("should notify subscribers of changes", () => {
        return new Promise(resolve => {
            const s = coals(123);
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
