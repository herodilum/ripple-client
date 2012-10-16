/*
show multiple balances
ripple progress bar
only fetch ripple lines when you start. then use websocket
trading
console

updated accepted transactions
time stamp in feed
flash balance when it changes
update ledger page in real time
tell them when they aren't connected by the websocket

much later:
  multiple accounts
*/

var ncc = {};

ncc.currentView = '#StartScreen';
ncc.masterKey = '';
ncc.accountID = '';
ncc.accounts = [];
ncc.balance = {'XNS' : new AmountValue(0)};
ncc.loggedIn = false;
ncc.advancedMode = false;
ncc.admin = false;
ncc.dataStore = dataStoreOptions[DATA_STORE];

ncc.currencyOptions = {
  "USD" : "USD - US Dollar",
  "EUR" : "EUR - Euro",
  "BTC" : "BTC - Bitcoins",
  "GBP" : "GBP - British Pound",
  "AUD" : "AUD - Australian Dollar",
  "RUB" : "RUB - Russian Ruble",
  "XAU" : "XAU - Ounces of Gold",
  "XAG" : "XAG - Ounces of Silver"
};

ncc.allCurrencyOptions = {
  "XNS" : "XNS - Ripple Stamps",
  "USD" : "USD - US Dollar",
  "EUR" : "EUR - Euro",
  "BTC" : "BTC - Bitcoins",
  "GBP" : "GBP - British Pound",
  "AUD" : "AUD - Australian Dollar",
  "RUB" : "RUB - Russian Ruble",
  "XAU" : "XAU - Ounces of Gold",
  "XAG" : "XAG - Ounces of Silver"
};

ncc.serverDown = function () {
  ncc.error('No response from server. Please check if it is running.');
}

ncc.checkError = function (response) {
  var ret = response.result.error_message || response.result.error,
      errorStr = (response.error || '') + (ret ? ' ' + ret : '');
  
  ncc.error(errorStr);
  
  return ret;
}

ncc.status = function (title, json) {
  $('#StatusDiv').toggle(Boolean(title || json));
  
  if (title) $('#StatusDiv p span').text("INFO: " + title);
  else $('#StatusDiv p span').text('INFO');

  try {
    $('#StatusDiv pre.json').html(
      ncc.misc.syntaxHighlight(
        JSON.stringify(json, undefined, 2)
      )
    );
    $('#StatusDiv button').show();
  } catch (e) {
    $('#status.json').html('');
    $('#StatusDiv button').hide();
  }
};

ncc.error = function (str) {
  try { str = ncc.misc.syntaxHighlight(JSON.stringify(JSON.parse(str), undefined, 2)); } catch (e) {}
  if (str) {
    $('#ErrorDiv').show();
    $('#error').html(str);
  } else {
    $('#ErrorDiv').hide();
  }
}

ncc.displayScreen = function (s) {
  $('.nav.nav-tabs:visible a[href="#t-' + s + '"]').click();
}

ncc.displayTab = function (s) {
  $('.nav.nav-tabs:visible a[href="#t-' + s + '"]').show();
}

ncc.processAccounts = function (accounts)
{
  ncc.accounts = accounts;
  
  // figure total balance
  var balance = new AmountValue(0);
  for (var i = 0; i < accounts.length; i++) {
    balance.add(accounts[i].Balance);
    ncc.accountID = accounts[i].Account;
    server.accountSubscribe(accounts[i].Account);
    rpc.account_tx(accounts[i].Account, HistoryPage.onHistoryResponse);
  }
  
  if (blobVault.data.account_id != ncc.accountID) {
    blobVault.data.account_id = ncc.accountID;
    blobVault.save();
    blobVault.pushToServer();
  }
  
  ncc.changeBalance('XNS', balance.sub(ncc.balance['XNS']));
  $('#RecvAddress').text(ncc.accountID);
  $('#RecvAddress2').text(ncc.accountID);
}

