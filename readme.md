## Procyon
Procyon is network utilities tools for network infrastracture enginner

Procyon achieve below things
- ping to host append vlan,multi ip address
- traceroute to host
- get logs collectively

## confirmed platform
Mac OS
Windows 7

## Install
> I apologise for work on windows only.
> Procyon need network connectibity at first install.

run procyon_install.ps1

this script excute these things
- install chocolatey. choco is packegemanage like homebrew for windows
- install virtualbox using choco
- install vagrant using choco
- pull Procyon-Node box. this is like OVA



### Precondition
- network connectibity to internet
- be careful virtualbox version if you have already installed the virtualbox
- be careful vagrant version if you have already installed the vagrant
- required 2GB storage (box iamge less than 1GB and Procyon less than 1GB)
- virtualbox require 2 vCPU & 1024MB Memory
- didn't work on wireless LAN (I suspect due to macvlan)

### Procyon Compornent

Procyon
> Procyon use below compornent
> - Electron
> - node.js
> - vue.js
> - element-ui
> - ECahrt.js

Procyon-Node
> work docker on ubutnu OS using virtualbox.
> if you need login ubuntu, you use this usename/password [vagrant/vagrant]

Procyon-Node-App
> ping client on node.js

Procyon-Node-Syslog
> syslog server on node.js

Procyon-Node-Mongo
> This is mongoDB server.
> this have these rolement
> - management docker compornent data.
> - keep logs about ping,traceroute,syslog ...


### Caution
端末のvboxnet0が書き換わります。
this is use two ipaddr
use 200.200.x.x/16 for management. So this segment isn't use a test.


----

## 概要
ExPing越えくらいの気持ちでつくりました。
https://github.com/Wallet0013/Procyon

できること
- ping
- traceroute
- ログ収集
- ログの可視化/軽い分析
- playbook実行(ansible組み込んでるだけ)
- syslog server
- ntp server

※ 詳細は後述します

## 背景
黒田さん資料がほとんど語ってくれてるので転載
> 実装方針ちがいますが、想いがいっしょです。

[slide 1979]



## バグ
Github issueにあげてください。

## エンハンスリクエスト
こうしたい、こうして欲しい、UIが変えろ系はGithub issueにあげて、連絡ください。
焼肉おごってくれたら、実装します。

---
## インストール
powershellで良い感じに入るようにしてます。
何をしてるかはソースを読んでください :bomb:

最初にchocolateyをいれて、あとはcholoで良い感じに入ってきます。

- vagrant
- Electronは一括ダウンロード
- Docker のファイルを配布 (tar)


## 構成
![procyon-arhitecture](https://github.com/Wallet0013/Procyon/raw/master/procyon-architecture.png)


## 使い方
下記4つの画面で構成されています。
- Node
- App
- RealTime
- Analytics

それぞれがタブにわかれており、上部のナビゲーションバーから画面の遷移を行います。


### Node
最初にNodeを起動させる必要があります。
なかみはvirtualboxをvagrantでごしごしやってます。
使用してるboxはクラウドに上がってます。
バージョン管理されてるので、boxをアップデートすることでVMがアップデートされるようにもなっています。

Nodeはイミュータブル（不変）です。
操作の煩雑さを防ぐために「起動」「削除」しか存在しません。

外部のNTPを使用したい場合には、
起動後に、NTPを設定してあげてください。
後述するAppはこのNTPの値を参照します。

### App
試験用端末に相当します。VLANも振ることができます。
1Appは 1IPを持ちます。
裏でマネジメントのネットワークに接続されていて、
Appへの操作は、このネットワークを通じてRESTで動かしています。

現在対応（予定も含む）しているのは下記です
- App
 > Ping,tracerouteを打ってくれる 

- App multicast
> multicastに対応したApp

- Syslog App 
>  Sylog serverになってくれる UDP 514です。

- SNMP App (予定)
> SNMPのtrapを受信します

- Ansible App (予定)
> playbookをuploadすると自分のタイミングで実行してくれます。

### Realtime
試験実行中に常時閲覧するときの画面を想定しています。
取得期間中のlogがリアルタイムで更新されます。

画面イメージは下記


### Analytics
試験完了後のlogからの解析用に使用します。
DDで範囲を指定してもらって読み込むことで、可視化されます。



