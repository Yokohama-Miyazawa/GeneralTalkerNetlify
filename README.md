# GeneralTalkerNetlify

~~[GeneralTalker API](https://rapidapi.com/ja/morikatroninc-morikatroninc-default/api/generaltalker/details)および~~[A3RT Talk API](https://a3rt.recruit.co.jp/product/talkAPI/)を[Netlify Functions](https://functions.netlify.com/)で使うためのプログラム

<span style="color: red;">**注意**</span>  
GeneralTalker API は公開終了になりました。  
参考: https://tech.morikatron.ai/entry/2021/06/07/190000

## 機能

雑談 API(~~GeneralTalker API~~ / A3RT Talk API)を用いて、ユーザの書き込みに対し返事をする。  
パブリックチャンネルではメンション、ダイレクトメッセージでは全ての書き込みに反応する。

## 導入方法

**注意**  
この導入方法は 2022 年 11 月時点でのものです。  
使っているツールの仕様変更などによりそのままでは導入できなくなる可能性があります。  
導入方法の変化などに気づいた方は、Pull Request や Issues などで教えてくださると助かります。

### Slack Bot 用の App を作る

https://api.slack.com/apps にアクセス。  
Create App > From scratch を選択。  
App 名(これが Slack Bot の名前になる)を入力し、Slack の workspace を選択。

### Slack Bot の Signing Secret と OAuth Token を取得する

#### Signing Secret の取得

Slack Bot の管理画面で、Settings > Basic Information を選択。  
App Credential までスクロールし、Signing Secret の Show をクリック。表示された文字列をコピーして保管しておく。

#### OAuth Token の取得

Slack Bot の管理画面で、Features > OAuth & Permissions > Scopes > Bot Token Scopes を選択。**User Token Scopes ではない**ので注意。  
以下の scope を追加する。これは Slack Bot ができることの権限に関するもの。  
ここではダイレクトメッセージとパブリックチャンネルでのみ Bot が使えるように設定している。  
プライベートチャンネルでも使えるようにしたい場合は調べること。

- channels:history パブリックチャンネルの履歴を読む
- chat:write パブリックチャンネルに書き込む
- im:history ダイレクトメッセージの履歴を読む
- im:write ダイレクトメッセージに書き込む

OAuth Tokens for Your Workspace > Install to Workspace をクリック。  
Bot の権限を確認し、「許可する」をクリック。  
Bot User OAuth Token が表示されるので、Copy をクリックしてコピーし、保管しておく。

Signing Secret と OAuth Token は外に漏らさないこと。

### 雑談 API の API キーを取得する

下記の a, b どちらかの手順を踏んで、雑談 API の API キーを取得する。  
Signing Secret と OAuth Token と同様に、API キーも外に漏らさないこと。

#### a. ~~GeneralTalker API の API キーを取得する~~(公開終了になりました)

[Rapid API の GeneralTalker のページ](https://rapidapi.com/morikatroninc-morikatroninc-default/api/generaltalker/pricing) にアクセス。  
Basic プランを選択し、Subscribe をクリック。  
[Endpoints](https://rapidapi.com/morikatroninc-morikatroninc-default/api/generaltalker) に移動。  
画面中央より、 Header Parameters > X-RapidAPI-Key にある文字列をコピーして保管する。

#### b. A3RT Talk API の API キーを取得する

[A3RT Talk API のページ](https://a3rt.recruit.co.jp/product/talkAPI/)にアクセス。  
画面下部の API KEY 発行 をクリック。  
利用規約とプライバシーポリシーに同意して、メールアドレスを送信。  
指定された手順に従い、API キーを取得する。

### Netlify でサイトを立ち上げる

このリポジトリをフォークする。  
https://www.netlify.com/ にアクセスし、GitHub アカウントでログイン。  
Sites > Add new site > Import an existing project を選択。  
Connect to Git provider > GitHub を選択し、先ほどフォークしたリポジトリを選択。  
(リポジトリが表示されない場合は、Configure the Netlify app on GitHub をクリックして Netlify と GitHub の間の設定を行う)  
Basic build settings > Publish directory に指定されているディレクトリを`api/`に書き換える。  
Deploy site をクリック。

### Netlify の環境変数を設定する

Netlify の管理画面で、Site settings > Build & deploy > Environment > Edit variables を選択。  
以下の環境変数を設定する。  
| Key | Value |
| ---- | ---- |
| SLACK_SIGNING_SECRET | Slack Bot の Signing Secret |
| SLACK_BOT_TOKEN | Slack Bot の OAuth Token |
| CHAT_MODE | `a3rt` (A3RT を使う場合) / `generaltalker` (GeneralTalker を使う場合) |
| GENERALTALKER_API_KEY | GeneralTalker API の API キー (`CHAT_MODE=generaltalker`のとき) |
| A3RT_TALK_API_KEY | A3RT Talk API の API キー (`CHAT_MODE=a3rt`のとき) |
| MY_SLACK_BOT_NAME | Slack Bot の名前 |

環境変数を設定し終えたら、Save をクリック。  
そのままだと設定が反映されないことがあるようなので、サイトをデプロイしなおす。  
Deploys > Trigger deploy > Clear cache and deploy site を選択。

### Slack Bot と Netlify を繋ぐ

Slack Bot の設定画面にて、Features > Event Subscriptions を選択。  
Enable Events の右にあるスイッチを On にする。  
Request URL に、 `Netlifyで立ち上げたサイトのURL/.netlify/functions/slack_bot` を入力。  
例えばサイトの URL が `https://whereis-caspiansea-b2cp2p.netlify.app` なら、  
全体の URL は`https://whereis-caspiansea-b2cp2p.netlify.app/.netlify/functions/slack_bot` となる。

URL を入力すると、Slack Bot 側で Netlify にアクセスできるかチェックが行われる。  
チェックに成功すると Verified と表示される。Verified とならない場合は、入力した URL やこれまでの設定に誤りがないか確認する。

Subscribe to bot events にて、以下の bot event を追加する。どのようなイベントが起きた際に Netlify へリクエストが飛ぶかを設定している。

- message.channels チャンネルに書き込みがあった
- message.im ダイレクトメッセージがあった

画面右下の Save Changes をクリックし、変更を保存する。

### Slack Bot と会話する

Slack のワークスペースを開き、追加したいパブリックチャンネルに Bot を追加する。  
パブリックチャンネルでは、Bot にメンションすると反応する。  
Bot の書き込みにスレッドで書き込むことでも Bot は反応する。  
ダイレクトメッセージでは全ての書き込みに反応する。  
プログラムの仕様上、時々ユーザの書き込みに Bot が反応しないことがある。その際はもう一度書き込んでやること。

### Slack Bot とのダイレクトメッセージ設定

Slack Bot へのダイレクトメッセージがオフになっていることがある。  
この場合、Bot の設定画面( https.slack.com/apps より自分の Bot を選択)で、  
App Home > Show Tabs > Messages Tab > Allow users to send Slash commands and messages from the messages tab にチェックを入れる。  
Slack を再起動もしくはハードリフレッシュ(Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows/Linux))する。

### 参考 URL

- https://tech.morikatron.ai/entry/2021/06/07/190000
- https://www.facebook.com/groups/1074631476341698/posts/1235470693591108
