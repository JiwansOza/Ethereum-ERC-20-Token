module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",     
      port: 7545,            
      network_id: "5777",       
    },
  },

  // Set compiler settings
  compilers: {
    solc: {
      version: "0.4.24",      
    },
  },
};
