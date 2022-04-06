import babel from "@rollup/plugin-babel";

import packageJson from "./package.json";

const banner = `/**
 * ${packageJson.name} v${packageJson.version}
 *
 * Copyright (c) Matt Brophy (matt@brophy.org)
 *
 * This source code is licensed under the ISC license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license ISC
 */`;

export default function rollup() {
  const SOURCE_DIR = "src";
  const output = {
    sourcemap: true,
    banner,
  };

  return [
    // ESM module for bundlers
    {
      input: `${SOURCE_DIR}/index.tsx`,
      output: [
        {
          file: packageJson.browser,
          format: "umd",
          name: "RemixValidityState",
          globals: { react: "React" },
          ...output,
        },
        {
          file: packageJson.main,
          format: "cjs",
          ...output,
        },
        {
          file: packageJson.module,
          format: "esm",
          ...output,
        },
      ],
      external: ["react"],
      plugins: [
        babel({
          exclude: /node_modules/,
          babelHelpers: "runtime",
          presets: [
            ["@babel/preset-env", { loose: true }],
            "@babel/preset-react",
            "@babel/preset-typescript",
          ],
          plugins: [
            [
              "@babel/plugin-transform-runtime",
              {
                helpers: true,
                regenerator: true, // We polyfill so we don't need regenerator.
              },
            ],
          ],
          extensions: [".ts", ".tsx"],
        }),
      ],
    },
  ];
}
