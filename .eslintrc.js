// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: 'expo',
  plugins: ['unused-imports'],
  ignorePatterns: ['/dist/*', '/node_modules/*', '/.expo/*'],
  rules: {
    // unused-imports auto-uklanja mrtve importe; no-unused-vars i dalje
    // prijavljuje neiskorišćene lokalne varijable (sa `_` prefiksom kao opt-out)
    '@typescript-eslint/no-unused-vars': 'off',
    'unused-imports/no-unused-imports': 'warn',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
      },
    ],
  },
  overrides: [
    {
      // Node CommonJS config/scripts (metro.config.js, scripts/*)
      files: ['*.config.js', '.eslintrc.js', 'scripts/**'],
      env: { node: true },
    },
  ],
};
