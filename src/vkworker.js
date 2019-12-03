const easyvk = require('easyvk');

class VkWorker {
  static get_template_from_song(song, cover='img/no_cover.svg') {
    var time = new Date(song.duration*1000).toISOString().substr(11, 8);
    if (time.startsWith("00:")) time = new Date(song.duration*1000).toISOString().substr(14, 5);
    var tid = song.owner_id + '_' + song.id;
    if (song.access_key) tid += '_' + song.access_key;
    return track_template.format(tid, song.title, song.artist, time, song.duration, cover, 'vk');
  }

  static get_music() {
    $(".vk-screen-main > div").css('display', 'none');
    $("#vk-music").css('display', 'block');
    $(".vk-header-button").attr('now', '0');
    $(".vk-header-button[role='music']").attr('now', '1');
    $('#vk-playlists').empty();
    $('#vk-songs').empty();

    easyvk({access_token: $("#vk-token").text()}).then(vk => {

      vk.call('audio.get').then(( { vkr } ) => {
        var songs = vkr.items;
        for (var i = 0; i < songs.length; i++) {
          var song = songs[i];
          if (!song.url) continue;
          var tid = song.owner_id + '_' + song.id;
          if (song.access_key) tid += '_' + song.access_key;
          var t = this.get_template_from_song(song);
          $("#vk-songs").append(t);

          set_track_events(tid);
        }
      }).catch(error => {
        console.log(error);
      });

      vk.call('audio.getPlaylists', {owner_id: $("#vk-uid").text()}).then(({ vkr }) => {
        var pls = vkr.items;
        for (var i = 0; i < pls.length; i++) {
          var pl = pls[i];
          var pid = pl.owner_id + '_' + pl.id;
          if (pl.original) pid = pl.original.owner_id + '_' + pl.original.playlist_id + '_' + pl.original.access_key;
          else if (pl.access_key) pid += '_' + pl.access_key;
          var cover;
          if (pl.photo) cover = `<img src="{0}" class="playlist-cover">`.format(pl.photo.photo_300);
          else cover = `<div class="playist-cover"><img src="{0}"><img src="{1}"><img src="{2}"><img src="{3}"></div>`.format(pl.thumbs[0].photo_300, pl.thumbs[1].photo_300, pl.thumbs[2].photo_300, pl.thumbs[3].photo_300);
          var t = playlist_template.format(pid, cover, pl.title, pl.count, pl.description, 'vk');
          $("#vk-playlists").append(t);
        }
      }).catch(error => {
        console.log(error);
      });

    })
  }

  static select_search() {
    $(".vk-screen-main > div").css('display', 'none');
    $("#vk-search").css('display', 'block');
    $(".vk-header-button").attr('now', '0');
    $(".vk-header-button[role='search']").attr('now', '1');
  }

  static recover(uid, tid, callback) {
    easyvk({access_token: $("#vk-token").text()}).then(vk => {

      vk.call('audio.getById', { 'audios': tid }).then(({ vkr }) => {
        console.log(tid);
        callback(uid, tid, vkr[0].url);
        });
    });
  }

  static get_playlist(pid, callback) {
    easyvk({access_token: $("#vk-token").text()}).then(vk => {
      var s = pid.split(/_/g);
      var data = {owner_id: s[0], album_id: s[1]};
      if (s.length === 3) data.access_key = s[2];
      vk.call('audio.get', data).then(({ vkr }) => {
        callback(pid, vkr.items);
      });
    });
  }

  static search() {
    $(`#vk-search-result`).html(`<div class="screen-text-header" role="#vk-search-albums"><h1>Альбомы</h1></div><div id="vk-search-albums" class="playlists"></div>
<div class="screen-text-header" role="#vk-search-own"><h1>Моя музыка</h1><button class="track-button" onclick="add_tracks($('#vk-search-own').find('.track')[0])"><i class="fa fa-plus"></i></button><button class="track-button"  onclick="load_tracks($('#vk-search-own').find('.track')[0], 0, true)"><i class="fa fa-random"></i></button><button class="track-button"  onclick="add_tracks($('#vk-search-own').find('.track')[0], true)"><i class="fa fa-plus"></i><i class="fa fa-random"></i></button></div>
<div id="vk-search-own"></div>
<div class="screen-text-header" role="#vk-search-songs"><h1>Вся музыка</h1><button class="track-button" onclick="add_tracks($('#vk-search-songs').find('.track')[0])"><i class="fa fa-plus"></i></button><button class="track-button"  onclick="load_tracks($('#vk-search-songs').find('.track')[0], 0, true)"><i class="fa fa-random"></i></button><button class="track-button"  onclick="add_tracks($('#vk-search-songs').find('.track')[0], true)"><i class="fa fa-plus"></i><i class="fa fa-random"></i></button></div>
<div id="vk-search-songs"></div>`);

    var query = $("#vk-search-input").val();
    easyvk({access_token: $("#vk-token").text()}).then(vk => {

      vk.call('audio.search', {q: query, count: 300, v:'5.103', search_own: 1}).then(({ vkr }) => {
        var songs = vkr.items;
        var add_to_own = true;
        var added_to_own = 0;

        for (var i = 0; i < songs.length; i++) {
          var song = songs[i];
          if (!song.url) continue;

          if (song.owner_id !== parseInt($('#vk-uid').text()) && add_to_own) add_to_own = false;

          var tid = song.owner_id + '_' + song.id;
          if (song.access_key) tid += '_' + song.access_key;
          var t = this.get_template_from_song(song);
          if (add_to_own) {
            $("#vk-search-own").append(t);
            added_to_own += 1;
          } else $("#vk-search-songs").append(t);

          set_track_events(tid);
        }
        if (added_to_own === 0) {
          $("#vk-search-own").remove();
          $("div[role='#vk-search-own']").remove();
        }

      });

      vk.call('audio.searchAlbums', {q: query, count: 25}).then(({ vkr }) => {
        var pls = vkr.items;
        for (var i = 0; i < pls.length; i++) {
          var pl = pls[i];
          console.log(pl);
          var pid = pl.owner_id + '_' + pl.id;
          if (pl.original) pid = pl.original.owner_id + '_' + pl.original.playlist_id + '_' + pl.original.access_key;
          else if (pl.access_key) pid += '_' + pl.access_key;
          var cover;
          if (pl.photo) cover = `<img src="{0}" class="playlist-cover">`.format(pl.photo.photo_300);
          else cover = `<div class="playist-cover"><img src="{0}"><img src="{1}"><img src="{2}"><img src="{3}"></div>`.format(pl.thumbs[0].photo_300, pl.thumbs[1].photo_300, pl.thumbs[2].photo_300, pl.thumbs[3].photo_300);
          var t = playlist_template.format(pid, cover, pl.title, pl.count, pl.description, 'vk');
          $("#vk-search-albums").append(t);
        }
        if (!pls.length) {
          $("#vk-search-albums").remove();
          $("div[role='#vk-search-albums']").remove();
        }
      });

    });
  }
}

export { VkWorker };