ncc.changeBalance = function (currency, delta) {
  if (currency in ncc.balance) ncc.balance[currency].add(delta);
  else ncc.balance[currency] = new AmountValue(delta);
  
  var currElem = $('li#' + currency + 'Balance');
  
  if (ncc.balance[currency].toString() != "0") {
    var amount = (currency == 'XNS') ? ncc.displayAmount(ncc.balance[currency])
                                     : String(ncc.balance[currency]);
    
    if (currElem.length) {
      // edit
      currElem.html(amount + '<span>' + currency + '</span>');
    } else {
      // create
      currElem = $('<li id="' + currency + 'Balance">' + amount + '<span>' + currency + '</span></li>');
      $('#ClientState').after(currElem);
    }
    
    currElem.stop();
    currElem.css('color', 'red');
    currElem.animate({ color: 'white' }, 1000);
    
    // flash currElem text
    // 
    // var NUM_FLASHES = 2;
    // if (currElem.attr('data-flashes-left') > 0) {
    //   currElem.attr('data-flashes-left', NUM_FLASHES);
    // } else {
    //   var white = currElem.css('color'),
    //       red = "rgb(255, 0, 0)";
    //   
    //   currElem.attr('data-flashes-left', NUM_FLASHES);
    //   
    //   (function flash() {
    //     var flashesLeft = currElem.attr('data-flashes-left');
    //     if (flashesLeft > 0) {
    //       currElem.animate(
    //         { color: red }, // properties
    //         200,            // duration
    //         function () {   // on complete
    //           currElem.animate({ color: white }, 200, flash);
    //           currElem.attr('data-flashes-left', flashesLeft - 1);
    //         }
    //       )
    //     } else {
    //       currElem.css({
    //         'color': white
    //       });
    //     }
    //   })();
    // }
    
  } else {
    // delete 
    currElem.remove();
  }
}

ncc.displayAmount = function (amount)
{
  if (amount === undefined) {
    return "";
  }
  
  if (amount.constructor == Number || amount.constructor == String) {
    return ncc.displayAmount(new AmountValue(amount));
  }
  
  if (amount.currency) {
    var value = amount.value;
    if (amount.currency == 'XNS') {
      return ncc.addCommas(value.div(BALANCE_DISPLAY_DIVISOR));
    } else {
      return ncc.addCommas(value) + ' ' + amount.currency;
    }
  } else {  // simple XNS
    return ncc.addCommas(amount.div(BALANCE_DISPLAY_DIVISOR));
  }
}

ncc.addCommas = function (n) {
  if (!/^[+-]?\d+(.\d*)?$/.test(n)) throw "Invalid number format.";
  
  var s = n.toString(),
      m = s.match(/^(\d+?)((\d{3})*)(\.\d*)?$/),
      whole = [m[1]].concat(m[2].match(/\d{3}/g) || []),
      fract = m[4] || "";
  
  return whole + fract;
}

///////////////////////////

ncc.infoTabShown = function ()
{
  rpc.server_info(ncc.infoResponse);
}

ncc.infoResponse = function (response,success)
{
  if (success)
  {
    ncc.checkError(response);
    
    if (response.result.info)
    {
      $('#InfoServerState').text( response.result.info.serverState );
      $('#InfoPublicKey').text( response.result.info.validationPKey );
    }
    
  } else {
    ncc.serverDown();
  }
}

//////////

ncc.addPeer = function ()
{
  ip = $.trim( $("#NewPeerIP").val());
  port = $.trim( $("#NewPeerPort").val());
  rpc.connect(ip,port);
}

ncc.peersResponse = function (response,success)
{
  if (success)
  {
    ncc.checkError(response);
    
    //$('#status').text(JSON.stringify(response));
    if (response.result.peers)
    {
      $('#PeerTable').empty();
      var peers = response.result.peers;
      for(var i = 0; i < peers.length; i++)
      {
        $('#PeerTable').append('<tr><td>'+i+'</td><td>'+peers[i].ip+'</td><td>'+peers[i].port+'</td><td>'+peers[i].version+'</td></tr>');  // #PeerTable is actually the tbody element so this append works
      }
    }
  } else ncc.serverDown();
}

///////////

ncc.chageTabs = function (e)
{
  //if (e.target.attributes.href(onTabShown)
  //  e.target.onTabShown();
}

ncc.nop = function () {}

ncc.toggleAdvanced = function (ele)
{
  if (ncc.advancedMode)
  {
    $('#AdvancedNav').hide();
    $('#UnlogAdvancedNav').hide();
    ncc.advancedMode = false;
    ele.innerHTML = "Show Advanced <b class='caret'></b>";
  } else {
    ele.innerHTML = "Hide Advanced <b class='caret'></b>";
    ncc.advancedMode = true;
    if (ncc.loggedIn) $('#AdvancedNav').show();
    else $('#UnlogAdvancedNav').show();
  }
}

