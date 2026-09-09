/** Shared @swc/jest transform options (TS 7 compatible; emits decorator metadata for Nest DI). */
module.exports = {
  jsc: {
    parser: { syntax: 'typescript', decorators: true, dynamicImport: true },
    transform: { legacyDecorator: true, decoratorMetadata: true },
    target: 'es2021',
    keepClassNames: true,
  },
  module: { type: 'commonjs' },
};
