export default [
  {
    ignores: ["node_modules/**", "dist/**", "public/**"],
  },
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs", "**/*.ts", "**/*.tsx"],
    rules: {
      "quotes": "off",
      "semi": "off",
      "no-console": "off",
      "no-debugger": "off",
      "no-unused-vars": "off",
      "no-undef": "off",
    },
  },
];