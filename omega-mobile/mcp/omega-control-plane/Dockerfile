FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    OMEGA_AUTH_MODE=jwt \
    OMEGA_OAUTH_SCOPES=omega.mcp
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund
COPY src ./src
RUN chown -R node:node /app
USER node
EXPOSE 8080
CMD ["node", "src/http-server.mjs"]
