module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: "./tsconfig.eslint.json",
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ["dist", "src/database/migrations"],
  plugins: [
    "@typescript-eslint",
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  env: {
    node: true,
  },
  rules: {
    camelcase: "off",
    quotes: [
      "error", "double", { avoidEscape: true },
    ],
    semi: ["error", "always"],
    "semi-spacing": ["error", { "after": true, "before": false }],
    "semi-style": ["error", "last"],
    "no-cond-assign": "off",
    "no-case-declarations": "off",
    "no-unexpected-multiline": "error",
    "no-unreachable": "error",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_+.*$",
        varsIgnorePattern: "^_+.*$",
        caughtErrorsIgnorePattern: "^_+.*$",
        destructuredArrayIgnorePattern: "^_+.*$",
      },
    ],
    "@typescript-eslint/no-inferrable-types": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/naming-convention": [
      "error",
      {
        selector: [
          "function",
        ],
        format: [
          "camelCase",
        ],
        leadingUnderscore: "allow",
      },
      {
        selector: "parameter",
        format: [
          "camelCase",
        ],
        leadingUnderscore: "allow",
      },
    ],
    "@typescript-eslint/ban-types": [
      "error",
      {
        extendDefaults: true,
        types: {
          "{}": false,
        },
      },
    ],
  },
  settings: {
    "import/resolver": {
      alias: {
        map: [
          ["@", "./src"],
        ],
        extensions: [".ts", ".js", ".json"],
      },
    },
  },
};