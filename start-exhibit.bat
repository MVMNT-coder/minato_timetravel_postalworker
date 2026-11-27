@echo off
rem ============================================================
rem  時空郵便局：展示用の起動ファイル（Windows・2画面）
rem  メイン画面に体験、左のサブ画面に配達レポートを開きます。
rem  2つのウィンドウは同じChrome（同じプロフィール）で開くこと。
rem  プロフィールを分けると、カードが左へ飛ぶ演出とレポートが同期しません。
rem
rem  事前の準備：
rem   1. Windowsの「設定」→「ディスプレイ」で「表示画面を拡張する」を選ぶ
rem   2. 並び順は実際の配置どおり、サブを左に置く
rem   3. 下の SUB_X を、サブ画面の左端の位置にする（サブが左で1920x1080なら -1920）
rem ============================================================
setlocal
set "URL=https://mvmnt-coder.github.io/minato_timetravel_postalworker/index.html"
set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
set "SUB_X=-1920"

rem サブ画面（左）：配達レポート
start "" "%CHROME%" --new-window --window-position=%SUB_X%,0 --window-size=1920,1080 --start-fullscreen "%URL%?view=archive"
timeout /t 3 /nobreak >nul

rem メイン画面：体験（展示モード）
start "" "%CHROME%" --new-window --window-position=0,0 --window-size=1920,1080 --start-fullscreen --autoplay-policy=no-user-gesture-required "%URL%?exhibit=1"

rem ウィンドウが思った画面に出ないとき：
rem   そのウィンドウを選んで Windows + Shift + ← または → で画面を移し、F11 で全画面にする
endlocal
