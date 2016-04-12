FROM node:5.10.1-slim

MAINTAINER Herman Junge "herman.junge@consensys.net"

################################################################################
#
# So. This is what is going on:
#
# * We are using a slim version of the node.js docker image.
# * git is needed during the process of installing truffle.
# * After truffle is installed, we get rid of a number of directories.
# * And we remove git and the programs we installed as its dependencies.
# * The result? Just one moderate layer of files over node slim.
#
# * NOTE: Will install the _latest_ version of truffle. If you want to
#         install an earlier version just add @x.y.z (version numbers)
#         after truffle.
#
################################################################################

RUN apt-get update -y && apt-get install -y git \
    && npm install -g truffle \
    && rm -rf /tmp/* /root/.npm/* /var/lib/apt/lists/* \
    && apt-get purge -y --auto-remove git

################################################################################
#
# We need to setup the workspace: The idea is mounting your current
# directory here. Also, the entrypoint scripts will do all their magic
# over this directory, if needed.
#
################################################################################

WORKDIR "/workspace"

ADD entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
