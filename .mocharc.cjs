module.exports = {
  require: 'ts-node/register',
  extension: ['ts', 'tsx'],
  timeout: 15000,
  spec: 'test/**/*.test.ts',
  parallel: false,
  exit: true
};
