import coals from "./coals";

describe("Coals", () => {
    it("should create stream", () => {
        const s = coals(123);

        console.log(s)

        expect(s).toHaveProperty("completed");
    })
});