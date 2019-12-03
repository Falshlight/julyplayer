const YandexMusicApi = require('yandex-music-api');
var md5 = require('md5');

class YmWorker {
  static get_token() {
    return {uid: $("#ym-uid").text(), access_token: $("#ym-token").text()};
  }

  static get_template_from_song(song) {
    var time = new Date(song.durationMs).toISOString().substr(11, 8);
    if (time.startsWith("00:")) time = new Date(song.durationMs).toISOString().substr(14, 5);
    var tid = song.id;
    var cover = song.coverUri || song.albums[0].coverUri;
    var artists = [];
    for (var i = 0; i < song.artists.length; i++) artists.push(song.artists[i].name);
    return track_template.format(tid, song.title, artists.join(', '), time, Math.abs(song.durationMs / 1000), 'https://'+cover.replace('%%', '200x200'), 'ym');
  }

  static get_landing() {
    $(".ym-screen-main > div").css('display', 'none');
    $("#ym-landing").css('display', 'block');
    $(".ym-header-button").attr('now', '0');
    $(".ym-header-button[role='landing']").attr('now', '1');

    var api = new YandexMusicApi();
    api.init(YmWorker.get_token()).then(function (token) {
      api.getLanding().then(function (landing) {
        $("#ym-landing").html(`<div class="screen-text-header" role="ym-personal-playlists"><h1></h1></div>
<div id="ym-personal-playlists" class="playlists"></div>
<div class="screen-text-header" role="ym-new-releases"><h1></h1></div>
<div id="ym-new-releases" class="playlists"></div>
<div class="screen-text-header" role="ym-new-playlists"><h1></h1></div>
<div id="ym-new-playlists" class="playlists"></div>
<div class="screen-text-header" role="ym-chart"><h1></h1><button class="track-button" onclick="add_tracks($('#chart').find('.track')[0])"><i class="fa fa-plus"></i></button><button class="track-button"  onclick="load_tracks($('#chart').find('.track')[0], 0, true)"><i class="fa fa-random"></i></button><button class="track-button"  onclick="add_tracks($('#chart').find('.track')[0], true)"><i class="fa fa-plus"></i><i class="fa fa-random"></i></button></div>
<div id="ym-chart"></div>`);

        var blocks = landing.blocks;

        for (var i = 0; i < blocks.length; i++) {
          var block = blocks[i];
          $('div[role="ym-'+block.type+'"]').find('h1').text(block.title);
          if (block.type === 'personal-playlists') {
            for (var j = 0; j < block.entities.length; j++) {
              var entity = block.entities[j];
              var data = entity.data.data;
              var cover = data.animatedCoverUri || data.cover.uri;
              var t = playlist_template.format(data.owner.uid+':'+data.kind, `<img src="https://{0}" class="playlist-cover">`.format(cover.replace('%%', '200x200')), data.title, data.trackCount, data.description, 'ym');
              $("#ym-personal-playlists").append(t);
            }
          } else if (block.type === 'new-releases') {
            for (var j = 0; j < block.entities.length; j++) {
              var entity = block.entities[j];
              var data = entity.data;
              var t = playlist_template.format(data.id, `<img src="https://{0}" class="playlist-cover">`.format(data.coverUri.replace('%%', '200x200')), data.title, data.trackCount, data.description || '', 'ym');
              $("#ym-new-releases").append(t);
            }
          } else if (block.type === 'new-playlists') {
            for (var j = 0; j < block.entities.length; j++) {
              var entity = block.entities[j];
              var data = entity.data;
              var t = playlist_template.format(data.owner.uid+':'+data.kind, `<img src="https://{0}" class="playlist-cover">`.format(data.cover.uri.replace('%%', '200x200')), data.title, data.trackCount, data.description || '', 'ym');
              $("#ym-new-playlists").append(t);
            }
          } else if (block.type === 'chart') {
            for (var j = 0; j < block.entities.length; j++) {
              var entity = block.entities[j];
              var data = entity.data;
              var tid = data.track.id;
              var t = YmWorker.get_template_from_song(data.track);
              $("#ym-chart").append(t);

              set_track_events(tid);
            }
          }
        }
      });
    }).catch(function (err) {
      console.log(err);
    });
  }

