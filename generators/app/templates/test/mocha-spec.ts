import * as chai from 'chai'

const expect = chai.expect

describe('remember: using arrow functions', function() {
  it('is discouraged', function() {
    expect('due to the lexical binding of this, such functions are unable to access the Mocha context.')
      .to
    .equal('due to the lexical binding of this, such functions are unable to access the Mocha context.')
  })
})

describe('... and now you should', function() {
  it('make this test pass and get to writing your own tests', function() {
    expect('pass')
      .to
    .equal('fail')
  })
})



