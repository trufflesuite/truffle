BigNumber = require "bignumber.js"

module.exports = (chai, utils) ->
  assert = chai.assert

  chai.Assertion.addProperty 'address', () ->
    @assert(
      @_obj.length == 42
      , 'expected #{this} to be a 42 character address (0x...)'
      , 'expected #{this} to not be a 42 character address (0x...)'
    )

    # Convert address to a number. Make sure it's not zero.
    # Controversial: Technically there is that edge case where
    # all zeroes could be a valid address. But: This catches all
    # those cases where Ethereum returns 0x0000... if something fails.

    #if utils.flag(this, "negate") == false
    number = new BigNumber(@_obj, 16)

    @assert(
      number.equals(0) == false
      , 'expected address #{this} to not be zero'
      , 'you shouldn\'t ever see this.'
    )

  assert.isAddress = (val, exp, msg) ->
    new chai.Assertion(val, msg).to.be.address;