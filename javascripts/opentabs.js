(function($) {

  var IOU = function() { this.load() };
  IOU.prototype = {

    appURI: 'https://github.com/melvincarvalho/appbuilder', // DOAP
    userProfileURI : 'https://data.fm/user.js',
    loginType : 'loginMulti', 
    //loginType : 'loginBrowserID', 
    statuses: [],
    user: null,

    // Facebook ID -- change or add more
    facebookAppID : '119467988130777',
    facebookAppURL : 'data.fm',

    IOUs: {},
    friends: {},
    currencies: {},
    walletURIs: [],
    friendsURI: null,
    


    // INIT
    load: function() {
      this.status('Loading user...', true);
      this.reset();
      this.getuserProfile();
      this.render();
      this.initLogin();
    },


    // AUTHENTICATION
    initLogin: function() {
      var url = document.URL.split("#")[0]
      $('#loginBrowserID').click(function () {document.IOU.loginBrowserID();return false;});
      $('#loginGmail').attr('href', 'https://data.fm/login?provider=Gmail&next=' + url );
      $('#loginYahoo').attr('href', 'https://data.fm/login?provider=Yahoo&next=' + url );
      $('#loginWebID').attr('href', 'https://data.fm/login?next=' + url );
      if (url.indexOf(this.facebookAppURL) != -1) {
        $('#loginFacebook').click(function () {document.IOU.loginFacebook();});
      } else {
        $('#loginFacebook').hide();
      }
    },
    
    getuserProfile: function() {
      this.userProfileURI = this.getUserProfileURI('document.IOU.displayUser');

      var script = document.createElement('script');
      script.src = this.userProfileURI;
      document.body.appendChild(script);
    },

    // callback to loadFriends, calls loadRemote
    displayUser: function(user) {
      this.status('Loading user...', false);
      var userName = document.getElementById('welcome');
      if ( user.name ) {
        var greetingText = document.createTextNode('Greetings, ' + user.name + '.');
        this.user = 'https://graph.facebook.com/' + user.id;
        userName.innerHTML = 'Greetings, ' + user.name + '<a href="javascript:document.IOU.logout()"><img height="24" width="24" src="http://melvincarvalho.github.com/appbuilder/images/logout.png"/'+'></a>';
        this.loadFBFriends();
      } else {
        this.user = user;
        var userName = document.getElementById('welcome');
        var signin = 'javascript:document.IOU.' + this.loginType + '()';
        if (user.substring(0,4) == 'dns:' ) {
          userName.innerHTML = 'IP: ' + this.user + '&nbsp;' + '<a href="'+ signin +'"><img src="https://browserid.org/i/sign_in_blue.png"/'+'></a>' ;
        } else {
          userName.innerHTML = 'User: ' + this.user + '<a href="javascript:document.IOU.logout()"><img height="24" width="24" src="http://melvincarvalho.github.com/appbuilder/images/logout.png"/'+'></a>';
        }
      }
      this.loadRemote();
    },

    // Called from BrowserID button
    loginBrowserID: function() {
      navigator.id.get(function(assertion) {
        if (assertion) {
    
          var arr = assertion.split('.');
          var f = JSON.parse(window.atob(arr[1]));
          var user = f['principal']['email'];
          document.getElementById('welcome').innerHTML = user + '<a href="javascript:document.IOU.logout()"><img height="24" width="24" src="http://melvincarvalho.github.com/appbuilder/images/logout.png"/'+'></a>';
          document.IOU.user = 'mailto:' +  user;
          $('#loginPopup').dialog('close');
          document.IOU.loadRemote();
          
        } else {
          // something went wrong!  the user isn't logged in.
        }
      });      
    },    
    
    // called from fb button
    loginFacebook: function() {
      var appID = "119467988130777";
      var path = 'https://www.facebook.com/dialog/oauth?';
      var url = document.URL.split("#")[0]
      
      var queryParams = ['client_id=' + appID,
        'redirect_uri=' + url,
        'response_type=token'];
      var query = queryParams.join('&');
      var url = path + query;
      window.location = url;
    },
    
    loginMulti: function(id) {
      $('#loginPopup').dialog({"title" : 'Sign In'});
    },
    
    logout: function() {
      this.reset();
      var signin = 'javascript:document.IOU.' + this.loginType + '()';
      var userName = document.getElementById('welcome');
      userName.innerHTML = 'Sign In: &nbsp;' + '<a href="'+signin+'"><img src="https://browserid.org/i/sign_in_blue.png"/'+'></a>' ;
    },
    
    
    // FRIENDS    
    loadFBFriends: function() {
      this.status('Loading friends...', true);
      var accessToken = window.location.hash.substring(1);
      var path = "https://graph.facebook.com/me/friends?";
      var queryParams = [accessToken, 'callback=document.IOU.displayFBFriends'];
      var query = queryParams.join('&');
      var url = path + query;

      // use jsonp to call the graph
      var script = document.createElement('script');
      script.src = url;
      document.body.appendChild(script);
    },

    displayFBFriends: function(data) {
      this.status('Loading friends...', false);
      var str;
      for (i=0; i<data['data'].length; i++) {
        var uri  = 'https://graph.facebook.com/' + data['data'][i].id;
        var name = data['data'][i].name;
        this.addFriend( uri, name );
      }
      this.render();
    },

    // called from add button
    addRecipient: function() {
      var uri  = this.makeURI($('#uri').val());
      var name = $('#name').val();

      this.addFriend( uri , name );
      this.saveRemoteFriends();
      $('#addRecipient').hide();

      alert( name + ' added!' );
      this.render();
    },


    // DISCOVERY
    getFriendsURI: function(user) {
      // friends
      var baseDir = 'http://opentabs.data.fm/d/' + hex_sha1(user).substring(0,2) + '/' + hex_sha1(user).substring(2) + '/';
      return baseDir + 'private/friends';
    },

    getWalletURIs: function(user) {
      // wallet URIs
      var ret = [];
      
      // Search default location on data.fm
      var baseDir = 'http://opentabs.data.fm/d/' + hex_sha1(user).substring(0,2) + '/' + hex_sha1(user).substring(2) + '/';
      if ( user == this.user ) {
        // Discover from localStorage
        var lsKey = 'walletURI';
        if ( user == this.user && window.localStorage[lsKey] ) ret.push(window.localStorage[lsKey]);
        ret.push(baseDir + 'private/transfers');
      }
      ret.push(baseDir + 'public/transfers');
      
      return ret;
    },

    getUserProfileURI: function(callback) {
      // Non Facebook
      if (window.location.hash.length == 0) {
        return this.userProfileURI + '?callback=' + callback;
      // Facebook
      } else {
        return "https://graph.facebook.com/me?" + window.location.hash.substring(1) + '&callback=' + callback;
      }
    },


    // LOAD DATA
    loadRemote: function() {
      this.loadRemoteIOUs();
      this.loadRemoteFriends();
    },

    loadRemoteIOUs: function() {
      this.status('Loading IOUs...', true);
      that = this;
      
      var walletURIs = this.getWalletURIs(this.user);
      for (i=0; i<walletURIs.length; i++) {
        $.getJSON(walletURIs[i] , function(data){
          that.IOUs = that.mergeObjects(that.IOUs, data);
          that.render();
          that.status('Loading IOUs...', false);
        }).error(function(data){
          that.status('Loading IOUs...', false);
        });
      }
    },

    loadRemoteFriends: function() {
      this.status('Loading friends...', true);

      // get user
      var user = this.user;
      if (!user) return;
      var userSha1 = hex_sha1(user);

      that = this;

      $.getJSON(this.   getFriendsURI(user) , function(data){
        for(var prop in data) {
          if(data.hasOwnProperty(prop)) {
            var name = data[prop]['http://xmlns.com/foaf/0.1/name'][0]['value'];
            var uri  = prop;
            document.IOU.addFriend(uri, name);
          }
        }

        that.render();
        that.status('Loading friends...', false);
      }).error(function(data){
        that.addFriend('testdummy@opentabs.net', 'Test Dummy');
        that.render();
        that.status('Loading friends...', false);
      });

    },


    // SAVE DATA
    save: function() {
      if( !this.confirm() ) {
        alert('Operation Cancelled');
        return;
      }

      this.saveLocal();
      this.saveRemote();
      this.syncRemote();
    },

    saveLocal: function() {
      this.status('Saving IOUs...', true);
      var newIOU = this.createIOU(this.user, this.makeURI($('#payee').val()), $('#quantity').val(), $('#currency').val(), 'test', new Date() );
      this.IOUs = this.mergeObjects( this.IOUs, newIOU);
      window.localStorage.setItem('IOUs', JSON.stringify(this.IOUs));
    },

    saveRemote: function() {
      this.saveRemoteIOUs();
      this.saveRemoteFriends();
    },

    saveRemoteIOUs: function() {
      // get user
      that = this;
      var user = this.user;
      var userSha1 = hex_sha1(user);

      // dirs
      var baseDir = 'http://opentabs.data.fm/d/' + userSha1.substring(0,2) + '/' + userSha1.substring(2) + '/';
      //this.createDirectory(baseDir + 'public/');
      //this.createDirectory(baseDir + 'private/');
      //this.createDirectory(baseDir + 'friends/');


      // DELETE
      var walletURIs = this.getWalletURIs(this.user);
      var walletURI = walletURIs[0];
      //this.deleteFile(walletURI);

      // PUT
      //var body = jsonld.turtle(this.IOUs);
      //var body = JSON.stringify(this.IOUs);      
      $.getJSON(walletURI , function(data){
        body = that.createIOU(that.user, $('#payee').val(), "" + 1.0*$('#quantity').val(), $('#currency').val(), 'test', new Date());
        that.postFile(walletURI, JSON.stringify(body));
        that.status('Saving IOUs...', false);
      }).error(function () {
        body = that.createIOU(that.user, $('#payee').val(), "" + 1.0*$('#quantity').val(), $('#currency').val(), 'test', new Date());
        that.postFile(walletURI, JSON.stringify(body));
        that.status('Saving IOUs...', false);
      });
    },

    saveRemoteFriends: function() {
      this.status('Saving friends...', true);
      // get user
      var user = this.user;
      var userSha1 = hex_sha1(user);

      // dirs
      var baseDir = 'http://opentabs.data.fm/d/' + userSha1.substring(0,2) + '/' + userSha1.substring(2) + '/';
      //this.createDirectory(baseDir + 'public/');
      //this.createDirectory(baseDir + 'private/');
      //this.createDirectory(baseDir + 'friends/');


      // DELETE
      this.deleteFile(this.getFriendsURI(user));

      // PUT
      //var body = jsonld.turtle(this.friends);
      this.postFile(this.getFriendsURI(user), JSON.stringify(this.friends));
      this.status('Saving friends...', false);
    },



    syncRemote: function() {
      this.status('Saving IOUs...', true);
      // get user
      var user = this.makeURI($('#payee').val());
      var userSha1 = hex_sha1(user);
      var that = this;

      // dirs
      var baseDir = 'http://opentabs.data.fm/d/' + userSha1.substring(0,2) + '/' + userSha1.substring(2) + '/';
      //this.createDirectory(baseDir + 'public/');
      //this.createDirectory(baseDir + 'private/');
      //this.createDirectory(baseDir + 'friends/');



      try {
        var walletURIs = this.getWalletURIs(user);
        var walletURI = walletURIs[0];
        /*
        $.getJSON(walletURI , function(data){
          var IOUs = data;

          IOUs = that.mergeObjects(IOUs, that.createIOU($('#payee').val(), that.user, "" + -1.0*$('#quantity').val(), $('#currency').val(), 'test', new Date()));

          // DELETE
          that.deleteFile(baseDir + 'private/transfers');

          // PUT
          //var body = jsonld.turtle(IOUs);
          var body = JSON.stringify(IOUs);
          that.postFile(baseDir + 'private/transfers', body);


          that.render();
          that.status('Saving IOUs...', false);

        }).error(function () {
          var IOUs = {};
          IOUs = that.mergeObjects(IOUs, that.createIOU($('#payee').val(), that.user, "" + -1.0*$('#quantity').val(), $('#currency').val(), 'test', new Date()));

          // DELETE
          that.deleteFile(baseDir + 'private/transfers');

          // PUT
          //var body = jsonld.turtle(IOUs);
          var body = JSON.stringify(IOUs);
          that.postFile(baseDir + 'private/transfers', body);


          that.render();
          that.status('Saving IOUs...', false);

        });
        */
        $.getJSON(walletURI , function(data){
          body = that.createIOU(that.user, $('#payee').val(), "" + 1.0*$('#quantity').val(), $('#currency').val(), 'test', new Date());
          that.postFile(walletURI, JSON.stringify(body));
          that.render();
          that.status('Saving IOUs...', false);
        }).error(function () {
          body = that.createIOU(that.user, $('#payee').val(), "" + 1.0*$('#quantity').val(), $('#currency').val(), 'test', new Date());
          that.postFile(walletURI, JSON.stringify(body));
          that.render();
          that.status('Saving IOUs...', false);
        });
      } catch (err) {
        alert('could not sync');
      }
  

    },


    // RENDER
    render: function() {
      that = this;
      var ledger = {};


      this.populateFriendsDropdown();
      this.populateCurrenciesDropdown();
      $('#opentabs').empty();


      if ( this.IOUs && !$.isEmptyObject(this.IOUs) ) {
        var line = '<tr><thead>'
        line += '<td class="heading">Tabs</td>';
        line += '<td class="heading">Amount</td>';
        line += '<td><a href="javascript:document.IOU.toggle()"><img src="http://careers.advamed.org/images/new/icon_collapse_all.gif"/'+'></a></td>';
        line += '</thead></tr>';
        $('#opentabs').append( $('<table class="bordered">').append(line) );

        for(var id in this.IOUs) {
          if(this.IOUs.hasOwnProperty(id)) {
            var kv = this.IOUs[id];
            
            // validate
            if (!kv["http://purl.org/commerce#amount"])      continue;
            if (!kv["http://purl.org/commerce#currency"])    continue;
            if (!kv["http://purl.org/commerce#destination"]) continue;
            if (!kv["http://purl.org/commerce#source"])      continue;
            if (!kv["http://purl.org/dc/terms/created"])     continue;

            // get data
            var amount   = kv["http://purl.org/commerce#amount"][0]['value'];
            var currency = kv["http://purl.org/commerce#currency"][0]['value'];
            var dest     = kv["http://purl.org/commerce#destination"][0]['value'];
            var source   = kv["http://purl.org/commerce#source"][0]['value'];
            var created  = kv["http://purl.org/dc/terms/created"][0]['value'];
            var comment  = kv['http://www.w3.org/2000/01/rdf-schema#comment'][0]['value'];
            
            var counterparty = dest;
            if (dest == this.user) {
              counterparty = source;
              amount *= -1.0;
            }
              
            if (!ledger[counterparty]) ledger[counterparty] = {};
            if (!ledger[counterparty][currency]) ledger[counterparty][currency] = [];
            ledger[counterparty][currency].push( { "amount" : amount, "currency" : currency, "counterparty" : counterparty, "created" : created, "comment" : comment } );
            
          }
        }
        
        // display
        for(var id in ledger) {
          if(ledger.hasOwnProperty(id)) {
            var k = ledger[id];
           
            for(var v in k) {
              if(k.hasOwnProperty(v)) {
                var rows = k[v];
                var sum =0;
                for (i=0; i<rows.length; i++) {
                  var row = rows[i];
                  // create row
                  var line = '<tr class="item">'
                  var pm = ((-1 * row['amount'])<0)?'minus':'plus';
                  var arr = row['currency'].split('/');
                  line += '<td class="counterparty" nowrap="nowrap" title="'+ row['counterparty'] +'">' + row['counterparty'] + '</td>';
                  line += '<td title="'+ row['comment'] +'" class="gold '+ pm +'">' + (-1 * row['amount']) + '</td>';
                  line += '<td class="currenncy" title="'+ row['created'] +'"><a href="javascript:document.IOU.toggle()">' + arr[arr.length-1] + '</a></td>';
                  line += '</tr>';
                  
                  sum -= parseFloat(row['amount']);

                  // display summary
                  if (i==0) { 
                    $('#opentabs table tr:last').after(line);
                    var el = $('#opentabs table tr:last');
                  } else {
                    pm = (sum<0)?'minus':'plus';
                    el.children().eq(1).html(sum);
                    el.children().eq(1).removeClass('plus minus').addClass(pm);
                  }
                  $('#opentabs table tr:last').after(line).next().addClass('blue').hide();

                }
              }
            }    
          }
        }
        
        this.beautify();
      } else {
        $('#opentabs').empty().append('You currently have no open tabs');
      }




      //$('#opentabs').append(that.renderRawParagraph(that.IOUs));
    },

    renderRaw: function(data) {
      return JSON.stringify(data);
    },

    renderRawParagraph: function(data) {
      var ret = '';

      for(var id in data) {
        if(data.hasOwnProperty(id)) {
          var kv = data[id];
          ret += '<p>' + id + '</p>';
          for(var key in kv) {
            if(kv.hasOwnProperty(key)) {
              val = kv[key];
              ret += '<p>&nbsp;&nbsp;' + JSON.stringify(key) + '</p>';
              for ( var i=0; i<val.length; i++) {
                ret += '<p>&nbsp;&nbsp;&nbsp;&nbsp;' + JSON.stringify(kv[key][i]['value']) + '</p>';
              }
            }
          }
        }
      }
      return ret;
    },

    beautify: function() {
      // beautify cells
      if ( !this.friends ) this.friends = {};
      that = this;
      $('td').each(function() {
        var html = $(this).html();
        var n = that.friends[html];

        if ( n && n['http://xmlns.com/foaf/0.1/name'] ) {
          $(this).html(n['http://xmlns.com/foaf/0.1/name'][0]['value']);
        } else if ( html.substring(0,7) == 'mailto:' ) {
          $(this).html(html.substring(7));
        }
      });

      //$('#welcome').html(window.user);
    },

    populateFriendsDropdown: function() {
      // sort friends
      if (!this.friends) return;
      
      var friends = [];
      for(var id in this.friends) {
        if(this.friends.hasOwnProperty(id)) {
          friends.push({"@id": id, 'http://xmlns.com/foaf/0.1/name' : this.friends[id]['http://xmlns.com/foaf/0.1/name'][0]['value'] });
        }
      }
      
      friends = friends.sort(function(a,b) {
        if (a['http://xmlns.com/foaf/0.1/name'] > b['http://xmlns.com/foaf/0.1/name']) {
          return 1;
        } else {
          return -1;
        }
      });
      $('#payee').children().remove().end();

      for (i=0; i<friends.length; i++) {
        var uri  = friends[i]['@id'];
        var name = friends[i]['http://xmlns.com/foaf/0.1/name'];
        $("#payee").append("<option value="+ uri +">"+ name +"</option>");
      }
    },

    populateCurrenciesDropdown: function() {
      // sort friends
      if (!this.currencies) return;
      
      var currencies = [];
      for(var id in this.currencies) {
        if(this.currencies.hasOwnProperty(id)) {
          currencies.push({"@id": id, 'http://dbpedia.org/property/currencyName' : this.currencies[id]['http://dbpedia.org/property/currencyName'][0]['value'] });
        }
      }
      
      currencies = currencies.sort(function(a,b) {
        if (a['http://dbpedia.org/property/currencyName'] > b['http://dbpedia.org/property/currencyName']) {
          return 1;
        } else {
          return -1;
        }
      });
      $('#currency').children().remove().end();

      for (i=0; i<currencies.length; i++) {
        var uri  = currencies[i]['@id'];
        var name = currencies[i]['http://dbpedia.org/property/currencyName'];
        $("#currency").append("<option value="+ uri +">"+ name +"</option>");
      }
    },

    // HELPERS
    reset: function() {
      this.user = null;
      this.IOUs = {};
      this.friends = {};
      this.currencies = {};
      this.addFriend('testdummy@opentabs.net', 'Test Dummy');
      this.addCurrency('http://dbpedia.org/resource/Euro', '&euro;');
      this.addCurrency('http://dbpedia.org/resource/Bitcoin', 'bitcoin');
      this.addCurrency('http://dbpedia.org/resource/Karma', 'karma');
      this.populateFriendsDropdown();
      this.render();
    },
    
    addFriend: function(uri, name) {
      if (this.friends[uri]) return;
      this.friends[uri] = { 'http://xmlns.com/foaf/0.1/name' : [{ 'value' : name, 'type' : 'literal' }] }
    },

    addCurrency: function(uri, name, display, depiction) {
      if (this.currencies[uri]) return;
      this.currencies[uri] = { 
                               'http://dbpedia.org/property/currencyName' : [{ 'value' : name, 'type' : 'literal' }]
                             }
    },

    confirm: function() {
      var IOU = 'You are about to send:\n\n'+ $('#payee').val()
      IOU += '\n\nan IOU for ' + $('#quantity').val() + ' ' + $("#currency").val();
      IOU += '\n\nAre you sure?  \n\n***All IOUs are currently TEST only***';
      return confirm(IOU);
    },

    toggle: function() {
      $('.blue').toggle('slow');
    },

    clear: function() {
      this.IOUs = window.localStorage.IOUs = null;
      this.saveRemote();
      this.load();
    },

    deleteFile: function(file) {
      var body = '';
      xhr = new XMLHttpRequest();
      xhr.open('DELETE', file, false);
      xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
      xhr.send(body);
    },

    putFile: function(file, data) {
      xhr = new XMLHttpRequest();
      xhr.open('PUT', file, false);
      xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
      xhr.send(data);
      //alert(data);
    },

    postFile: function(file, data) {
      xhr = new XMLHttpRequest();
      xhr.open('POST', file, false);
      xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
      xhr.send(data);
      //alert(data);
    },

    createDirectory: function(dir) {
      var xhr = new XMLHttpRequest();
      xhr.open('MKCOL', dir, false);
      //xhr.send();
    },

    status: function(message, add) {
      if (add) {
        this.statuses.push(message);
      } else {
        for (i=0; i<this.statuses.length; i++) {
          if (message == this.statuses[i]) {
            this.statuses.splice(i, 1);
          }
        }
      }
      if (this.statuses.length) {
        $('#status').html(this.statuses[0]);
      } else {
        $('#status').html('');
      }
    },


    createIOU: function(source, destination, amount, currency, comment, date) {

       var IOU = {
                     "@id": "",
                     "http://purl.org/commerce#source": {
                         "@id": this.makeURI(source)
                      },
                      "http://purl.org/commerce#destination": {
                          "@id": this.makeURI(destination)
                      },
                      "http://purl.org/commerce#amount": amount,
                      "http://purl.org/commerce#currency": currency,
                      "http://www.w3.org/2000/01/rdf-schema#comment": comment,
                      "http://purl.org/dc/terms/created": date,
                      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type": {
                          "@id": "http://purl.org/commerce#Transfer"
                       }
                    };

        var subject = '#' + hex_sha1(JSON.stringify(jsonld.normalize(IOU)));

        var legacyIOU = {};
            legacyIOU[subject] = {
                    "http://purl.org/commerce#amount" : [ {
                        "value" : amount,
                        "type" : "literal"
                        }

                      ],
                    "http://purl.org/commerce#currency" : [ {
                        "value" : currency,
                        "type" : "literal"
                        }

                      ],
                    "http://purl.org/commerce#destination" : [ {
                        "value" : destination,
                        "type" : "uri"
                        }

                      ],
                    "http://purl.org/commerce#source" : [ {
                        "value" : source,
                        "type" : "uri"
                        }

                      ],
                    "http://purl.org/dc/terms/created" : [ {
                        "value" : date,
                        "type" : "literal"
                        }

                      ],
                    "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" : [ {
                        "value" : "http://purl.org/commerce#Transfer",
                        "type" : "uri"
                        }

                      ],
                    "http://www.w3.org/2000/01/rdf-schema#comment" : [ {
                        "value" : comment,
                        "type" : "literal"
                        }

                      ]

                   };


      // TODO upgrade to latest spec
      return legacyIOU;
    },

    makeURI: function(id) {
      if ( id.substring(0,7) == 'mailto:' ) {
        return id;
      } else if ( id.indexOf(':') != -1 ) {
        return id;
      } else {
        return 'mailto:' + id;
      }
    },

    mergeObjects: function (obj1,obj2) {
      var obj3 = {};
      for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
      for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
      return obj3;
    },

    addR: function(id) {
      if($('#addRecipient').is(':hidden')) {
        $('#addRecipient').show();
        $('#addRecipient-button').html('cancel');
      } else {
        $('#addRecipient').hide();
        $('#addRecipient-button').html('add');
      }
    }

  };


  // Init
  $(document).ready(function() {
    document.IOU = new IOU;
    $('#clearall').click(function() { document.IOU.clear() });
    $('#save').click(function() { document.IOU.save() });
    $('#add').click(function() { document.IOU.addRecipient() });
    $("label").inFieldLabels();
  });

})(jQuery);
