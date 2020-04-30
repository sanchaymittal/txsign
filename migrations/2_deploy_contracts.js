const MetaToken = artifacts.require("MetaToken");

module.exports = async function(deployer) {
  deployer.deploy(MetaToken);
};