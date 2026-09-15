import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results', 'content/upstream'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['scripts/**/*.mjs', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    // React Context 文件（组件 + 同名 hook）与 MDX 组件映射表天然会同时导出
    // 组件和非组件；这里是有意为之的例外，关闭 fast-refresh 的这条约束。
    files: ['src/components/hermes/ProgressContext.tsx', 'src/components/mdx/MdxComponents.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
)