  static recover(uid, tid, callback) {
    var api = new YandexMusicApi();
    api.init(YmWorker.get_token()).then(function (token) {
      api.getTrack(tid).then(function (track) {
        for (var i = 0; i < track.length; i++) {
          if (track[i].codec === 'mp3') {
            $.get({url: track[i].downloadInfoUrl, headers: {
              'X-Yandex-Music-Client': 'WindowsPhone/3.20',
            }}).done(function (data) {
              var host = $(data).find('host').text();
              var path = $(data).find('path').text();
              var ts = $(data).find('ts').text();
              var s = $(data).find('s').text();
              var sign = md5('XGRlBW9FXlekgbPrRHuSiA' + path.slice(1) + s);
              var url = 'https://{0}/get-mp3/{1}/{2}{3}'.format(host, sign, ts, path);
              callback(uid, tid, url);
            });
            break;
          }
        }
      })
    });
  }

  static get_playlist(pid, callback) {
    var api = new YandexMusicApi();
    api.init(YmWorker.get_token()).then(function (token) {
      var s = pid.split(":");
      if (s.length === 2) {
        api.getPlaylist(s[0], s[1]).then(function (playlist) {
            var songs = [];
            var tracks = playlist.tracks;
            for (var i = 0; i < tracks.length; i++) songs.push(tracks[i].track);
            callback(pid, songs);
          });
      } else {
        api.getAlbum(s[0]).then(function (album) {
          var songs = [];
          var tracks = album.volumes[0];
          for (var i = 0; i < tracks.length; i++) {
            songs.push(tracks[i]);
          }
          callback(pid, songs);
        });
      }

    });
  }

  static get_liked() {
    $(".ym-screen-main > div").css('display', 'none');
    $("#ym-liked").css('display', 'block');
    $(".ym-header-button").attr('now', '0');
    $(".ym-header-button[role='liked']").attr('now', '1');

    $("#ym-liked").empty();

    var api = new YandexMusicApi();
    api.init(YmWorker.get_token()).then(function (token) {
      $("#ym-liked").append(`<div class="screen-text-header" role="ym-liked-playlists"><h1>Плейлисты</h1></div><div id="ym-liked-playlists" class="playlists"></div>`);
      api.getUserLikes(token.uid, 'playlists').then(function (playlists) {
          for (var i = 0; i < playlists.length; i++) {
            var pl = playlists[i].playlist;
            var t = playlist_template.format(pl.owner.uid+':'+pl.kind, `<img src="https://{0}" class="playlist-cover">`.format(pl.cover.uri.replace('%%', '200x200')), pl.title, pl.trackCount, pl.description, 'ym');
            $("#ym-liked-playlists").append(t);
          }
          if (!playlists.length) {
              $("#ym-liked-playlists").remove();
              $('div[role="ym-liked-playlists"]').remove();
            }
        });

      $("#ym-liked").append(`<div class="screen-text-header" role="ym-liked-albums"><h1>Альбомы</h1></div><div id="ym-liked-albums" class="playlists"></div>`);
      api.getUserLikes(token.uid, 'albums')
        .then(function (albums) {
          var tids = [];
          for (var i = 0; i < albums.length; i++) tids.push(albums[i].id);
          tids = tids.join(',');
          api.getFullAlbums(tids).then(function (ft) {
            for (var j = 0; j < ft.length; j++) {
              var pl = ft[j];
              var t = playlist_template.format(pl.id, `<img src="https://{0}" class="playlist-cover">`.format(pl.coverUri.replace('%%', '200x200')), pl.title, pl.trackCount, pl.description || '', 'ym');
              $("#ym-liked-albums").append(t);
            }
            if (!ft.length) {
              $("#ym-liked-albums").remove();
              $('div[role="ym-liked-albums"]').remove();
            }
          });
        });

      $("#ym-liked").append(`<div class="screen-text-header" role="ym-liked-tracks"><h1>Треки</h1>
<button class="track-button" onclick="add_tracks($('#ym-liked-tracks').find('.track')[0])"><i class="fa fa-plus"></i></button><button class="track-button"  onclick="load_tracks($('#ym-liked-tracks').find('.track')[0], 0, true)"><i class="fa fa-random"></i></button><button class="track-button"  onclick="add_tracks($('#ym-liked-tracks').find('.track')[0], true)"><i class="fa fa-plus"></i><i class="fa fa-random"></i></button>
</div><div id="ym-liked-tracks"></div>`);
      api.getUserLikes(token.uid, 'tracks')
        .then(function (playlists) {
          var tracks = playlists.library.tracks;
          var tids = [];
          for (var i = 0; i < tracks.length; i++) tids.push(tracks[i].id + ':' + tracks[i].albumId);
          tids = tids.join(',');

          api.getFullTracks(tids).then(function (ft) {
            for (var j = 0; j < ft.length; j++) {
              var data = ft[j];
              var tid = data.id;
              var t = YmWorker.get_template_from_song(data);
              $("#ym-liked-tracks").append(t);
              set_track_events(tid);
            }
            if (!ft.length) {
              $("#ym-liked-tracks").remove();
              $('div[role="ym-liked-tracks"]').remove();
            }
          });
        });
    });
  }

