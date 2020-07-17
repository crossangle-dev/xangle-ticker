'use strict';

var API_PATH = 'https://api.xangle.io/external/';

(function(_h) {

  var XTR = function(configuration) {
    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    // private variables
    var _container = document.getElementById('xi-ticker');
    var _error = undefined;
    var _calls = []; // functions to process config options
    var _config = {
      /* default
      status: 'public',
      darkMode: false,
      hideLogo: false,
      hideEdge: false,
      newTagDuration: 1, // new badge
      disclosureDuration: 7, 
      language: 'en', // en, ko, jp, cn, ru
      limit: 15, // viewing disclosures
      scrollSpeed: 3,  // (slow) 1 ~ 5 (fast)
      projectSymbols: null, // array|string
      apiUrl: null,
      */
    };
    var DISCLOSURE_NUMBER = 0; // number of displaying disclosures
    var MAX_WIDTH = 1200, HORIZONTAL_SCROLL_TIME_FACTOR = 0;

    // const data
    var STATE_MAP = {
      en: {scheduled: 'Scheduled', amended: 'Amended', answered: 'Answered', request: 'Request for Disclosure', published: 'Disclosure'},
      ko: {scheduled: '예약', amended: '정정', answered: '답변완료', request: '조회', published: '공시'},
      cn: {scheduled: '预订', amended: '更正', answered: '已回答', published: '公布'},
      jp: {scheduled: '予約', amended: '修正済み', answered: '回答済み', published: '公開'},
      ru: {scheduled: 'По расписанию', amended: 'оригинал', answered: 'Отвеченный', request: 'Запрос о раскрытии', published: 'раскрытие'},
      id: {scheduled: 'Direncanakan', amended: 'Perubahan', answered: 'Terjawab', request: 'Permintaan untuk penyingkapan', published: 'Penyingkapan Data'},
    };
    var TRANSLATION_MAP = {
      en: {no_disclosures: function(n) {return 'No disclosures published in the last '.concat(n, ' days.')}, no_match: 'No disclosures matched the project'},
      ko: {no_disclosures: function(n) {return '최근 '.concat(n, ' 일 등록된 공시가 없음.')}, no_math: '프로젝트에 공시가 없음'}
    }
    var ERR_CODE = {
      102: 'No available disclosures', 103: 'No support language', 301: 'Unsupported browser', 306: 'Unknown error'
    }
    var DEVICE_WIDTH = document.documentElement.clientWidth; // initial width
    var MOBILE_DEVICE = /iPhone|iPod|Android/i.test(navigator.userAgent);
    var UNSUPPORTED_BROWSER = /Trident|MSIE/i.test(navigator.userAgent);
    var DEFAULT_HEIGHT = 42, DEFAULT_PADDING = 12, HEADER_WIDTH = 115;
    var SUPPORT_LANGUAGE = ['en', 'ko', 'jp', 'cn', 'ru', 'id'];
    var SPEED_FACTOR = {1: 30, 2: 40, 3: 60, 4: 100, 5: 200};
    var LAP_FACTOR = {2: 5, 3: 8, 4: 11, 5: 14, 10: 28, 15: 43};

    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    // private methods (explicit hoisting to be used to call by public methods)
    var _handleError = function(type, message) {
      var cn = _container;
      if (cn.hasChildNodes()) cn.removeChild(cn.childNodes[0])
      if (type == 'hide') {
        console.warn(message);
        return cn.style.display = 'none';
      }

      function _translate(text) {
        var map = TRANSLATION_MAP[_config.language] || TRANSLATION_MAP['en'];
        if (!map || !map.hasOwnProperty(text)) return ERR_CODE[102];
        var res = map[text];
        return typeof res == 'function' ? res(_config.disclosureDuration) : res
      }
      cn.classList.add('xt-container');

      var layout = '', header = '';
      if (MOBILE_DEVICE) {
        header = "<div class='xt-head' target='_blank'><img src='https://s3.ap-northeast-2.amazonaws.com/service.xangle.io/ticker/images/favicon.svg'/>";
        layout = "<div class='xt-layout mobile'>" + header + "</div><div class='xt-tail'></div></div>";
      } else {
        header = "<div class='xt-head' target='_blank'><div>"
        var logo = "<img src='https://s3.ap-northeast-2.amazonaws.com/service.xangle.io/ticker/images/ticker-logo" + (_config.darkMode ? '-dark.svg' : '.svg') + "'/>";
        layout = "<div class='xt-layout'>" + header + logo + "</div></div><div class='xt-tail'></div></div>";
      }
      cn.innerHTML = layout;
    
      setTimeout(function() {
        var target = __element__('xt-tail');
        if (target) {
          target.innerText = _translate(message);
          target.classList.add('no-message');
        }
        var header = __element__('xt-head');
        header && header.addEventListener('click', function() { window.open("https://xangle.io", "_blank") });
      }, 10)
    }

    var _applyConfig = function(args) {
      for (var key in args) { 
        if (key == 'language') _config[key] = !SUPPORT_LANGUAGE.includes(args['language']) ? 'en' : args['language'];
        else if (key == 'mobileMode') MOBILE_DEVICE = args['mobileMode']
        else _config[key] = args[key];
      }

      if (args.apiUrl) {
        getCustomDisclosures(args.apiUrl);
      } else if (args.hasOwnProperty('projectIds')) {
        _config.disclosureDuration = args.disclosureDuration || 30;
        getProjectDisclosures(args.projectIds);
      } else if (args.projectSymbols) {
        _config.disclosureDuration = args.disclosureDuration || 30;
        getProjectDisclosures(null, args.projectSymbols);
      } else {
        var ids = args.whiteList ? symbolsToIds(args.whiteList) : null;
        getAllDisclosures(ids);
      }

      _calls.push({f: applyLogo, v: _config.hideLogo});
      args.hasOwnProperty('darkMode') && _calls.push({f: applyMode, v: args.darkMode});
      args.hasOwnProperty('tickerWidth') && _calls.push({f: applyWidth, v: args.tickerWidth});
      args.hasOwnProperty('tickerStyle') && _calls.push({f: applyStyle, v: args.tickerStyle});
    }

    ////////////////////////////////////////////////////////
    __initialize__(configuration);
    window.addEventListener('resize', onHandleResize);
    ////////////////////////////////////////////////////////
    
    function getAllDisclosures(project_ids) {
      var url = API_PATH + 'disclosure-list';
      url += '?lang=' + _config.language + '&status=' + _config.status;
      if (Array.isArray(project_ids) && project_ids.length) url += '&white_list=' + project_ids.toString();

      __request__(url, function(data) {
        if (!data || !data.disclosures || data.disclosures.length == 0) {
          return _handleError('show', 'no_disclosures');
        }
        __generator__(limitedDisclosures(data.disclosures));
      })
    }

    function getProjectDisclosures(project_ids, project_symbols) {
      var url = API_PATH + 'disclosure-project?lang=' + _config.language;

      if (project_ids) {
        if (!Array.isArray(project_ids)) url += '&status=all&project_ids=' + project_ids;
        else url += '&project_ids=' + project_ids.toString();
      } else if (project_symbols) {
        if (!Array.isArray(project_symbols)) url += '&status=all&project_symbols=' + project_symbols;
        else url += '&project_symbols=' + project_symbols.toString();
      } else {
        return _handleError('show', 'no_disclosures');
      }

      __request__(url, function(data) {
        if (!data || !data[0] || data.length == 0) {
          return _handleError('show', 'no_disclosures');
        }
        var items = [];
        for (var i = 0; i < data.length; i++) {
          items = items.concat(data[i].disclosures);
        }
        __generator__(limitedDisclosures(items));
      })
    }

    function getCustomDisclosures(url) {
      __request__(url, function(data) {
        if (!data || data.length == 0) {
          return _handleError('show', 'no_disclosures')
        }
        __generator__(limitedDisclosures(data));
      })
    }

    function getDisclosureInfo(disclosure_id, callback) {
      var url = API_PATH + 'disclosure-detail/' + disclosure_id;
      if (_config.language != 'en') url += '&lang=' + _config.language;

      __request__(url, function(data) {
        if (callback) callback(data);
        else console.log('disclosure', data);
      })
    }

    function restoreDefault() {
      _config = {
        darkMode: false,
        hideLogo: false,
        hideEdge: false,
        status: 'public',
        newTagDuration: 1,
        disclosureDuration: 7,
        language: 'en',
        limit: MOBILE_DEVICE ? 10 : 15,
        display: 'link',
        scrollSpeed: 3,
        projectIds: null,
        projectSymbols: null
      }
      _calls = [];
      _error = undefined;
      _container.style.display = 'block';
    }

    function onHandleResize() {
      applyWidth();
      shiftFader();
    }

    function openDisclosure(args) {
      return function() {
        if (args.dsp && args.dsp.search('link') >= 0) {
          window.open(args.url, '_blank');
        } else {
          getDisclosureInfo(args.did, function(disclosure) {
            console.log(disclosure);
          });
        }
      }
    }

    function limitedDisclosures(disclosures) {
      var items = [];
      var duration = _config.disclosureDuration, limitation = _config.limit;
      
      var now = __miliseconds__(), range = 86400000 * duration;
      for (var i = 0; i < disclosures.length; i++) {
        var item = disclosures[i];
        if (!item.publish_timestamp_utc) continue;
        var one = __utctime__(item.publish_timestamp_utc);
        if (now - one <= range) items.push(item);
      }

      function _limit(items, count) {
        if (!MOBILE_DEVICE) return items.slice(0, count);

        if (items.length > 15) return items.slice(0, Math.min(15, count));
        else if (items.length > 10) return items.slice(0, Math.min(10, count));
        else if (items.length > 5) return items.slice(0, Math.min(5, count));
        return items.slice(0, count);
      }

      var result = _limit(items, limitation);
      DISCLOSURE_NUMBER = result.length;
      if (items.length == 0 || result.length == 0) {
        _handleError('show', _error = 'no_disclosures');
      }
      // console.log(DISCLOSURE_NUMBER)
      return result;
    }

    function shiftFader() {
      if (MOBILE_DEVICE) return;
      var rightFade = __element__('right-fade'), layout = __element__('xt-layout'), tail = __element__('xt-tail');

      if (rightFade && layout) {
        if (layout.style.maxWidth) {
          var gap = document.documentElement.clientWidth - parseInt(layout.style.maxWidth);
          var bar = (gap % 2) - 1;
          rightFade.style.right = gap > 0 ? (parseInt(gap / 2) + bar)+ 'px': 0;
        } else {
          var pos = tail.offsetLeft + tail.clientWidth - 48;
          rightFade.style.left = pos + 'px';
        }
      }
    }

    function hideFader() {
      var rightFade = __element__('right-fade');
      rightFade && rightFade.classList.add('hidden');

      var leftFade = __element__('left-fade');
      leftFade && leftFade.classList.add('hidden');
    }

    function playAnimation(state) {
      var wrap = __element__('ticker-wrap'), move = __element__('ticker-move');
      if (state == 'pause') {
        wrap && wrap.classList.add('fixed');
        move && move.classList.add('paused', 'fixed');
      } else {
        if (HORIZONTAL_SCROLL_TIME_FACTOR == 0) return;

        move && move.classList.remove('paused');
        setTimeout(function() {
          wrap && wrap.classList.remove('fixed');
          if (move) {
            move.classList.remove('fixed');
            move.style.animationName = 'ticker-loop';
          }
        }, HORIZONTAL_SCROLL_TIME_FACTOR)
        // console.log('time', HORIZONTAL_SCROLL_TIME_FACTOR)
      }
    }

    function applyMode(darkMode) {
      var darkClasses = ['xt-container', 'xt-head', 'left-fade', 'right-fade'];
      for (var j = 0; j < darkClasses.length; j++) {
        var el = __element__(darkClasses[j]);
        el && (darkMode ? el.classList.add('dark') : el.classList.remove('dark'));
      }
  
      var tickerItems = __element__('ticker-item', 'all');
      for (var i = 0; i < tickerItems.length; i++) {
        var item = tickerItems[i];
        item && (darkMode ? item.classList.add('dark') : item.classList.remove('dark'));
        var st = __element__('state', item);
        st && (darkMode ? st.classList.add('dark') : st.classList.remove('dark'));
      }
    }

    function applyLogo(hideLogo) {
      var layout = __element__('xt-layout'), head = __element__('xt-head');
      if (!layout || !head) return _handleError('hide', 'failed to hide xangle logo');

      if (hideLogo) {
        layout.style.display = 'block';
        head.style.display = 'none';
      } else {
        layout.style.display = 'grid';
        head.style.display = 'block';
      }
    }

    function applyWidth(width) {
      if (width) { // config width
        _container.style.marginLeft = _container.style.marginRight = 'auto'
      } else { // window resizing
        var parentWidth = window.getComputedStyle(_container.parentElement || document.documentElement, null).getPropertyValue("width");
        width = parseInt(parentWidth);
        DEVICE_WIDTH = document.documentElement.clientWidth;
      }

      _container.style.width = width + 'px';
    }

    function applyHeight(height) {
      _container.style.height = height + 'px';
      _container.style.minHeight = height + 'px';

      var diff = (DEFAULT_HEIGHT - height) / 2;
      var head = __element__('xt-head');
      head.style.paddingTop = (DEFAULT_PADDING - diff) + 'px';
      head.style.paddingBottom = (DEFAULT_PADDING - diff) + 'px';

      var rightFade = __element__('right-fade');
      if (rightFade) rightFade.style.height = height + 'px';
      var leftFade = __element__('left-fade');
      if (leftFade) leftFade.style.height = height + 'px';
      var wrap = __element__('ticker-wrap');
      if (wrap) wrap.style.height = height + 'px';
    }

    function applyStyle(styleList) {
      if (typeof styleList != 'object') return;

      for (var key in styleList) {
        _container.style[key] = styleList[key]

        if (key.search('layout') >= 0) {
          var layout = __element__('xt-layout');
          var attributes = key.split('-');
          if (layout) layout.style[attributes.pop()] = styleList[key];
        }
      }
    }

    function adjustLayout() {
      var mover = __element__('ticker-move');
      if (!mover) return _handleError('hide', 'failed to adjust layout caused by no mover');

      if (MOBILE_DEVICE) {
        var speedClass = _config.scrollSpeed > 3 ? 'fast' : (_config.scrollSpeed < 3 ? 'slow' : '');
        if (speedClass) mover.classList.add(speedClass);
        (DISCLOSURE_NUMBER > 1) && setTimeout(function() {
          mover.style.animationName = 'v-ticker-' + DISCLOSURE_NUMBER;
        }, LAP_FACTOR[DISCLOSURE_NUMBER] * 1000)
        return hideFader();
      }

      var tail = __element__('xt-tail');
      if (!tail) return _handleError('hide', 'failed to adjust layout caused by no tail');

      var containerWidth = parseInt(window.getComputedStyle(_container, null).getPropertyValue("width")) || MAX_WIDTH;
      var moverCalcWidth = mover.clientWidth - Math.ceil(containerWidth * 0.50), tailWidth = tail.clientWidth;
      if (moverCalcWidth < tailWidth) {
        playAnimation('pause');
        hideFader();
      } else {
        if (DEVICE_WIDTH - HEADER_WIDTH >= tailWidth) mover.style.paddingRight = tailWidth + 'px';
        else mover.style.paddingRight = DEVICE_WIDTH + 'px';

        var s = _config.scrollSpeed > 5 ? 5 : _config.scrollSpeed;
        var f = parseInt(Math.floor(mover.clientWidth / SPEED_FACTOR[s]) / 10) * 10;
        if (f > 330) f = 340; if (f < 10) f = 5; console.log(f, mover.clientWidth);
        HORIZONTAL_SCROLL_TIME_FACTOR = parseInt(f * 1000 * 0.82);
        mover.classList.add('s-' + f);
      }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    // private statical methods
    function __element__(className, target) {
      var element = null;
      try {
        var elements = document.getElementsByClassName(className);
        if (target) {
          if (typeof target == 'object') element = target.getElementsByClassName(className)[0];
          else element = elements; // all
        } else {
          element = elements[0];
        }
      } catch (e) {
        _error = 'no target element';
      }
      return element;
    }

    function __utctime__(timestamp) {
      var d = timestamp ? new Date(timestamp) : new Date();
      return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()); 
    }

    function __miliseconds__(timestamp) {
      var d = timestamp ? new Date(timestamp) : new Date();
      return d.valueOf();
    }

    function __apply__() {
      for (var i = 0; i < _calls.length; i++) {
        var call = _calls[i];
        typeof call.f == 'function' && call.f(call.v);
      }

      shiftFader();
      adjustLayout();
    }

    function __request__(url, callback) {

      try {
        var xhr = new XMLHttpRequest;
        xhr.open('GET', url, true);
        xhr.responseType = 'json';
        xhr.send();
      } catch (e) {
        callback(null);
        _handleError('show', 'no_result');
      }

      xhr.onload = function() {
        var response = xhr.response;
        if (!response || response.errors) {
          callback(null);
          return _handleError('hide', response && response.message);
        }
        console.log(response)
        callback(response.hasOwnProperty('data') ? response.data : response);
      }

      xhr.onerror = function() {
        callback(null);
        _handleError('show', 'no_result')
      }
    }

    function __generator__(disclosures) {
      if (_error) return;
      var cn = _container;
      if (cn.hasChildNodes()) cn.removeChild(cn.childNodes[0])
      cn.classList.add('xt-container');
      if (_config.hideEdge) cn.classList.add('no-edge');

      var layoutHTML = '';
      if (MOBILE_DEVICE) {
        var moveClass = "'ticker-move vertical" + (disclosures.length <= 1 ? '' : ' v-ticker-' + disclosures.length) + "'";
        var logo = "<img class='logo' src='https://s3.ap-northeast-2.amazonaws.com/service.xangle.io/ticker/images/favicon.svg'/>";
        layoutHTML = "<div class='xt-layout mobile'><div class='xt-head' target='_blank'>"+ logo +"</div><div class='xt-tail'><div class='ticker-wrap vertical'><div class="+ moveClass +">";
      } else {
        var logo = "<img class='logo' src='https://s3.ap-northeast-2.amazonaws.com/service.xangle.io/ticker/images/ticker-logo" + (_config.darkMode ? '-dark.svg' : '.svg') + "'/>";
        layoutHTML = "<div class='xt-layout'><div class='xt-head' target='_blank'><div>"+ logo +"</div></div><div class='xt-tail'><span class='left-fade'></span><span class='right-fade'></span><div class='ticker-wrap fixed'><div class='ticker-move paused fixed desktop'>";
      }
  
      function state(obj, lang) {
        if (obj.publish_status == 'scheduled') return STATE_MAP[lang]['scheduled'];
        else if (obj.disclosure_type == 'request') return STATE_MAP[lang]['request'];
        else if (obj.disclosure_type == 'response') return STATE_MAP[lang]['answered'];
        else if (obj.disclosure_type == 'amendment') return STATE_MAP[lang]['amended'];
        return STATE_MAP[lang]['published'];
      }

      function duration(timestamp, _duration) {
        var now = __miliseconds__(), range = 86400000 * _duration, one = __utctime__(timestamp);
        return now - one <= range;
      }

      function interval(timestamp) {
        var now = __miliseconds__(), one = __utctime__(timestamp);
        return Math.floor((one - now) / 1000);
      }

      function runSchedule(item, interval) {
        return setInterval(function() {
          interval--;
          var h = Math.floor(interval / 3600), m = Math.floor((interval % 3600) / 60), s = Math.floor((interval % 3600) % 60);
          var content = __element__('content', item);
          if (content) content.innerText = (h < 10 ? '0' + h : h) + " : " + (m < 10 ? '0' + m : m) + " : " + (s < 10 ? '0' + s : s);
          if (interval <= 0) stopSchedule(item, content);
        }, 1000)
      }

      function stopSchedule(item, content) {
        clearInterval(item.getAttribute('runner'));
        content.innerText = '00 : 00 : 00';

        var counter = 0;
        var published = setInterval(function() {
          geteDisclosureInfo(item.getAttribute('id'), function(data) {
            if (data) {
              clearInterval(published);
              if (typeof data != 'object' || !data.hasOwnProperty('title')) {
                content.innerText = 'No disclosure information';
                return;  
              }
              content.innerText = data.title;
              
              if (MOBILE_DEVICE) {
                item.insertAdjacentHTML("beforeend", "<span class='new-badge'>new</span>");
              } else {
                var st = __element__('state', item);
                st.innerText = '[' + state(data, _config.language) + ']';
                var box = __element__('boxer', item);
                box.insertAdjacentHTML("beforeend", "<span class='new-badge'>new</span>");
              }
            } else if (++counter >= 10) {
              clearInterval(published);
            }
          })
        }, 3000);
      }
      
      var itemHTML = '', lang = _config.language, newTagDuration = _config.newTagDuration;
      for (var i = 0; i < disclosures.length; i++) {
        var d = disclosures[i];
        var badge = d.publish_status != 'scheduled' && duration(d.publish_timestamp_utc, newTagDuration) ? "<span class='new-badge'>new</span>" : "";
        var logo = "<img class='logo' src=\'" + d.project_logo + "\'/><span class='symbol'>" + d.project_symbol + "</span><div class='divider'></div>"; 
        var title = "<span class='content'>" + (d.publish_status != 'scheduled' ? d.title : '- : - : -') + "</span>";

        if (MOBILE_DEVICE) {
          itemHTML += "<div class='ticker-item vertical' id='" + d.disclosure_id + "' target='_blank'>"
          itemHTML += logo + title + badge + "</div>";
        } else {
          itemHTML += "<div class='ticker-item' id='" + d.disclosure_id + "' target='_blank'>"
          var content = "<span class='state'>[" + state(d, lang) + "]</span>" + logo + title + badge + "</div>"
          itemHTML += "<div class='boxer'>" + content + "</div>";
        }
      }
      layoutHTML += itemHTML + "</div></div></div></div>";
      cn.innerHTML = layoutHTML;

      var header = __element__('xt-head');
      header && header.addEventListener('click', function() { window.open("https://xangle.io", "_blank") });

      for (var i = 0; i < disclosures.length; i++) {
        var d = disclosures[i];
        var args = {url: d.xangle_url, did: d.disclosure_id, dsp: _config.display};
        var item = document.getElementById(d.disclosure_id);
        if (!item) continue;

        item.addEventListener('click', openDisclosure(args));
        if (d.publish_status == 'scheduled') {
          var runner = runSchedule(item, interval(d.publish_timestamp_utc));
          item.setAttribute('runner', runner);
        }
      }
      __apply__();
    }

    function __initialize__(args) {
      if (UNSUPPORTED_BROWSER) {
        return _handleError('hide', 'unsupported browser!!!');
      }
      if (!_container) {
        _error = 'not found [id=xi-ticker] target';
        return console.error(_error);
      }

      var width = window.getComputedStyle(_container.parentElement, null).getPropertyValue("width");
      if (width) MAX_WIDTH = parseInt(width);

      _container.classList.remove('no-message');
      _container.innerText = '';

      restoreDefault();
      _applyConfig(args || (args = {}));

      !MOBILE_DEVICE && setTimeout(function() { playAnimation('resume') }, 4000);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    // public methods
    return {
      applyConfig: function(args) {
        if (_error || !args) return;
        _applyConfig(args);
      },
      requestDisclosures: function(args, callback) {
        if (!args.hasOwnProperty('url')) return false;
        __request__(args.url, function(data) {
          if (!data) {
            console.error('no disclosures');
            return false;
          }
          typeof callback == 'function' && callback(data);
          return true;
        })
      }
    };
  }
  _h.XangleTicker = XTR;
  _h._XT_ = function r(f) { /in/.test(document.readyState) ? setTimeout(function() { return r(f) }, 10) : f() };

})(window);
