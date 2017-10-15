## Procyon
this is network utilities tools for network infrastractur enginner

Procyon achieve below

- ping to host append vlan,multi ip address
- traceroute to host
- get logs collectively

## confirmed platform
Mac
Windows 7

## install
execute install.ps1

### precondition
- network connectibity to internet
- be careful virtualbox version if you have already installed the virtualbox
- be careful vagrant version if you have already installed the vagrant
- required 2GB storage (box iamge less than 1GB and Procyon less than 1GB)
- virtualbox require 2 vCPU & 1024MB Memory
- 無線LAN環境では動作しないっぽいです(たぶんmacvlanが悪い)

### Procyon Compornent

Procyon
> Electron
> node.js
> vue.js
> element-ui

rancheros
> lightweight docker os for virtualbox

mongoDB
> save ping log
> 


### 注意
端末のvboxnet0が書き換わります。
端末のipセグメントを2つ管理用で消費します。
200.200.x.x/16を管理用で使っているので、試験に使えません
VirtualBoxのアップリンク帯域は100MBです。