  static select_search() {
    $(".ym-screen-main > div").css('display', 'none');
    $("#ym-search").css('display', 'block');
    $(".ym-header-button").attr('now', '0');
    $(".ym-header-button[role='search']").attr('now', '1');
  }

  static search() {
    $(`#ym-search-result`).html(`<div class="screen-text-header" role="ym-search-playlists"><h1>Плейлисты</h1></div>
<div id="ym-search-playlists" class="playlists"></div>
<div class="screen-text-header" role="ym-search-albums"><h1>Альбомы</h1></div>
<div id="ym-search-albums" class="playlists"></div>
<div class="screen-text-header" role="ym-search-songs"><h1>Треки</h1><button class="track-button" onclick="add_tracks($('#ym-search-songs').find('.track')[0])"><i class="fa fa-plus"></i></button><button class="track-button"  onclick="load_tracks($('#ym-search-songs').find('.track')[0], 0, true)"><i class="fa fa-random"></i></button><button class="track-button"  onclick="add_tracks($('#ym-search-songs').find('.track')[0], true)"><i class="fa fa-plus"></i><i class="fa fa-random"></i></button></div>
<div id="ym-search-tracks"></div>`);
    var api = new YandexMusicApi();
    var query = $("#ym-search-input").val();
    api.init(YmWorker.get_token()).then(function (token) {
        api.search(query, {'type': 'all'}).then(function (search) {
          var albums = search.albums.results;
          for (var i = 0; i < albums.length; i++) {
            var pl = albums[i];
            var t = playlist_template.format(pl.id, `<img src="https://{0}" class="playlist-cover">`.format(pl.coverUri.replace('%%', '200x200')), pl.title, pl.trackCount, pl.description || '', 'ym');
            $("#ym-search-albums").append(t);
          }
          if (!albums.length) {
            $("#ym-search-albums").remove();
            $('div[role="ym-search-albums"]').remove();
          }

          var tracks = search.tracks.results;
          for (var j = 0; j < tracks.length; j++) {
            var data = tracks[j];
            var tid = data.id;
            var t = YmWorker.get_template_from_song(data);
            $("#ym-search-tracks").append(t);
            set_track_events(tid);
          }
          if (!tracks.length) {
            $("#ym-search-tracks").remove();
            $('div[role="ym-search-tracks"]').remove();
          }

        });

      api.search(query, {'type': 'playlist'}).then(function (search) {
        var playlists = search.playlists.results;
        for (var i = 0; i < playlists.length; i++) {
          var pl = playlists[i];
          var t = playlist_template.format(pl.owner.uid+':'+pl.kind, `<img src="https://{0}" class="playlist-cover">`.format(pl.cover.uri.replace('%%', '200x200')), pl.title, pl.trackCount, pl.description, 'ym');
          $("#ym-search-playlists").append(t);
        }
        if (!playlists.length) {
          $("#ym-search-playlists").remove();
          $('div[role="ym-search-playlists"]').remove();
        }
      });

    });
  }
}

export { YmWorker };