ncc.onLogIn = function ()
{
  ncc.loggedIn = true;
  
  $('#UnlogMainNav').hide();
  $('#UnlogTopNav').hide();
  $('#MainNav').show();
  $('#TopNav').show();
  
  if (ncc.advancedMode) {
    $('#AdvancedNav').show();
    $('#UnlogAdvancedNav').hide();
  }
  
  $('#MainNav a[href="#t-send"]').tab('show');
  rpc.ripple_lines_get(ncc.accountID, RipplePage.getLinesResponse);
}

ncc.onLogOut = function ()
{
  ncc.loggedIn = false;
  
  $('#UnlogMainNav').show();
  $('#UnlogTopNav').show();
  $('#MainNav').hide();
  $('#TopNav').hide();
  if (ncc.advancedMode)
  {
    $('#AdvancedNav').hide();
    $('#UnlogAdvancedNav').show();
  }
  
  $('#UnlogTopNav a[href="#t-welcome"]').tab('show');
}

$(document).ready(function () {
          
  $("#t-send").on("show", SendPage.onShowTab);
  $("#t-login").on("show", loginScreen.onShowTab);
  $("#t-ripple").on("show", RipplePage.onShowTab );
  $("#t-ledger").on("show", function () { rpc.ledger(ledgerScreen.ledgerResponse); });
  $("#t-orderbook").on("show", function () { rpc.ledger(orderBookScreen.ledgerResponse); });
  $("#t-history").on("show", HistoryPage.onShowTab);
  $("#t-address").on("show", AddressBookPage.onShowTab);
  $("#t-unl").on("show", function () { rpc.unl_list(unlScreen.unlResponse); });
  $("#t-peers").on("show", function () { rpc.peers(ncc.peersResponse); });
  $("#t-info").on("show", ncc.infoTabShown);
  $("#t-feed").on("show", feed.onShowTab);
  $("#t-trade").on("show", trade.onShowTab);
  $("#t-options").on("show", optionScreen.onShowTab); 
  $("#t-welcome").on("show", welcomeScreen.onShowTab);
  
  ncc.onLogOut();
  $('#AdvancedNav').hide();
  $('#UnlogAdvancedNav').hide();
  
  // unactives main navigation
  
  $('#UnlogAdvancedNav li a').click(function () {
    $('#UnlogTopNav li').removeClass('active');
  });
  $('#TopNav li a').click(function () {
    $('#MainNav li').removeClass('active');
    $('#AdvancedNav li').removeClass('active');
  });
  $('#AdvancedNav li a').click(function () {
    $('#MainNav li').removeClass('active');
    $('#TopNav li').removeClass('active');
  });
  $('#MainNav li a').click(function () {
    $('#AdvancedNav li').removeClass('active');
    $('#TopNav li').removeClass('active');
  });
  
  startUp.start();
  
  /* custom select boxes */
  
  if (!$.browser.opera) {
     
    // for large select 
     
    $('select.select').each(function () {
      var title = $(this).attr('title');
      if ($('option:selected', this).val() != '') {
        title = $('option:selected',this).text();
      }
      $(this)
        .css({'z-index':10,'opacity':0,'-khtml-appearance':'none'})
        .after('<span class="select">' + title + '</span>')
        .change(function () {
          val = $('option:selected',this).text();
          $(this).next().text(val);
        });
    });
    
    // for small select
    
    $('select.select-small').each(function () {
      var title = $(this).attr('title');
      if ($('option:selected', this).val() != '') {
        title = $('option:selected',this).text();
      }
      $(this)
        .css({'z-index':10,'opacity':0,'-khtml-appearance':'none'})
        .after('<span class="select-small">' + title + '</span>')
        .change(function () {
          val = $('option:selected',this).text();
          $(this).next().text(val);
        });
    });
  };
});

ncc.misc = {};

ncc.misc.isValidAddress = (function () {
  var r = /^r\w{30,35}$/;
  return function (a) { return r.test(a); }
})();

ncc.misc.syntaxHighlight = function syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      function (match) {
        var cls = /^"/.test(match) ? (/:"?$/.test(match) ? 'key': 'string')
                                   : /true|false/.test(match) ? 'boolen'
                                                              : /null/.test(match) ? 'null' : 'number';
        return '<span class="' + cls + '">' + match + '</span>';
      }
    );
}
