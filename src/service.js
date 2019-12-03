
const YandexMusicApi = require('yandex-music-api');
const fs = require('fs');
const easyvk = require('easyvk');
let ymapi;

String.prototype.format = function () {
  let args = arguments;
  return this.replace(/{(\d+)}/g, function (match, number) {
    return typeof args[number] !== 'undefined'
      ? args[number]
      : match
      ;
  });
};

const TOKEN_URL = 'http://62.109.15.27/bots/vk_auth/vk-audio-token/src/cli/get.php?login=%s&password=%s';
function vk_auth(login, password, callback) {
  $.get(TOKEN_URL.replace('%s', login).replace('%s', password)).done(function (data) {
    var n = data.search(/Token: \w*$/g);
    if (n !== -1) {
      data = data.slice(n);
      var token = data.replace('Token: ', '').trim();
      if (token.length) {
        callback(token);
      } else callback(null);
    } else callback(null);
  });
}


function checkServices() {
  var data = fs.readFileSync(__dirname+'/data.json', 'utf8');
  data = JSON.parse(data);

  ymapi = new YandexMusicApi();
  var s = data.ym.split(':');
  ymapi.init({ access_token: s[1], uid: s[0] }).then(function (token) {
    ymapi.getAccountStatus().then(function (status) {
      loadService('ym', token.uid+':'+token.access_token);
    }).catch(function (err) {
      loadService('ym', null);
    });
  }).catch(function (err) {
    loadService('ym', null);
  });

  easyvk({ access_token: data.vk }).then(async (vkt) => {
    loadService('vk', vkt.session.access_token);
  }).catch(function (err) {
    loadService('vk', null);
  });

  loadService('am', null);
}

var colors = {vk: '#5080b8', ym: '#fecc0b', am: '#000'};
function loadService(service_name, data) {
  if (!data) {
    console.log(service_name, data);
    $("#"+service_name+"-screen").html(authorizeHtml.format(service_name, colors[service_name]));
    return true;
  } else {
    if (service_name === 'vk') {

      easyvk({
        access_token: data,
      }).then(async (vk) => {
        vk.call('users.get', {'fields': 'photo_200'}).then(( { vkr } ) => {
          $("#"+service_name+"-screen").html(templates[service_name].format(vkr[0].photo_200, vk.session.first_name + " " + vk.session.last_name, vk.session.access_token, vk.session.user_id));
          vkw.constructor.get_music();
        }).catch(error => {
          console.log(error);
        });

      }).catch(console.error);
      return true;

    } else if (service_name === 'ym') {

      ymapi = new YandexMusicApi();
      var s = data.split(':');
      ymapi.init({ access_token: s[1], uid: s[0] }).then(function (token) {
        ymapi.getAccountStatus().then(function (status) {
          $("#"+service_name+"-screen").html(templates[service_name].format(token.uid, 'https://yapic.yandex.ru/get/'+token.uid+'/islands-200', status.account.displayName, token.access_token));
          ymw.constructor.get_landing();
        });
      }).catch(function (err) {
        console.log(err);
      });

    }
  }
}

