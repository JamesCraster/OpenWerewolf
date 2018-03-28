# OpenWerewolf

> A fully-featured, online multiplayer mafia game for 3-5 players.

**Play now at http://openwerewolf.us-west-2.elasticbeanstalk.com/**

## Features:
* You can run multiple games at once using the lobby system
* The core is general. Use it to create and host whatever games you want
* Code is free/open source under the AGPL-3.0
* Profanity filter (can be removed if you want)
* Documentation has begun


## The Games:
* One night: During the night, your cards are stolen, swapped, carefully inspected and drunkenly taken by accident.
It's up to you to piece together the truth (if you're a townie) or bluff your way to victory (if you're an evil, evil werewolf),
in the Trial, where you'll be voting to kill the werewolf among you.

* Traditional Mafia, Mafia execution, Mission games haven't been built yet: maybe you could help write them?
## Contribute:
All contributors are welcome. OpenWerewolf is written almost entirely in Typescript and uses nodejs/express/socket.io.

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
