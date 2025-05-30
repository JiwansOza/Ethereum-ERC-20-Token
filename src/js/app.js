App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  loading: false,
  tokenPrice: 1000000000000000,
  tokensSold: 0,
  tokensAvailable: 750000,

  init: function () {
    console.log("App initialized...");
    return App.initWeb3();
  },

  initWeb3: function () {
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      web3 = new Web3(window.ethereum);
      window.ethereum.request({ method: "eth_requestAccounts" });
    } else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
      web3 = new Web3(window.web3.currentProvider);
    } else {
      alert("Please connect to MetaMask!");
      return;
    }
    return App.initContracts();
  },

  initContracts: function () {
    $.getJSON("DappTokenSale.json", function (dappTokenSale) {
      App.contracts.DappTokenSale = TruffleContract(dappTokenSale);
      App.contracts.DappTokenSale.setProvider(App.web3Provider);
      App.contracts.DappTokenSale.deployed().then(function (dappTokenSale) {
        console.log("Dapp Token Sale Address:", dappTokenSale.address);
      });
    }).done(function () {
      $.getJSON("DappToken.json", function (dappToken) {
        App.contracts.DappToken = TruffleContract(dappToken);
        App.contracts.DappToken.setProvider(App.web3Provider);
        App.contracts.DappToken.deployed().then(function (dappToken) {
          console.log("Dapp Token Address:", dappToken.address);
        });

        App.listenForEvents();
        return App.render();
      });
    });
  },

  listenForEvents: function () {
    App.contracts.DappTokenSale.deployed().then(function (instance) {
      instance.Sell({}, {
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function (error, event) {
        console.log("Event triggered", event);
        App.render();
      });
    });
  },

  render: function () {
    if (App.loading) return;

    App.loading = true;
    var loader = $('#loader');
    var content = $('#content');

    loader.show();
    content.hide();

    // Load account
    web3.eth.getCoinbase(function (err, account) {
      if (err === null && account) {
        App.account = account;
        $('#accountAddress').html("Your Account: " + account);
      }
    });

    // Load token sale contract
    App.contracts.DappTokenSale.deployed().then(function (instance) {
      dappTokenSaleInstance = instance;
      return dappTokenSaleInstance.tokenPrice();
    }).then(function (tokenPrice) {
      App.tokenPrice = tokenPrice;
      $('.token-price').html(web3.fromWei(App.tokenPrice, "ether").toNumber());
      return dappTokenSaleInstance.tokensSold();
    }).then(function (tokensSold) {
      App.tokensSold = tokensSold.toNumber();
      $('.tokens-sold').html(App.tokensSold);
      $('.tokens-available').html(App.tokensAvailable);

      var progressPercent = (App.tokensSold / App.tokensAvailable) * 100;
      $('#progress').css('width', progressPercent + '%');

      // Load token contract
      return App.contracts.DappToken.deployed();
    }).then(function (instance) {
      if (!instance || !instance.balanceOf) {
        console.error("DappToken instance or balanceOf not available");
        return;
      }
      return instance.balanceOf(App.account);
    }).then(function (balance) {
      if (balance) {
        $('.dapp-balance').html(balance.toNumber());
      }
      App.loading = false;
      loader.hide();
      content.show();
    }).catch(function (err) {
      console.error("Error rendering app:", err);
      App.loading = false;
      loader.hide();
      content.show();
    });
  },

  buyTokens: function () {
    $('#content').hide();
    $('#loader').show();

    var numberOfTokens = $('#numberOfTokens').val();
    App.contracts.DappTokenSale.deployed().then(function (instance) {
      return instance.buyTokens(numberOfTokens, {
        from: App.account,
        value: numberOfTokens * App.tokenPrice,
        gas: 500000
      });
    }).then(function (result) {
      console.log("Tokens bought...");
      $('form').trigger('reset');
      // Wait for Sell event to re-render
    }).catch(function (err) {
      console.error("Error buying tokens:", err);
      App.loading = false;
      $('#loader').hide();
      $('#content').show();
    });
  }
};

$(function () {
  $(window).load(function () {
    App.init();
  });
});
