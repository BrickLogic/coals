import { Configuration } from "webpack";
import { join } from "path";

const ENV = process.env.NODE_ENV || "development";
const isProduction = ENV === "production";

export default ({
    mode: isProduction ? "production" : "development",
    devtool: isProduction ? "hidden-source-map" : "hidden-source-map",

    entry: "./esp32-test.ts",

    output: {
        path: `${__dirname}/dist`,
        filename: "bonfire.js"
    },

    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: "ts-loader",
                        options: {
                            configFile: join(__dirname, "tsconfig.json"),
                            transpileOnly: !isProduction
                        }
                    }
                ]
            },
            {
                enforce: "pre",
                test: /\.js$/,
                loader: "source-map-loader"
            }
        ]
    },

    resolve: {
        extensions: [".js", ".ts", ".json"],
    },

    node: {
        __dirname: false
    }
} as Configuration);