var authorizeHtml = `<div class='auth-div'>
<h1 class="auth-header">Авторизация</h1>
<div class="auth-inputs">
<p class="auth-label">Логин</p>
<input type="text" class="text-input auth-input" id="{0}-login">
<p class="auth-label">Пароль</p>
<input type="password" class="text-input auth-input" id="{0}-password">
</div>
<button id="{0}-auth-button" class="auth-button {0}-hover-back" style="border-color: {1}" onclick="serviceLogin.constructor.{0}_do_login()">Войти</button>
</div>`;
var templates = { ym: `<div style="display: none" id="ym-token">{3}</div>
 <div style="display: none" id="ym-uid">{0}</div><div class="screen-header">
    <div class="screen-header-left">
        <img src="{1}">
        <h1>{2}</h1>
        <button class="screen-header-button ym-header-button" onclick="ymw.constructor.get_landing()" now="1" role="landing"><img src="img/music_icon.png"></button>
        <button class="screen-header-button ym-header-button" onclick="ymw.constructor.get_liked()" role="liked"><i class="fa fa-heart"></i></button>
        <button class="screen-header-button ym-header-button" onclick="ymw.constructor.select_search()" role="search"><img src="img/search_icon.jpg"></button>
    </div>
    <div class="screen-header-right">
        <button class="screen-header-button" onclick="serviceLogin.constructor.ym_exit()"><img src="img/exit_icon.png"></button>
    </div>
</div>
<div class="screen-main ym-screen-main">
    <div id="ym-landing">
        
    </div>
    <div id="ym-liked" style="display: none">
        
    </div>
    <div id="ym-search" style="display: none">
        <div class="search-row">
            <input type="text" class="search-input" id="ym-search-input">
            <button class="run-search" onclick="ymw.constructor.search()">Поиск</button>
        </div>
        <div id="ym-search-result"></div>
</div>
</div>`,


  vk: `<div style="display: none" id="vk-token">{2}</div>
 <div style="display: none" id="vk-uid">{3}</div><div class="screen-header">
    <div class="screen-header-left">
        <img src="{0}">
        <h1>{1}</h1>
        <button class="screen-header-button vk-header-button" onclick="vkw.constructor.get_music()" now="1" role="music"><img src="img/music_icon.png"></button>
        <button class="screen-header-button vk-header-button" onclick="vkw.constructor.select_search()" role="search"><img src="img/search_icon.jpg"></button>
    </div>
    <div class="screen-header-right">
        <button class="screen-header-button" onclick="serviceLogin.constructor.vk_exit()"><img src="img/exit_icon.png"></button>
    </div>
</div>
<div class="screen-main vk-screen-main">
    <div id="vk-music">
        <div class="screen-text-header"><h1>Мои плейлисты</h1></div>
        <div id="vk-playlists" class="playlists"></div>
        <div class="screen-text-header"><h1>Моя музыка</h1><button class="track-button" onclick="add_tracks($('#vk-songs').find('.track')[0])"><i class="fa fa-plus"></i></button><button class="track-button"  onclick="load_tracks($('#vk-songs').find('.track')[0], 0, true)"><i class="fa fa-random"></i></button><button class="track-button"  onclick="add_tracks($('#vk-songs').find('.track')[0], true)"><i class="fa fa-plus"></i><i class="fa fa-random"></i></button></div>
        <div id="vk-songs"></div>
    </div>
    <div id="vk-search" style="display: none">
        <div class="search-row">
            <input type="text" class="search-input" id="vk-search-input">
            <button class="run-search" onclick="vkw.constructor.search()">Поиск</button>
        </div>
        <div id="vk-search-result"></div>
</div>
</div>` };

class ServiceLogin {
  static vk_do_login() {
    vk_auth($("#vk-login").val(), $("#vk-password").val(), function (token) {
      if (token) {
        var data = fs.readFileSync(__dirname + '/data.json', 'utf8');
        data = JSON.parse(data);
        data.vk = token;
        fs.writeFileSync(__dirname + '/data.json', JSON.stringify(data));
        loadService('vk', data.vk);
      } else {
        $("#vk-auth-button").addClass('auth-error-button').css('border-color', '#FF265E');
        setTimeout(function () {$("#vk-auth-button").removeClass('auth-error-button').css('border-color', colors.vk);}, 1000);
      }
    });
  }
  static vk_exit() {
    var data = fs.readFileSync(__dirname+'/data.json', 'utf8');
    data = JSON.parse(data);
    data.vk = '123';
    fs.writeFileSync(__dirname+'/data.json', JSON.stringify(data));
    loadService('vk', null);
  }

  static ym_do_login() {
    ymapi = new YandexMusicApi();
    ymapi.init({username: $("#ym-login").val(), password: $("#ym-password").val()}).then(function (token) {
      var data = fs.readFileSync(__dirname + '/data.json', 'utf8');
      data = JSON.parse(data);
      data.ym = token.uid+':'+token.access_token;
      fs.writeFileSync(__dirname + '/data.json', JSON.stringify(data));
      loadService('ym', data.ym);
    }).catch(function (err){
      $("#ym-auth-button").addClass('auth-error-button').css('border-color', '#FF265E');
      setTimeout(function () {$("#ym-auth-button").removeClass('auth-error-button').css('border-color', colors.ym);}, 1000);
    });
  }

  static ym_exit() {
    var data = fs.readFileSync(__dirname+'/data.json', 'utf8');
    data = JSON.parse(data);
    data.ym = ':';
    fs.writeFileSync(__dirname+'/data.json', JSON.stringify(data));
    loadService('ym', null);
  }
}



export { checkServices, loadService, ServiceLogin };
