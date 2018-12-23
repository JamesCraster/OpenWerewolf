#!/bin/bash
# Copyright 2017-2018 James V. Craster
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.



# Build script, call with option -d before each commit
# Options:
# -b builds for release
# -d generates documentation


while [ "$1" != "" ]; do
  case $1 in 
    -r) 
      
      #make sure to delete any existing release folder first!

      #compile typescript, sass and jsx
      tsc
      sass Client/main.scss Client/main.css
      babel --presets react Client/src  --out-dir Client
      
      #create release folder
      mkdir release
      mkdir release/Client
      mkdir release/Games
      mkdir release/Games/Classic
      mkdir release/Games/OneDay

      #copy over all necessary files
      cp app.js release
      cp LICENSE release
      cp README.md release
      cp package-lock.json release
      cp package.json release
      cp -r node_modules release
      cp -r views release
      cp -r Core release
      cp openwerewolf.json release
      
      #minify css on clientside
      #cleancss -o release/Client/main.css Client/main.css
      cp Client/*.mp3 release/Client
      cp Client/main.css release/Client/main.css
      cp Client/components.js release/Client/components.js
      cp Client/icon.png release/Client/icon.png
      cp Client/simplebar.min.js release/Client/simplebar.min.js
      cp Client/client.js release/Client/client.js
      cp Client/simplebar.min.css release/Client/simplebar.min.css
      cp -r Client/assets release/Client/assets
      cp Client/mercutio_basic.ttf release/Client/mercutio_basic.ttf
      cp Client/pixi.min.js release/Client/pixi.min.js
      cp Client/webfontloader.js release/Client/webfontloader.js
      cp Client/pixicanvas.js release/Client/pixicanvas.js

      cp Games/OneDay/oneDay.js release/Games/OneDay
      cp Games/OneDay/LICENSE release/Games/OneDay
      cp Games/Classic/Classic.js release/Games/Classic
      cp Games/Classic/LICENSE release/Games/Classic
      cp -r semantic release/semantic

      cd release
      npm remove bcrypt
      cd ..
      zip -r release.zip release
      scp -r release.zip james@159.65.165.72:/home/james/app
      ssh james@159.65.165.72
      
      ;;

    -d)

      #generate documentation
      typedoc --out docs --mode 'file' --excludeExternals --externalPattern "**/node_modules/**" --ignoreCompilerErrors ../OpenWerewolf/Core --target es6 --theme default --readme none

      #add .nojekyll to docs folder so that github pages accepts urls with underscores
      touch docs/.nojekyll

      ;;
    
    *)
      
      ;;
	
  esac
  shift
done
