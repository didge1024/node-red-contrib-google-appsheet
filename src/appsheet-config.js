module.exports = function (RED) {
  function AppSheetConfig(config) {
    RED.nodes.createNode(this, config);
    this.appId = config.appId;
  }

  RED.nodes.registerType('appsheet-config', AppSheetConfig, {
    credentials: {
      accessKey: { type: 'password' }
    }
  });
};
