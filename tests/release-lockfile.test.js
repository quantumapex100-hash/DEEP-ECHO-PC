const test=require('node:test'),assert=require('node:assert/strict');
const lock=require('../package-lock.json');
test('2.6.6 app version does not overwrite builder dependency versions or tarball URLs',()=>{
  assert.equal(lock.version,'2.6.6');assert.equal(lock.packages[''].version,'2.6.6');
  const schema=lock.packages['node_modules/@develar/schema-utils'];
  assert.equal(schema.version,'2.6.5');
  assert.equal(schema.resolved,'https://registry.npmjs.org/@develar/schema-utils/-/schema-utils-2.6.5.tgz');
  assert.equal(lock.packages['node_modules/app-builder-lib'].dependencies['@develar/schema-utils'],'~2.6.5');
});
