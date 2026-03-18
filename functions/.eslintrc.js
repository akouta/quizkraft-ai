module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
  },
  extends: ["eslint:recommended", "google"],
  rules: {
    // existing rules
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", {allowTemplateLiterals: true}],
    "max-len": ["error", {code: 150}],
    "new-cap": "off",
    "require-jsdoc": "off",

    // Add this line:
    "valid-jsdoc": "off",
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      // Optional: You can keep a different setting for test files
      rules: {"valid-jsdoc": "warn"},
    },
  ],
  globals: {},
};
