contract 'Example', (addresses, accounts) ->

  it "should assert true", (done) -> 
    example = Example.at(addresses["Example"])
    assert.isTrue(true)
    done()