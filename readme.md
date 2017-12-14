
![Procyon logo](https://github.com/Wallet0013/Procyon/blob/master/logo.png?raw=true)


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
Procyon overwite [vboxnet0]
Procyon is use two ipaddr
use 200.200.x.x/16 for management. So this segment isn't use a test.


