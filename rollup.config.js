import babel from "@rollup/plugin-babel";
import copy from "rollup-plugin-copy";

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

// TODO: sourcemaps and banners

export default function rollup() {
  const SOURCE_DIR = "src";
  const OUTPUT_DIR = "dist";
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
          file: `${OUTPUT_DIR}/${packageJson.browser}`,
          format: "umd",
          name: "RemixValidityState",
          globals: { react: "React" },
          ...output,
        },
        {
          file: `${OUTPUT_DIR}/${packageJson.main}`,
          format: "cjs",
          ...output,
        },
        {
          file: `${OUTPUT_DIR}/${packageJson.module}`,
          format: "esm",
          ...output,
        },
      ],
      external: ["react"],
      plugins: [
        babel({
          exclude: /node_modules/,
          babelHelpers: "bundled",
          presets: [
            ["@babel/preset-env", { loose: true }],
            "@babel/preset-react",
            "@babel/preset-typescript",
          ],
          extensions: [".ts", ".tsx"],
        }),
        copy({
          targets: [
            { src: "package.json", dest: OUTPUT_DIR },
            { src: "README.md", dest: OUTPUT_DIR },
            { src: "LICENSE.md", dest: OUTPUT_DIR },
            {
              src: "src/index.tsx",
              dest: "demo-app/app",
              rename: "remix-validity-state.tsx",
            },
          ],
          verbose: true,
        }),
      ],
    },
  ];
}
