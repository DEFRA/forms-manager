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

Please install [Node.js](http://nodejs.org/) `>= v18` and [npm](https://nodejs.org/) `>= v9`. You will find it
easier to use the Node Version Manager [nvm](https://github.com/creationix/nvm)

To use the correct version of Node.js for this application, via nvm:

```bash
cd forms-manager
nvm use
```

## Local development

### Setup

1. Install application dependencies:

```bash
npm ci
```

2. Install Docker

3. Install Localstack: https://docs.localstack.cloud/getting-started/installation/

4. Install awslocal: https://github.com/localstack/awscli-local

5. Create a new S3 bucket using localstack with the awslocal wrapper:

```bash
localstack start
awslocal s3api create-bucket --bucket form-definition-storage
```

5. Add your bucket name into your .env file:

```text
FORM_DEF_BUCKET_NAME=form-definition-storage
S3_ENDPOINT=http://localhost:4566
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy
```

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

| Endpoint                       | Description  |
| :----------------------------- | :----------- |
| `GET: /health`                 | Health       |
| `GET: /v1/entities`            | Entities     |
| `GET: /v1/entities/<entityId>` | Entity by ID |

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
