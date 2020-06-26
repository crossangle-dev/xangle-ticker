# README #


### DESCRIPTION  
  * Xangle Ticker is a 3rd party JavaScript library that enables connection to Xangle Disclosures in the form of an easily configurable Ticker.
    
### PRODUCITON
   * npm run build
   * dist/ticker.min.css, dist/ticker.min.js

### CONFIGURATION
   * language (string) : Language display settings for the ticker, 'en', 'ko', 'jp', 'cn', 'ru' (default 'en')
   * limit (number) : Max number of announcements available for display on the ticker, 5 ~ 25 (default 15)
   * newTagDuration (number) : Settings for the “New” tag duration on disclosure titles within the ticker. The start time for the elapsed time settings is based on the disclosure publish time., 1 ~ 3 (default 1)
   * disclosureDuration (number) : Settings for display duration of disclosures shown within the ticker, 7 ~ 30 (default 7)
   * scrollSpeed (string) : Settings for ticker scroll speed.Higher values increase scroll speed, [slow:1 ~ fast:10] (default 5)
   * projectSymbols (string|array) : Use project symbols to control which projects are shown in the ticker. 
Enter project symbols in an array to specify what projects are displayed. A single project view is when only one project symbol is specified. ※ Scheduled disclosures are only available in the single project view.
   * darkMode (boolean) : ‘True’ value enables dark mode. (default false)
   * hideLogo (boolean) : ‘True’ value enables to hide logo. (default false)
   * hideEdge (boolean) : ‘True’ value enables to hide edge. (default false)
   * apiUrl (string) : API URL set up is required when using custom configuration. (default null)

### DEMO
  * test.html
