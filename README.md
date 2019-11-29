# Rast

Rast is a hosted Ledgerium node that lets users to run applications without setting up their own node. We provide access to a selection of JSON-RPC API, with the addition of custom methods to make development easier via HTTPS and Websockets endpoints.


### Setting up
## .env

`touch .env`

```
  SERVER_PORT=2906
  MONGO_HOST=127.0.0.1
  MONGO_DB=userManagement
  BCRYPT_SALT_ROUNDS=14
  JWT_SECRET={?Fd]o#G&Wcqa)An<C@dlJT}&LG1VX
  WEBSITE_NAME=Rast
  WEBSITE_DOMAIN=https://toorak.ledgerium.io/rast
  SMTP_HOST=
  SMTP_PORT=
  SMTP_USER=
  SMTP_PASSWORD=
  WEB3_HTTP=http://toorak01.ledgerium.io:8545
  WEB3_WS=http://toorak01.ledgerium.io:9000
```
