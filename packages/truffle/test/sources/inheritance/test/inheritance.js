const Root = artifacts.require('Root');

contract('Root', function(accounts){

  it('runs', function(){
    return Root.new();
  });
});