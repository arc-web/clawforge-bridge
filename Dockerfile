FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY dist/ ./dist/
ENV PORT=3200
EXPOSE 3200
CMD ["node", "dist/index.js"]
