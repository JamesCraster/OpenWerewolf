# OpenWerewolf

> An online multiplayer mafia game.

Currently in the earliest stage of development, but feel free to play around with it.

## [Documentation](https://jamescraster.github.io/OpenWerewolf/)

Files are listed to the right.

## Running on a GNU/Linux server

First clone or manually download OpenWerewolf:

```
$ git clone https://github.com/JamesCraster/OpenWerewolf
```

Install nodejs if you haven't already:

```
$ sudo apt-get install nodejs
```

Then run:

```
$ cd OpenWerewolf
$ tsc
$ node index.js
Port is:8080
```

Ensure port 8080 is open:

```
$ sudo ufw allow 8080/tcp
```

If playing on the same private network as all other players,
other players will connect by entering your ip address into their web browser, followed by :8080
(Eg 172.16.0.0:8080),

```
$ hostname -I
```

will give you the ip address that you need.

## Dependencies(already included in the OpenWerewolves repository):

All dependencies are open source.

On the server:
Required node modules are included in the node_modules folder.
They are Express and Socket.IO, and all of their dependencies.

On the clientside:
JQuery has been included in the jquery.js file in /Client.
