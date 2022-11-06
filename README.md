# GeneralTalkerNetlify  
[GeneralTalker](https://rapidapi.com/ja/morikatroninc-morikatroninc-default/api/generaltalker/details)を[Netlify Functions](https://functions.netlify.com/)で使うためのプログラム  

## 機能
GeneraTalker APIを使って、ユーザの書き込みに対し返事をする。  
パブリックチャンネルではメンション、ダイレクトメッセージでは全ての書き込みに反応する。  

## 導入方法
**注意**  
この導入方法は2022年11月時点でのものです。  
使っているツールの仕様変更などによりそのままでは導入できなくなる可能性があります。  
導入方法の変化などに気づいた方は、Pull RequestやIssuesなどで教えてくださると助かります。  

### Slack Bot用のAppを作る
https://api.slack.com/apps にアクセス。  
Create App > From scratch を選択。  
App名を入力し、Slackのworkspaceを選択。  

### Slack BotのSigning SecretとOAuth Tokenを取得する
#### Signing Secretの取得
Slack Botの管理画面で、Settings > Basic Information を選択。  
App Credential までスクロールし、Signing Secret の Show をクリック。表示された文字列をコピーして保管しておく。

#### OAuth Tokenの取得
Slack Botの管理画面で、Features > OAuth & Permissions > Scopes > Bot Token Scopes を選択。**User Token Scopes ではない**ので注意。  
以下のscopeを追加する。これはSlack Botができることの権限に関するもの。  
ここではダイレクトメッセージとパブリックチャンネルでのみBotが使えるように設定している。  
プライベートチャンネルでも使えるようにしたい場合は調べること。  
- channels:history パブリックチャンネルの履歴を読む
- chat:write パブリックチャンネルに書き込む
- im:history ダイレクトメッセージの履歴を読む
- im:write ダイレクトメッセージに書き込む

OAuth Tokens for Your Workspace > Install to Workspace をクリック。  
Botの権限を確認し、「許可する」をクリック。  
Bot User OAuth Token が表示されるので、Copyをクリックしてコピーし、保管しておく。  

Signing SecretとOAuth Tokenは外に漏らさないこと。  

### GeneralTalker APIのAPIキーを取得する
[Rapid APIのGeneralTalkerのページ](https://rapidapi.com/morikatroninc-morikatroninc-default/api/generaltalker/pricing) にアクセス。  
Basic プランを選択し、Subscribeをクリック。  
[Endpoints](https://rapidapi.com/morikatroninc-morikatroninc-default/api/generaltalker) に移動。  
画面中央より、 Header Parameters > X-RapidAPI-Key にある文字列をコピーして保管する。  

Signing SecretとOAuth Tokenと同様に、APIキーも外に漏らさないこと。  

### Netlifyでサイトを立ち上げる
このリポジトリをフォークする。  
https://www.netlify.com/ にアクセスし、GitHubアカウントでログイン。  
Sites > Add new site > Import an existing project を選択。  
Connect to Git provider > GitHub を選択し、先ほどフォークしたリポジトリを選択。  
(リポジトリが表示されない場合は、Configure the Netlify app on GitHubをクリックしてNetlifyとGitHubの間の設定を行う)  
Basic build settings > Publish directory に指定されているディレクトリを`api/`に書き換える。  
Deploy siteをクリック。  

### Netlifyの環境変数を設定する
Netlifyの管理画面で、Site settings > Build & deploy > Environment > Edit variables を選択。  
以下の環境変数を設定する。  
| Key | Value |
| ---- | ---- |
| SLACK_SIGNING_SECRET | Slack BotのSigning Secret |
| SLACK_BOT_TOKEN | Slack BotのOAuth Token |
| GENERALTALKER_API_KEY | GeneralTalker APIのAPIキー |
| MY_SLACK_BOT_NAME | Slack Botの名前 |

環境変数を設定し終えたら、Saveをクリック。  
そのままだと設定が反映されないことがあるようなので、サイトをデプロイしなおす。  
Deploys > Trigger deploy > Clear cache and deploy site を選択。  

### Slack BotとNetlifyを繋ぐ
Slack Botの設定画面にて、Features > Event Subscriptions を選択。  
Enable Eventsの右にあるスイッチをOnにする。  
Request URLに、 `Netlifyで立ち上げたサイトのURL/.netlify/functions/slack_bot` を入力。  
例えばサイトのURLが `https://whereis-caspiansea-b2cp2p.netlify.app` なら、  
全体のURLは`https://whereis-caspiansea-b2cp2p.netlify.app/.netlify/functions/slack_bot` となる。  

URLを入力すると、Slack Bot側でNetlifyにアクセスできるかチェックが行われる。  
チェックに成功すると Verified と表示される。Verifiedとならない場合は、入力したURLやこれまでの設定に誤りがないか確認する。  

Subscribe to bot events にて、以下のbot eventを追加する。どのようなイベントが起きた際にNetlifyへリクエストが飛ぶかを設定している。  
- message.channels チャンネルに書き込みがあった
- message.im ダイレクトメッセージがあった

画面右下の Save Changes をクリックし、変更を保存する。  

### Slack Botと会話する
Slackのワークスペースを開き、追加したいパブリックチャンネルにBotを追加する。  
パブリックチャンネルでは、Botにメンションすると反応する。  
Botの書き込みにスレッドで書き込むことでもBotは反応する。  
ダイレクトメッセージでは全ての書き込みに反応する。  
プログラムの仕様上、時々ユーザの書き込みにBotが反応しないことがある。その際はもう一度書き込んでやること。

### Slack Botとのダイレクトメッセージ設定
Slack Botへのダイレクトメッセージがオフになっていることがある。  
この場合、Botの設定画面( https.slack.com/apps より自分のBotを選択)で、  
App Home > Show Tabs > Messages Tab > Allow users to send Slash commands and messages from the messages tab にチェックを入れる。  
Slackを再起動もしくはハードリフレッシュ(Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows/Linux))する。  

### 参考URL
- https://tech.morikatron.ai/entry/2021/06/07/190000
- https://www.facebook.com/groups/1074631476341698/posts/1235470693591108
