# README #

### CDN
  * <script src='https://s3.ap-northeast-2.amazonaws.com/service.xangle.io/xi-ticker.min.js?xv=1'></script>  
  * <link rel="stylesheet" href="https://s3.ap-northeast-2.amazonaws.com/service.xangle.io/xi-ticker.min.css">

### HTML
  * <div id="xi-ticker"></div>

### Script 
  * _XT_(function() {new window.XangleTicker(...config)})

### Methods
  * initialize(object)
    * intitialize ticker and apply default config
  * applyConfig(object)
    * apply config that is changed from default

### Config options 
  * language (string) : language to display, 'en', 'ko' (default 'en')  
  * tickerWidth (number:px) : element width of ticker to display (default parent element's width)
  * limit (number) : the number of disclosures to display, 1 ~ 50 (default 15)
  * newTagDuration (number) : duration for the new badge, 1 ~ 3 (default 1)
  * disclosureDuration (number) : duration for disclosure, 7 ~ 30 (default 7)
  * scrollSpeed (string) : scrolling speed level, [fast:1 ~ slow:10] (default 4)
  * tickerStyle (object) : style to apply to the 'xi-ticker' element, ex. {marginBottom: '12px'}
  * projectIds (string|array) : project Ids provided by xangle
  * projectSymbols (string|array) : project symbols, string is used to load a specific project.

### Description  
  * 예약 공시의 경우 개별 프로젝트 화면에서는 표시하지 않음
  * 조회 공시나 정정공시의 원본 공시는 표시하지 않음
    
### TBD      
  * window resize
  * appropriated speed (continer width / total ticker width)
