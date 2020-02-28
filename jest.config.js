module.exports = {
    transform: {
        "\\.(ts|tsx)$": "ts-jest"
    },
    testRegex: "(/.*\\.(test|spec|tests))\\.(ts|tsx|js)$",
    globals: {
        "ts-jest": {
            tsConfig: "tsconfig.jest.json",
            diagnostics: true
        }
    },
    moduleFileExtensions: ["ts", "tsx", "js", "node"],
    moduleDirectories: ["node_modules"]
};
