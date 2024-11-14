# forms-manager

Core delivery platform Node.js Backend Template.

- [Requirements](#requirements)
  - [Node.js](#nodejs)
- [Local development](#local-development)
  - [Setup](#setup)
  - [Development](#development)
  - [Production](#production)
  - [Npm scripts](#npm-scripts)
- [API endpoints](#api-endpoints)
- [Calling API endpoints](#calling-api-endpoints)
  - [Postman](#postman)
- [Docker](#docker)
  - [Development Image](#development-image)
  - [Production Image](#production-image)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Requirements

### Node.js

Please install the Node.js version in [.nvmrc](.nvmrc) using [Node Version Manager `nvm`](https://github.com/creationix/nvm) via:

```bash
cd forms-manager
nvm use
```

## Local development

### Setup

1. Install Docker

2. Bring up runtime dependencies

```bash
docker compose up
```

3. Create a `.env` file with the following mandatory environment variables populated at root level:

```text
MONGO_URI=""
MONGO_DATABASE=""
OIDC_JWKS_URI=""
OIDC_VERIFY_AUD=""
OIDC_VERIFY_ISS=""
ROLE_EDITOR_GROUP_ID=""
HTTP_PROXY=
HTTPS_PROXY=
NO_PROXY=
```

For proxy options, see https://www.npmjs.com/package/proxy-from-env which is used by https://github.com/TooTallNate/proxy-agents/tree/main/packages/proxy-agent. It's currently supports Hapi Wreck only, e.g. in the JWKS lookup.

### Development

To run the application in `development` mode run:

```bash
npm run dev
```

### Production

To mimic the application running in `production` mode locally run:

```bash
npm start
```

### Npm scripts

All available Npm scripts can be seen in [package.json](./package.json)
To view them in your command line run:

```bash
npm run
```

## API endpoints

| Endpoint                       | Description       |
| :----------------------------- | :---------------- |
| `GET: /health`                 | Health            |
| `GET: /v1/entities`            | Entities          |
| `GET: /v1/entities/<entityId>` | Entity by ID      |
| `PATCH: /forms/<id>`           | Update Form by ID |

## Calling API endpoints

### Postman

A [Postman](https://www.postman.com/) collection and environment are available for making calls to the Teams and
Repositories API. Simply import the collection and environment into Postman.

- [CDP Node Backend Template Postman Collection](postman/forms-manager.postman_collection.json)
- [CDP Node Backend Template Postman Environment](postman/forms-manager.postman_environment.json)

## Docker

### Development image

Build:

```bash
docker build --target development --no-cache --tag forms-manager:development .
```

Run:

```bash
docker run -e GITHUB_API_TOKEN -p 3008:3008 forms-manager:development
```

### Production image

Build:

```bash
docker build --no-cache --tag forms-manager .
```

Run:

```bash
docker run -e GITHUB_API_TOKEN -p 3001:3001 forms-manager
```

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
