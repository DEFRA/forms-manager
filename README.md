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
- [Integration testing](#integration-testing)
  - [Local development with the integration test environment](#local-development-with-the-integration-test-environment)
  - [Running Postman tests locally](#running-postman-tests-locally)
  - [Adding new API tests](#adding-new-api-tests)

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

## Integration testing

### Local development with the integration test environment

If you want to run the API with the integration test environment (which includes mock OIDC and test MongoDB):

1. Set up the integration test environment:

```bash
npm run test:integration:setup    # Start OIDC mock server and MongoDB
npm run test:integration:start    # Start the API service
npm run test:integration:wait     # Wait for the app to be ready
```

2. The API will be available at http://localhost:3001

3. When finished, clean up the environment:

```bash
npm run test:integration:stop
```

### Running Postman tests locally

To run the integration tests manually in Postman:

1. Set up the integration test environment as described above
2. Import the test collection and environment into Postman:

- Collection: `test/integration/postman/forms-manager-ci-mock.postman_collection.json`
- Environment: `test/integration/postman/forms-manager-ci-mock.postman_environment.json`

3. Ensure the environment variable `root` is set to `http://localhost:3001`
4. Run the collection or individual requests through the Postman GUI
5. Clean up the environment when done with `npm run test:integration:stop`

### Adding new API tests

To extend the integration test suite with new test cases:

1. **Open the collection in Postman**:

- Import the collection if you haven't already: `test/integration/postman/forms-manager-ci-mock.postman_collection.json`
- Import the environment: `test/integration/postman/forms-manager-ci-mock.postman_environment.json`

2. **Create a new request**:

- Right-click on the appropriate folder in the collection and select "Add Request"
- Name it clearly, describing what it tests (e.g., "Create Form - Valid Input")
- Set the HTTP method (GET, POST, PUT, etc.) and URL using environment variables: `{{root}}/forms`

3. **Configure authentication**:

- In the Authorization tab, select "Bearer Token"
- Use `{{accessToken}}` as the token value (the collection's pre-request scripts will handle token acquisition)

4. **Add request body or parameters** if needed:

- For POST/PUT requests, add your JSON body in the Body tab
- Use the "raw" format and select JSON

5. **Add pre-request scripts** if required:

- Use the Pre-request Script tab for setup logic
- Create test data or variables needed for this specific test

6. **Add test assertions**:

- In the Tests tab, write assertions to verify the response
- Example:

  ```javascript
  pm.test('Status code is 200', function () {
    pm.response.to.have.status(200)
  })

  pm.test('Response has expected data', function () {
    const responseData = pm.response.json()
    pm.expect(responseData).to.have.property('id')
    pm.expect(responseData.name).to.eql('Expected Name')
  })
  ```

7. **Test locally**:

- Start the integration environment with `npm run test:integration:setup && npm run test:integration:start && npm run test:integration:wait`
- Run your new request and verify it passes
- Make adjustments as needed

8. **Export and commit**:

- Export the updated collection: File → Export → Collection
- Save it to `test/integration/postman/forms-manager-ci-mock.postman_collection.json`, overwriting the existing file
- Commit the updated collection file to the repository

9. **Update documentation** if needed:

If you're adding endpoints for new features, update the API endpoints section in this README

The CI pipeline will automatically run your new test along with the existing ones on PRs and merges to main.

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
