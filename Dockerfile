ARG PARENT_VERSION=latest-22
ARG PORT=3000
ARG PORT_DEBUG=9229

FROM defradigital/node-development:${PARENT_VERSION} AS development
ARG PARENT_VERSION
LABEL uk.gov.defra.ffc.parent-image=defradigital/node-development:${PARENT_VERSION}

ARG PORT
ARG PORT_DEBUG
ENV PORT ${PORT}
EXPOSE ${PORT} ${PORT_DEBUG}

COPY --chown=node:node packag*.json ./

RUN npm ci

COPY --chown=node:node . .
RUN npm run build

CMD [ "npm", "run", "dev" ]

FROM defradigital/node:${PARENT_VERSION} AS production
ARG PARENT_VERSION
LABEL uk.gov.defra.ffc.parent-image=defradigital/node:${PARENT_VERSION}

# Add curl to template.
# CDP PLATFORM HEALTHCHECK REQUIREMENT
USER root
RUN apk update && \
    apk add curl
USER node

COPY --from=development /home/node/package*.json ./
COPY --from=development /home/node/.server ./.server/
COPY --from=development /home/node/migrate-mongo-config.js ./
# secure-context.js is a dependency for for migrate-mongo-config.js
COPY --from=development /home/node/src/secure-context.js ./src/secure-context.js
COPY --from=development /home/node/migrations ./migrations/
COPY --from=development /home/node/scripts ./scripts/

RUN npm ci --omit=dev && \
    chmod +x scripts/run-migrations-and-start.sh

# temporary location for forms
# TODO remove after MongoDB implementation
RUN mkdir /home/node/forms

ARG PORT
ENV PORT ${PORT}
EXPOSE ${PORT}

CMD [ "./scripts/run-migrations-and-start.sh" ]
