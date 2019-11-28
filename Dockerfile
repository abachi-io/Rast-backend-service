FROM mhart/alpine-node:8

RUN apk add --no-cache --virtual .build-deps \
        git \
        bash \
        curl \
        python \
        make \
        g++

RUN mkdir -p /ledgerium/rast

ADD . /ledgerium/rast

WORKDIR /ledgerium/rast

RUN npm install

ENTRYPOINT ["tail", "-f", "/dev/null"]
