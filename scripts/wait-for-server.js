#!/usr/bin/env node

const http = require("http");

const maxRetries = 30; // 30 seconds timeout
const retryDelay = 1000; // 1 second between retries
const url = "http://localhost:8080";

function checkServer(attempt = 1) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      if (res.statusCode === 200) {
        console.log(`Server is ready at ${url}`);
        resolve(true);
      } else {
        console.log(`Server responded with ${res.statusCode}, retrying...`);
        if (attempt >= maxRetries) {
          reject(new Error(`Server not ready after ${maxRetries} attempts`));
        } else {
          setTimeout(
            () => checkServer(attempt + 1).then(resolve, reject),
            retryDelay
          );
        }
      }
      req.destroy();
    });

    req.on("error", () => {
      console.log(
        `Attempt ${attempt}/${maxRetries}: Server not ready, retrying in ${retryDelay}ms...`
      );
      if (attempt >= maxRetries) {
        reject(new Error(`Server not ready after ${maxRetries} attempts`));
      } else {
        setTimeout(
          () => checkServer(attempt + 1).then(resolve, reject),
          retryDelay
        );
      }
    });

    req.setTimeout(5000, () => {
      req.destroy();
      console.log(
        `Attempt ${attempt}/${maxRetries}: Request timeout, retrying...`
      );
      if (attempt >= maxRetries) {
        reject(new Error(`Server not ready after ${maxRetries} attempts`));
      } else {
        setTimeout(
          () => checkServer(attempt + 1).then(resolve, reject),
          retryDelay
        );
      }
    });
  });
}

checkServer()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
