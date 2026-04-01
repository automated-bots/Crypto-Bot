import neostandard from 'neostandard'
import eslintConfigPrettier from 'eslint-config-prettier/flat'

export default [
  ...neostandard(),
  {
    rules: {
      'object-shorthand': 'off'
    }
  },
  eslintConfigPrettier
]
