## Motivation

* Just download one thing: This image; And run it with `docker`.
* Encapsulation, just like an OSX application.
* Out of the box, ready to use. Do not worry about _node js_ or _npm_ version.

## Requirements

* Docker `1.10+`. Haven't tried in an older version yet. Please report.

## Quick Start

* Set an alias for your command `truffle`.

```
alias truffle="docker run \
-ti \
--rm \
-e USER_ID=`id -u` \
-e GROUP_ID=`id -g` \
-p 8080:8080 \
-v $(pwd):/workspace \
consensysllc/truffle \
truffle"
```

* Run your command (ex: `init`)

```
truffle init
```
And that's all! Read below to learn more about this image.

## Usage

### Get the image

    docker pull consensysllc/truffle

Will get you the latest one. Now, for a specific version of truffle,
if available in docker hub, say `1.0.2`, do

    docker pull consensysllc/truffle:1.0.2

### Setting an alias

This is a dirty trick, so we can ignore the long and ugly one-liner needed

Step in the directory we are going to use to develop our contract, and execute

```
alias truffle="docker run \
-ti \
--rm \
-e USER_ID=`id -u` \
-e GROUP_ID=`id -g` \
-p 8080:8080 \
-v $(pwd):/workspace \
consensysllc/truffle \
truffle"
```

### Invoke truffle

Now we can invoke truffle, as we were using the real thing

    truffle init

Getting you the same results as having the program installed in your machine (and _node_, and _npm_, etc...)

### Explanation

* `docker run -ti --rm` will make an interactive (i.e. with console) container which will delete itself on exit.
* ``-e USER_ID=`id -u`` will set up as an env variable your user id. So we can `chown` the files on `truffle init`.
* ``-e GROUP_ID=`id -g``` same as above, but with group id.
* `-p 8080:8080` tells docker to listen and forward incoming requests to the port `8080` into the container.
* `-v $(pwd):/workspace` will mount your contract directory into the container. `/workspace` is the directory inside.

## I want to build my own truffle image

### From the current npm package

Sure. Just stand in this very directory and execute

    docker build -t <your-username>/truffle .

Where `<your-username>/truffle` is the name you are giving to your image.

### Known caveat

Tried to execute `npm install` in a Digital Ocean droplet of 512 MB RAM. Didn't work,
killing the process randomly. The solution was using a machine with 2048 MB RAM.
